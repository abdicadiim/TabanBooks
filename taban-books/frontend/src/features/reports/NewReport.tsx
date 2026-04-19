import React, { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { X, Plus, Trash2, Search, ChevronDown, Check } from "lucide-react";

/* ----------------- DATA ----------------- */
const PARENT_MODULES = [
  "Quote",
  "Invoice",
  "Credit Note",
  "Customer Payment",
  "Sales Receipt",
  "Purchase Order",
  "Expense",
  "Bill",
  "Vendor Credits",
  "Vendor Payment",
  "Journal",
  "Projects",
];

const FIRST_CHILD_BY_PARENT: Record<string, string[]> = {
  Quote: ["Contacts", "Quote Item", "Invoice"],
  Invoice: ["Contacts", "Users(Created By)", "Users(Last Modified By)", "Invoice Item", "Quote", "Credit Note", "Customer Payment"],
  "Credit Note": ["Contacts", "Credit Note Item", "Invoice"],
  "Customer Payment": ["Contacts", "Invoice", "Payment Mode"],
  "Sales Receipt": ["Contacts", "Sales Receipt Item", "Sales Person"],
};

const NEXT_CHILD_BY_PREV: Record<string, string[]> = {
  "Quote Item": ["Item", "Projects"],
  "Invoice Item": ["Item", "Projects"],
  "Credit Note Item": ["Item", "Projects"],
  "Sales Receipt Item": ["Item", "Projects"],
  "Purchase Order Item": ["Item", "Projects"],
  "Bill Item": ["Item", "Projects"],
  "Vendor Credit Item": ["Item", "Projects"],
  "Journal Items": ["Item", "Projects"],
  Item: [],
  Invoice: ["Contacts", "Invoice Item", "Quote", "Credit Note", "Customer Payment"],
  Contacts: [],
};

const MIN_CHILDREN_REQUIRED = 2;
const uniq = (arr: string[]) => Array.from(new Set((arr || []).filter(Boolean)));
const uid = () => Math.random().toString(16).slice(2);

/* ---------------- UI Components ---------------- */

function SearchableSelect({ value, onChange, options, placeholder }: { value: string; onChange: (v: string) => void; options: string[]; placeholder: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt => opt.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex h-11 w-full items-center justify-between rounded-lg border px-4 text-sm transition-all bg-white
          ${isOpen ? "border-blue-500 ring-2 ring-blue-50" : "border-slate-200 hover:border-slate-300"}
          ${!value ? "text-slate-400" : "text-slate-700"}`}
      >
        <span className="truncate">{value || placeholder}</span>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 z-50 mt-1.5 w-full rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
          <div className="p-2 border-b border-slate-100 bg-slate-50/50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                autoFocus
                placeholder="Search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-4 text-xs outline-none focus:border-blue-400 transition-colors"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto py-1 custom-scrollbar">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    onChange(opt);
                    setIsOpen(false);
                    setSearch("");
                  }}
                  className={`flex w-full items-center justify-between px-4 py-2.5 text-sm transition-colors text-left
                    ${value === opt ? "bg-blue-600 text-white" : "text-slate-700 hover:bg-slate-50"}`}
                >
                  <span className="truncate">{opt}</span>
                  {value === opt && <Check className="h-4 w-4 text-white" />}
                </button>
              ))
            ) : (
              <div className="px-4 py-4 text-center text-xs text-slate-400">No results found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Card({ title, children, showDelete, onRemove }: { title: string; children: React.ReactNode; showDelete?: boolean; onRemove?: () => void }) {
  return (
    <div className="w-[480px] rounded-xl border border-slate-200 bg-white p-6 shadow-sm relative group animate-in slide-in-from-top-4 duration-300">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[13px] font-bold text-slate-800 uppercase tracking-wider">{title}</h3>
        {showDelete && (
          <button
            onClick={onRemove}
            className="p-1.5 rounded-lg text-red-400 hover:text-red-500 hover:bg-red-50 transition-all shadow-sm border border-slate-100"
            title="Remove Module"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function Connector({ onAdd, active }: { onAdd?: () => void; active?: boolean }) {
  return (
    <div className="flex flex-col items-center py-1">
      <div className="w-px h-10 bg-slate-200" />
      <button
        onClick={onAdd}
        disabled={!active || !onAdd}
        className={`group relative flex h-8 w-8 items-center justify-center rounded-full shadow-md transition-all z-10 
          ${active && onAdd ? "bg-blue-600 border-blue-600 scale-100 hover:scale-110 active:scale-95" : "bg-white border-slate-200 cursor-default scale-90"}`}
      >
        <Plus className={`h-4 w-4 ${active && onAdd ? "text-white group-hover:rotate-90 transition-transform" : "text-slate-300"}`} />
      </button>
      <div className="w-px h-10 bg-slate-200" />
      <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-slate-200 -mt-1" />
    </div>
  );
}

export default function NewReport() {
  const nav = useNavigate();
  const [parent, setParent] = useState("");
  const [children, setChildren] = useState<{ id: string; module: string }[]>([]);

  useEffect(() => {
    if (parent && FIRST_CHILD_BY_PARENT[parent]) {
      // Just initialize with one child slot if parent is selected for the first time
      if (children.length === 0) {
        setChildren([{ id: uid(), module: "" }]);
      }
    }
  }, [parent]);

  const addNextChild = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!parent) return;
    setChildren([...children, { id: uid(), module: "" }]);
  };

  const updateChildModule = (id: string, module: string) => {
    setChildren(children.map(c => c.id === id ? { ...c, module } : c));
  };

  const removeChild = (id: string) => {
    setChildren(children.filter(c => c.id !== id));
  };

  const currentOptions = (index: number) => {
    if (index === 0) return uniq(FIRST_CHILD_BY_PARENT[parent]);
    const prev = children[index - 1]?.module;
    return uniq(NEXT_CHILD_BY_PREV[prev] || []);
  };

  const canNext = parent && children.length >= 1 && children.every(c => c.module);

  return (
    <div className="flex flex-col h-screen bg-[#f8fafc] overflow-hidden">
      {/* Header */}
      <header className="flex h-16 items-center justify-between border-b bg-white px-8 shrink-0 z-20">
        <h1 className="text-xl font-bold text-slate-800">New Custom Report</h1>
        <button
          onClick={() => nav("/reports")}
          className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
        >
          <X className="h-6 w-6" />
        </button>
      </header>

      {/* Canvas */}
      <main
        className="flex-1 overflow-y-auto py-16 px-8 custom-scrollbar relative"
        style={{
          backgroundImage: "radial-gradient(#e0e7ff 1.5px, transparent 1.5px)",
          backgroundSize: "32px 32px"
        }}
      >
        <div className="flex flex-col items-center max-w-4xl mx-auto">
          <Card title="Parent Module">
            <SearchableSelect
              value={parent}
              onChange={(val) => {
                setParent(val);
                setChildren([]); // Reset children if parent changes
              }}
              options={PARENT_MODULES}
              placeholder="Select a parent module"
            />
          </Card>

          <Connector
            active={Boolean(parent)}
            onAdd={children.length === 0 ? addNextChild : undefined}
          />

          {children.map((child, idx) => (
            <React.Fragment key={child.id}>
              <Card
                title="Child Module"
                showDelete
                onRemove={() => removeChild(child.id)}
              >
                <SearchableSelect
                  value={child.module}
                  onChange={(val) => updateChildModule(child.id, val)}
                  options={currentOptions(idx)}
                  placeholder="Select a child module"
                />
              </Card>
              <Connector
                active={Boolean(child.module && idx === children.length - 1)}
                onAdd={idx === children.length - 1 ? addNextChild : undefined}
              />
            </React.Fragment>
          ))}

          {/* Add spacing at the bottom so the last connector doesn't touch the footer */}
          <div className="h-20" />
        </div>
      </main>

      {/* Footer */}
      <footer className="flex h-20 items-center justify-end gap-3 border-t bg-white px-8 shrink-0">
        <button
          onClick={() => nav("/reports")}
          className="px-6 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
        >
          Cancel
        </button>
        <button
          disabled={!canNext}
          onClick={() => nav("/reports/new/general")}
          className={`px-8 py-2.5 text-sm font-bold text-white rounded-lg transition-all
            ${canNext ? "bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20 active:scale-95" : "bg-slate-300 cursor-not-allowed"}`}
        >
          Next
        </button>
      </footer>
    </div>
  );
}
