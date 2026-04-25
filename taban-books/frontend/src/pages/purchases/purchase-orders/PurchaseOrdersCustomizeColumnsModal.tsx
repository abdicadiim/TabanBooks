import React, { useEffect, useMemo, useState } from "react";
import { GripVertical, Lock, Search, SlidersHorizontal, X } from "lucide-react";

export type PurchaseOrderColumnOption = {
  key: string;
  label: string;
  locked?: boolean;
};

type Props = {
  open: boolean;
  columns: PurchaseOrderColumnOption[];
  value: string[];
  onClose: () => void;
  onSave: (nextVisibleColumns: string[]) => void;
};

const ensureLocked = (
  keys: string[],
  columns: PurchaseOrderColumnOption[]
) => {
  const lockedKeys = columns.filter((col) => col.locked).map((col) => col.key);
  const next = Array.from(new Set(keys));
  lockedKeys.forEach((key) => {
    if (!next.includes(key)) {
      next.push(key);
    }
  });
  return next;
};

export default function PurchaseOrdersCustomizeColumnsModal({
  open,
  columns,
  value,
  onClose,
  onSave,
}: Props) {
  const [search, setSearch] = useState("");
  const [tempVisible, setTempVisible] = useState<string[]>(() =>
    ensureLocked(value, columns)
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    setSearch("");
    setTempVisible(ensureLocked(value, columns));
  }, [open, value, columns]);

  const filteredColumns = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return columns;
    }

    return columns.filter((col) => col.label.toLowerCase().includes(query));
  }, [columns, search]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-3"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-gray-200 bg-gray-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <SlidersHorizontal size={18} className="text-slate-600" />
            <h3 className="text-[18px] font-semibold text-slate-900">
              Customize Columns
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-600">
              {tempVisible.length} of {columns.length} Selected
            </span>
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-[#1d5cff] transition-colors hover:bg-[#1d5cff]/10"
              onClick={onClose}
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="px-6 py-4">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search"
              className="h-11 w-full rounded-lg border border-gray-200 pl-10 pr-3 text-sm outline-none focus:border-[#1d5cff]"
            />
          </div>
        </div>

        <div className="px-6 pb-4">
          <div className="max-h-[420px] overflow-y-auto pr-2">
            <div className="flex flex-col gap-2">
              {filteredColumns.map((col) => {
                const checked = tempVisible.includes(col.key);
                const locked = Boolean(col.locked);

                return (
                  <label
                    key={col.key}
                    className="flex cursor-pointer items-center gap-3 rounded-lg bg-gray-50 px-3 py-3 transition-colors hover:bg-gray-100"
                  >
                    <GripVertical size={16} className="shrink-0 text-slate-400" />
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={locked}
                      onChange={() => {
                        if (locked) {
                          return;
                        }

                        setTempVisible((prev) =>
                          prev.includes(col.key)
                            ? prev.filter((key) => key !== col.key)
                            : [...prev, col.key]
                        );
                      }}
                      className="h-4 w-4 rounded border-gray-300 text-[#1d5cff] focus:ring-0 disabled:opacity-60"
                    />
                    <span className="flex-1 text-sm text-slate-700">{col.label}</span>
                    {locked ? <Lock size={14} className="shrink-0 text-slate-400" /> : null}
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-start gap-3 border-t border-gray-200 bg-white px-6 py-4">
          <button
            type="button"
            className="rounded-lg bg-[#156372] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0D4A52]"
            onClick={() => onSave(ensureLocked(tempVisible, columns))}
          >
            Save
          </button>
          <button
            type="button"
            className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-gray-50"
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
