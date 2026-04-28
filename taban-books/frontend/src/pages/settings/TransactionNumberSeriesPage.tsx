import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Loader2, Plus, ChevronDown, PencilLine, Trash2, AlertTriangle, X } from "lucide-react";
import { transactionNumberSeriesAPI } from "../../services/api";
import NewTransactionNumberSeriesPage, { TransactionNumberSeriesEditorData } from "./NewTransactionNumberSeriesPage";
import { toast } from "react-toastify";

type SeriesDeleteModalProps = {
  isOpen: boolean;
  seriesName: string;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  confirmDisabled?: boolean;
};

function SeriesDeleteModal({
  isOpen,
  seriesName,
  onClose,
  onConfirm,
  confirmDisabled = false,
}: SeriesDeleteModalProps) {
  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-start justify-center bg-black/40 pt-20"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[520px] overflow-hidden rounded-xl bg-white shadow-[0_20px_60px_rgba(0,0,0,0.2)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-600">
              <AlertTriangle size={16} />
            </div>
            <div className="text-[15px] font-semibold text-slate-800">Delete series?</div>
          </div>
          <button
            type="button"
            className="text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={onClose}
            aria-label="Close"
            disabled={confirmDisabled}
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-4 text-sm text-slate-600">
          This will remove all modules in
          {" "}
          <span className="font-medium text-slate-800">{seriesName}</span>
          . You cannot undo this action.
        </div>
        <div className="flex items-center gap-3 border-t border-gray-100 px-5 py-4">
          <button
            type="button"
            className="rounded-md bg-[#156372] px-4 py-2 text-sm font-medium text-white hover:bg-[#0f4e59] disabled:cursor-not-allowed disabled:opacity-60"
            onClick={onConfirm}
            disabled={confirmDisabled}
          >
            {confirmDisabled ? "Deleting..." : "Delete"}
          </button>
          <button
            type="button"
            className="rounded-md border border-gray-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={onClose}
            disabled={confirmDisabled}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function TransactionNumberSeriesPage() {
  const [editorMode, setEditorMode] = useState<"create" | "edit" | null>(null);
  const [activeSeriesData, setActiveSeriesData] = useState<TransactionNumberSeriesEditorData | null>(null);
  const [openSeriesMenu, setOpenSeriesMenu] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [seriesPendingDelete, setSeriesPendingDelete] = useState<string | null>(null);
  const [isDeletingSeries, setIsDeletingSeries] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [series, setSeries] = useState<any[]>([]);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    fetchSeries();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenSeriesMenu(null);
        setMenuPosition(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchSeries = async () => {
    setIsLoading(true);
    try {
      const response = await transactionNumberSeriesAPI.getAll();
      if (response && response.success) {
        setSeries(response.data);
      }
    } catch (error) {
      console.error("Error fetching series:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewSeries = () => {
    setActiveSeriesData(null);
    setOpenSeriesMenu(null);
    setMenuPosition(null);
    setEditorMode("create");
  };

  const buildEditorData = (name: string, items: any[]): TransactionNumberSeriesEditorData => {
    const firstRow = items[0] || {};
    return {
      seriesName: firstRow.seriesName || name,
      locationIds: Array.isArray(firstRow.locationIds)
        ? firstRow.locationIds
        : firstRow.locationId
          ? [firstRow.locationId]
          : [],
      modules: items.map((item) => ({
        module: item.module || "",
        prefix: item.prefix || "",
        startingNumber: String(item.startingNumber ?? item.currentNumber ?? "1"),
        restartNumbering: String(item.restartNumbering ?? "None"),
        preview: item.preview || `${item.prefix || ""}${item.startingNumber || item.currentNumber || ""}`,
        currentNumber: item.currentNumber,
        isDefault: item.isDefault,
      })),
    };
  };

  const handleEditSeries = (name: string) => {
    const items = groupedSeries[name] || [];
    setOpenSeriesMenu(null);
    setMenuPosition(null);
    setActiveSeriesData(buildEditorData(name, items));
    setEditorMode("edit");
  };

  const handleDeleteSeries = async (name: string) => {
    setOpenSeriesMenu(null);
    setMenuPosition(null);
    setSeriesPendingDelete(name);
  };

  const confirmDeleteSeries = async () => {
    if (!seriesPendingDelete) return;

    const items = groupedSeries[seriesPendingDelete] || [];
    const ids = items
      .map((item) => String(item?._id || item?.id || "").trim())
      .filter(Boolean);

    if (!ids.length) {
      alert("No saved rows were found for this series.");
      setSeriesPendingDelete(null);
      return;
    }

    try {
      setIsDeletingSeries(true);
      await Promise.all(ids.map((id) => transactionNumberSeriesAPI.delete(id)));
      await fetchSeries();
      toast.success("Transaction number series deleted successfully.");
    } catch (error) {
      console.error("Error deleting transaction number series:", error);
      toast.error("Failed to delete transaction number series.");
      alert("Failed to delete transaction number series.");
    } finally {
      setIsDeletingSeries(false);
      setSeriesPendingDelete(null);
    }
  };

  const handleBackFromEditor = () => {
    setEditorMode(null);
    setActiveSeriesData(null);
    setOpenSeriesMenu(null);
    setMenuPosition(null);
    fetchSeries();
  };

  const toggleSeriesMenu = (name: string) => {
    if (openSeriesMenu === name) {
      setOpenSeriesMenu(null);
      setMenuPosition(null);
      return;
    }

    const trigger = triggerRefs.current[name];
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const menuWidth = 128;
    const viewportPadding = 12;
    const left = Math.min(
      Math.max(viewportPadding, rect.right - menuWidth),
      window.innerWidth - menuWidth - viewportPadding,
    );
    const top = Math.max(viewportPadding, rect.top - 84);

    setMenuPosition({ top, left });
    setOpenSeriesMenu(name);
  };

  // Group series by name
  const groupedSeries: Record<string, any[]> = series.reduce((acc, item) => {
    const name = item.seriesName || "Standard";
    if (!acc[name]) acc[name] = [];
    acc[name].push(item);
    return acc;
  }, {} as Record<string, any[]>);

  const seriesNames = Object.keys(groupedSeries);

  // Get all unique modules to form columns
  const allModules = Array.from(new Set(series.map(s => s.module))).sort();

  const resolveModuleSeries = (items: any[], moduleName: string) =>
    items.find((s) => {
      const m = String(s.module || "").toLowerCase().replace(/s$/, "");
      const target = moduleName.toLowerCase().replace(/s$/, "");
      return m === target || m.replace(/\s/g, "-") === target.replace(/\s/g, "-");
    });

  if (isLoading && series.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-[#156372]" />
      </div>
    );
  }

  if (editorMode) {
    return (
      <div className="flex min-h-full flex-col bg-transparent font-sans">
        <div className="w-full min-w-0 px-4 py-4 md:px-6 md:py-6">
          <NewTransactionNumberSeriesPage
            onBack={handleBackFromEditor}
            mode={editorMode}
            initialData={activeSeriesData}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-full min-w-0 flex-col bg-transparent font-sans">
      <div className="w-full min-w-0 px-4 py-4 md:px-6 md:py-6">
        <div className="w-full min-w-0 overflow-visible rounded-2xl border border-slate-200 bg-slate-50 shadow-sm">
          <div className="sticky top-0 z-20 bg-transparent">
            {/* Top Header */}
            <div className="flex flex-col gap-4 border-b border-slate-200 px-4 py-4 md:px-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <h1 className="truncate text-[17px] font-semibold text-[#1a202c]">
                  Transaction Number Series
                </h1>
              </div>
              <div className="flex flex-wrap items-center gap-3 md:gap-4 lg:justify-end">
                <button
                  onClick={handleNewSeries}
                  className="flex h-9 items-center gap-2 whitespace-nowrap rounded-md bg-[#156372] px-4 text-[12px] font-medium text-white shadow-sm transition-colors hover:bg-[#0f4f5c] active:scale-95"
                >
                  <Plus size={16} />
                  New Series
                </button>
              </div>
            </div>

            {/* Sub Header */}
            <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-100/70 px-4 py-3 md:px-6">
              <span className="text-[13px] font-semibold text-[#1a202c]">All Series</span>
              <span className="rounded-[3px] bg-[#edf2f7] px-1.5 py-0.5 text-[11px] font-bold leading-none text-[#4a5568]">
                {seriesNames.length}
              </span>
            </div>
          </div>

          {/* Horizontal Table */}
          <div className="w-full min-w-0 overflow-x-auto overflow-y-hidden border-t border-slate-200 custom-scrollbar">
            <table className="w-full min-w-[1120px] border-collapse whitespace-nowrap text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100/80">
                  <th className="min-w-[180px] border-r border-slate-200 px-4 py-3 text-[10.5px] font-bold uppercase tracking-wider text-[#718096] md:px-5">
                    SERIES NAME
                  </th>
                  {allModules.map((moduleName) => (
                    <th
                      key={moduleName}
                      className="min-w-[120px] border-r border-slate-200 px-4 py-3 text-[10.5px] font-bold uppercase tracking-wider text-[#718096] md:min-w-[130px] md:px-5"
                    >
                      {moduleName}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-slate-50">
                {seriesNames.map((name) => (
                  <tr key={name} className="transition-colors hover:bg-slate-100/60">
                    <td className="border-r border-slate-200 bg-slate-50 px-4 py-4 md:px-5">
                      <div className="relative flex w-full items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => handleEditSeries(name)}
                          className="whitespace-nowrap text-left text-[13.5px] font-semibold text-[#156372] hover:underline"
                        >
                          {name}
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleSeriesMenu(name)}
                          ref={(node) => {
                            triggerRefs.current[name] = node;
                          }}
                          className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-emerald-500/70 bg-emerald-500 text-white shadow-sm transition-colors hover:bg-emerald-600"
                          aria-label={`Open actions for ${name}`}
                        >
                          <ChevronDown size={14} strokeWidth={3} />
                        </button>
                      </div>
                    </td>
                    {allModules.map((moduleName) => {
                      const moduleSeries = resolveModuleSeries(groupedSeries[name], moduleName);
                      return (
                        <td key={moduleName} className="border-r border-slate-200 px-4 py-4 md:px-5">
                          {moduleSeries ? (
                            <span className="text-[13px] font-medium text-slate-700">
                              {moduleSeries.prefix}
                              {moduleSeries.startingNumber}
                            </span>
                          ) : (
                            <span className="text-[13px] text-slate-300">-</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {openSeriesMenu && menuPosition && (
            <div
              ref={menuRef}
              className="fixed z-[1000] w-32 rounded-lg border border-slate-200 bg-white p-1 shadow-xl"
              style={{ top: menuPosition.top, left: menuPosition.left }}
            >
              <button
                type="button"
                onClick={() => handleEditSeries(openSeriesMenu)}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
              >
                <PencilLine size={15} />
                Edit
              </button>
              <button
                type="button"
                onClick={() => handleDeleteSeries(openSeriesMenu)}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50"
              >
                <Trash2 size={15} />
                Delete
              </button>
            </div>
          )}

          <SeriesDeleteModal
            isOpen={Boolean(seriesPendingDelete)}
            seriesName={seriesPendingDelete || ""}
            onClose={() => {
              if (isDeletingSeries) return;
              setSeriesPendingDelete(null);
            }}
            onConfirm={confirmDeleteSeries}
            confirmDisabled={isDeletingSeries}
          />
        </div>
      </div>
    </div>
  );
}
