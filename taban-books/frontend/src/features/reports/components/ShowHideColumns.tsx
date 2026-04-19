import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import WizardNav from "./WizardNav";
import { useReportWizard } from "./ReportWizardContext";
import { GripVertical, Search, X, Plus } from "lucide-react";

export default function ShowHideColumns() {
  const nav = useNavigate();
  const { availableCols, selectedCols, setSelectedCols, modules } = useReportWizard();
  const [query, setQuery] = useState("");
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const filteredAvailable = useMemo(() => {
    const q = query.trim().toLowerCase();
    return availableCols
      .filter((c) => !selectedCols.includes(c))
      .filter((c) => (q ? c.toLowerCase().includes(q) : true));
  }, [availableCols, selectedCols, query]);

  const moveToSelected = (item: string) => setSelectedCols((prev) => [...prev, item]);
  const removeFromSelected = (item: string) =>
    setSelectedCols((prev) => prev.filter((x) => x !== item));

  // Drag and drop handlers
  const handleDragStart = (event: React.DragEvent<HTMLDivElement>, index: number) => {
    setDraggedIndex(index);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/html", event.currentTarget.outerHTML);
    event.currentTarget.style.opacity = "0.5";
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>, index: number) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDragOverIndex(index);
  };

  const handleDragEnd = (event: React.DragEvent<HTMLDivElement>) => {
    event.currentTarget.style.opacity = "1";
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
    event.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) return;

    const newSelectedCols = [...selectedCols];
    const draggedItem = newSelectedCols[draggedIndex];
    newSelectedCols.splice(draggedIndex, 1);
    newSelectedCols.splice(dropIndex, 0, draggedItem);
    setSelectedCols(newSelectedCols);

    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  // Get parent module name for display
  const parentModule = modules?.[0]?.parent || "Quote";

  const card =
    "rounded-xl border-2 border-slate-200 bg-white p-5 shadow-[0_10px_28px_rgba(17,24,39,0.08)]";
  const label = "text-sm font-bold text-slate-700 tracking-wide uppercase mb-3";
  const search =
    "h-10 w-full rounded-lg border-2 border-slate-300 bg-white px-4 pl-10 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition";

  return (
    <div className="min-h-screen bg-white px-5 py-4 pb-28">
      <div className="text-[18px] font-semibold text-slate-900 pb-3 border-b border-slate-200 mb-4">
        New Custom Report
      </div>

      <div className="mb-4">
        <WizardNav />
      </div>

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-[1000px]">
        {/* Available */}
        <div className={card}>
          <div className="mb-4">
            <label className={label}>Available Columns</label>
          </div>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className={search}
              placeholder="Search columns..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>

          <div className="mt-2 max-h-[500px] overflow-y-auto space-y-1.5 pr-2">
            {filteredAvailable.map((c) => (
              <button
                key={c}
                className="w-full flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-700 hover:bg-blue-50 hover:border-blue-300 transition-all group"
                onClick={() => moveToSelected(c)}
                title="Click to add"
              >
                <span className="font-medium">{c}</span>
                <Plus className="h-4 w-4 text-slate-400 group-hover:text-blue-600 transition" />
              </button>
            ))}
            {filteredAvailable.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-slate-400 bg-slate-50 rounded-lg">
                {query ? "No matches found" : "All columns are selected"}
              </div>
            )}
          </div>
        </div>

        {/* Selected */}
        <div className={card}>
          <div className="mb-4">
            <label className={label}>Selected Columns</label>
            <p className="text-xs text-slate-500 mt-1">Drag to reorder columns</p>
          </div>

          <div className="mt-2 max-h-[500px] overflow-y-auto space-y-2 pr-2">
            {selectedCols.map((c, index) => (
              <div
                key={c}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                onDrop={(e) => handleDrop(e, index)}
                onDragLeave={handleDragLeave}
                className={`flex items-center gap-3 rounded-lg border-2 px-4 py-3 bg-gradient-to-r from-blue-50 to-sky-50 transition-all cursor-move ${
                  dragOverIndex === index
                    ? "border-blue-500 shadow-lg scale-[1.02]"
                    : draggedIndex === index
                    ? "border-blue-300 opacity-50"
                    : "border-blue-200 hover:border-blue-300 hover:shadow-md"
                }`}
              >
                <GripVertical className="h-5 w-5 text-slate-400 flex-shrink-0 cursor-grab active:cursor-grabbing" />
                <span className="flex-1 font-semibold text-slate-900">{c}</span>
                <span className="text-xs text-slate-500 bg-white px-2 py-0.5 rounded">({parentModule})</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFromSelected(c);
                  }}
                  className="flex-shrink-0 h-7 w-7 flex items-center justify-center rounded-md border border-red-200 bg-white text-red-500 hover:bg-red-50 hover:border-red-300 transition"
                  title="Remove"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {selectedCols.length === 0 && (
              <div className="px-4 py-12 text-center text-sm text-slate-400 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                <p className="font-medium mb-1">No columns selected</p>
                <p className="text-xs">Click on columns from the left to add them</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* floating footer */}
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1 shadow-xl">
        <button
          className="h-8 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 hover:bg-slate-50 active:scale-[.98]"
          onClick={() => nav("/reports/new/general")}
        >
          Back
        </button>
        <button
          className="h-8 rounded-md px-3 text-sm font-semibold text-white shadow-md hover:brightness-95 active:scale-[.98]"
          style={{ background: "#156372" }}
          onClick={() => nav("/reports/new/layout")}
        >
          Next
        </button>
      </div>
    </div>
  );
}
