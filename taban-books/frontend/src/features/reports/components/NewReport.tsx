import React, { useMemo, useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  useReportWizard,
  type ReportModuleChild,
  type ReportModuleOptionsMap,
} from "./ReportWizardContext";
import { Trash2, Plus, Search, ChevronDown, Pencil, Info, X } from "lucide-react";

const ACCENT = "#156372";

interface SearchableDropdownProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  options: string[];
  disabled?: boolean;
  className?: string;
}

// Specific Module List (User Requested)
const PARENT_MODULES: string[] = [
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
  "Projects"
];

const CHILDREN_MAP: ReportModuleOptionsMap = {
  // --- Sales ---
  "Quote": ["Contacts", "Users(Created By)", "Users(Last Modified By)", "Quote Item"],
  "Invoice": ["Contacts", "Users(Created By)", "Users(Last Modified By)", "Invoice Item", "Quote", "Credit Note"],
  // Credit Note child options
  "Credit Note": [
    "Contacts",
    "Users(Created By)",
    "Users(Last Modified By)",
    "Credit Note Item",
    "Invoice"
  ],
  "Customer Payment": ["Contacts", "Users(Created By)", "Users(Last Modified By)", "Invoice"],
  "Sales Receipt": ["Contacts", "Users(Created By)", "Users(Last Modified By)", "Sales Receipt Item"],
  // Purchase
  "Purchase Order": ["Vendors", "Users(Created By)", "Users(Last Modified By)", "Purchase Order Item"],
  "Bill": ["Vendors", "Users(Created By)", "Users(Last Modified By)", "Bill Item", "Purchase Order", "Vendor Credits"],
  "Vendor Credits": ["Vendors", "Users(Created By)", "Users(Last Modified By)", "Vendor Credits Item", "Bill"],
  "Vendor Payment": ["Vendors", "Users(Created By)", "Users(Last Modified By)", "Bill"],
  "Expense": ["Users(Created By)", "Users(Last Modified By)", "Expense Item"],
  // All *Item nodes
  "Quote Item": ["Item"],
  "Invoice Item": ["Item"],
  "Credit Note Item": ["Item", "Projects"],
  "Sales Receipt Item": ["Item"],
  "Purchase Order Item": ["Item", "Projects"],
  "Bill Item": ["Item", "Projects"],
  "Expense Item": [],
  "Vendor Credit Item": ["Item"],
  "Vendor Credits Item": ["Item"],
  "Journal Items": ["Item"],

  // Common Leaf options - for child-to-child relationships (as per reference image)
  "Contacts": ["Users(Created By)", "Users(Last Modified By)"],
  "Sales Person": ["Users(Created By)", "Users(Last Modified By)"],
  "Payment Mode": ["Users(Created By)", "Users(Last Modified By)"],
  "Refunds": ["Users(Created By)", "Users(Last Modified By)"],
  "Vendor": ["Users(Created By)", "Users(Last Modified By)"],
  "Vendors": ["Users(Created By)", "Users(Last Modified By)"],
  "Customer": ["Users(Created By)", "Users(Last Modified By)"],
  "Tax": ["Users(Created By)", "Users(Last Modified By)"],
  "Tasks": ["Users(Created By)", "Users(Last Modified By)"],
  "Timesheet": [],
  "Timesheets": ["Users(Created By)", "Users(Last Modified By)"],
  "Users (Owners)": ["Users(Created By)", "Users(Last Modified By)"],
  "Item": ["Users(Created By)", "Users(Last Modified By)"],
  "Projects": ["Contacts", "Timesheet", "Users(Created By)", "Users(Last Modified By)"],
  // User options can reference each other - both should be available
  "Users(Created By)": ["Users(Created By)", "Users(Last Modified By)"],
  "Users(Last Modified By)": ["Users(Created By)", "Users(Last Modified By)"]
};

function SearchableDropdown({
  value,
  onChange,
  placeholder,
  options,
  disabled = false,
  className = "",
}: SearchableDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (containerRef.current && !containerRef.current.contains(target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter options
  const filteredOptions = useMemo(() => {
    if (!search) return options;
    return options.filter((option) => option.toLowerCase().includes(search.toLowerCase()));
  }, [options, search]);

  const handleSelect = (option: string) => {
    onChange(option);
    setIsOpen(false);
    setSearch("");
  };

  return (
    <div className={`relative ${className}`} ref={containerRef} style={{ isolation: 'isolate' }}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={[
          "flex h-10 w-full items-center justify-between rounded-lg border bg-white px-3.5 text-sm transition-all",
          "outline-none",
          disabled
            ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400"
            : isOpen
              ? "bg-white text-slate-900 shadow-sm ring-2"
              : "border-slate-300 text-slate-700 hover:border-slate-400 hover:shadow-sm",
        ].join(" ")}
        style={isOpen && !disabled ? { borderColor: "#156372", boxShadow: "0 0 0 2px rgba(21, 99, 114, 0.2)" } : {}}
      >
        <span className={!value ? "text-slate-400" : "text-slate-900"}>{value || placeholder}</span>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180 text-slate-600" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-[100] mt-1.5 w-full overflow-hidden rounded-lg border border-slate-300 bg-white shadow-2xl">
          {/* Search Bar - Taban style */}
          <div className="border-b border-slate-200 bg-slate-50/50 p-2.5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                autoFocus
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search"
                className="h-9 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:ring-2 transition-all"
                onFocus={(event) => {
                  event.currentTarget.style.borderColor = "#156372";
                  event.currentTarget.style.boxShadow = "0 0 0 2px rgba(21, 99, 114, 0.2)";
                }}
                onBlur={(event) => {
                  event.currentTarget.style.borderColor = "";
                  event.currentTarget.style.boxShadow = "";
                }}
              />
            </div>
          </div>
          {/* Options List - Taban style */}
          <div className="max-h-[240px] overflow-y-auto py-1.5">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleSelect(option)}
                  className={`flex w-full items-center px-4 py-2.5 text-left text-sm transition-all duration-150 ${value === option
                      ? "font-medium border-l-2"
                      : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  style={value === option ? { backgroundColor: "rgba(21, 99, 114, 0.1)", color: "#156372", borderLeftColor: "#156372" } : {}}
                >
                  <span className="flex-1">{option}</span>
                  {value === option && (
                    <svg className="h-4 w-4" style={{ color: "#156372" }} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))
            ) : (
              <div className="px-4 py-6 text-center text-sm text-slate-400">No results found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function NewReport() {
  const nav = useNavigate();
  const { setModules, setModuleOptions } = useReportWizard();

  const [parent, setParent] = useState("");
  const [children, setChildren] = useState<ReportModuleChild[]>([]);
  const [editModalIndex, setEditModalIndex] = useState<number | null>(null); // Track which child's edit modal is open

  // Reset children when parent changes (original step-by-step behavior)
  useEffect(() => {
    setChildren([]);
    setEditModalIndex(null);
  }, [parent]);

  // Helper to get options for a specific child level
  const getChildOptions = (index: number): string[] => {
    if (index === 0) {
      // First child options depend on Parent
      return parent ? CHILDREN_MAP[parent] || [] : [];
    } else {
      // Subsequent child options depend on the previous child's selection
      const prevChild = children[index - 1];
      return prevChild && prevChild.module ? CHILDREN_MAP[prevChild.module] || [] : [];
    }
  };

  const addChild = () => {
    // Add one child at a time - maximum 2 children (3 steps total: parent + 2 children)
    if (children.length < 2) {
      setChildren((prev) => [...prev, { module: "", relatedOnly: true, id: crypto.randomUUID() }]);
    }
  };

  const updateChild = (i: number, patch: Partial<ReportModuleChild>) => {
    setChildren((prev) => {
      const updated = prev.map((c, idx) => (idx === i ? { ...c, ...patch } : c));
      // If module is changed, reset all subsequent children (chain reset)
      if (patch.module !== undefined) {
        return updated.slice(0, i + 1);
      }
      return updated;
    });
  };

  const removeChild = (i: number) => setChildren((prev) => prev.filter((_, idx) => idx !== i));

  const canNext = !!parent;

  const handleNext = () => {
    setModules([{ parent, children }]);
    setModuleOptions({ parentOptions: PARENT_MODULES, childOptionsMap: CHILDREN_MAP });
    nav("/reports/new/general");
  };

  // Styles - Ensure proper spacing and z-index to prevent overlapping - Taban style
  // Removed my-4 from cardStyle to handle spacing explicitly per element
  const cardStyle = "relative z-20 w-full max-w-[400px] rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md";
  const labelStyle = "mb-2 block text-xs font-semibold text-slate-700"; // Taban style label

  // Dotted background
  const bgPattern = {
    backgroundImage: "radial-gradient(#e2e8f0 1px, transparent 1px)", // Lighter dots
    backgroundSize: "24px 24px",
  };

  return (
    <div className="flex min-h-[calc(100vh-200px)] flex-col pb-20">
      <div className="mb-6">
        <h2 className="text-lg font-bold text-slate-900">New Custom Report</h2>
      </div>

      {/* Main Area with Dotted BG */}
      <div className="relative flex flex-1 flex-col items-center rounded-2xl border border-slate-200 bg-slate-50/50 py-10 px-4" style={{ ...bgPattern, isolation: 'isolate' }}>

        {/* Parent Node - Ensure proper spacing and z-index - Taban style */}
        <div className={cardStyle + " mb-6"} style={{ position: 'relative', zIndex: 10 }}>
          <label className={labelStyle}>Parent Module</label>
          <div className="mt-1">
            <SearchableDropdown
              value={parent}
              onChange={(v) => {
                setParent(v);
                // Children will be reset via useEffect
              }}
              placeholder="Select a parent module"
              options={PARENT_MODULES}
            />
          </div>
        </div>

        {/* Connecting Line from Parent */}
        {parent && (
          <div className="flex flex-col items-center my-2">
            <div className="h-8 w-px bg-slate-400"></div> {/* Darker line */}

            {/* Add Button (if no children yet and less than 2 children max) */}
            {children.length === 0 && children.length < 2 && (
              <button
                onClick={addChild}
                className="group flex h-6 w-6 items-center justify-center rounded-full bg-[#3b82f6] text-white shadow-sm transition hover:brightness-110 z-30 relative"
                title="Add Child Module"
              >
                <Plus className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        {/* Re-rendering logic to be cleaner for the tree structure */}
        {children.map((child, index) => (
          <div key={child.id} className="flex flex-col items-center w-full" style={{ minHeight: '140px', marginTop: index === 0 ? '8px' : '24px', marginBottom: '24px', isolation: 'isolate' }}>
            {/* Line connecting to previous node (Parent or Child) */}
            {index === 0 && (
              <div className="h-8 w-px bg-slate-400 mb-2"></div>
            )}

            {/* For subsequent children, we need a line from prev child to this child */}
            {index > 0 && (
              <div className="h-8 w-px bg-slate-400 mb-2"></div>
            )}

            {/* The Child Card - Ensure it never overlaps with other elements */}
            <div className={cardStyle + " w-full"} style={{ marginTop: '0', marginBottom: '0', position: 'relative', zIndex: 20 + index }}>
              <div className="mb-2">
                <label className={labelStyle}>Child Module</label>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-1">
                  {child.module ? (
                    // Selected State - Taban style
                    <div>
                      <div className="flex h-10 w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-3.5 text-sm text-slate-900 shadow-sm">
                        <span className="font-medium">{child.module}</span>
                        <button
                          onClick={() => updateChild(index, { module: "" })}
                          className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:border-slate-300"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="mt-3 flex items-center gap-2 text-sm text-slate-600">
                        <Info className="h-4 w-4 text-slate-400" />
                        <span>{child.relatedOnly ? "Show Related Records Only" : "Show All Records"}</span>
                        <button
                          onClick={() => setEditModalIndex(index)}
                          className="flex h-6 w-8 items-center justify-center rounded border border-slate-300 bg-white transition hover:bg-slate-50 hover:border-slate-400"
                          style={{ color: "#156372" }}
                          title="Edit"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Dropdown State
                    <SearchableDropdown
                      value={child.module}
                      onChange={(v) => updateChild(index, { module: v })}
                      placeholder="Select a child module"
                      options={getChildOptions(index)}
                    />
                  )}
                </div>
                <button
                  onClick={() => removeChild(index)}
                  className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-white text-red-500 transition hover:bg-red-50 hover:border-red-300"
                  title="Remove"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Add Button below this child - only show on last child and if less than 2 children (3 steps max) */}
            {index === children.length - 1 && children.length < 2 && (
              <div className="flex flex-col items-center mt-4">
                <div className="h-8 w-px bg-slate-400"></div>
                <button
                  onClick={addChild}
                  className="group flex h-6 w-6 items-center justify-center rounded-full text-white shadow-sm transition hover:brightness-110 z-30 relative mt-2"
                  style={{ background: "#156372" }}
                  onMouseOver={(event) => {
                    event.currentTarget.style.backgroundColor = "#0e4a5e";
                  }}
                  onMouseOut={(event) => {
                    event.currentTarget.style.backgroundColor = "#156372";
                  }}
                  title="Add Child Module"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        ))}

      </div>

      {/* Edit Modal for Show Related Records Only */}
      {editModalIndex !== null && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50"
          onClick={() => setEditModalIndex(null)}
        >
          <div
            className="w-full max-w-md rounded-lg border border-slate-200 bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h3 className="text-base font-semibold text-slate-900">Record Display Options</h3>
              <button
                onClick={() => setEditModalIndex(null)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-5 py-4">
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name={`recordDisplay-${editModalIndex}`}
                    checked={children[editModalIndex]?.relatedOnly === true}
                    onChange={() => updateChild(editModalIndex, { relatedOnly: true })}
                    className="h-4 w-4"
                    style={{ accentColor: "#156372" }}
                  />
                  <span className="text-sm text-slate-700">Show Related Records Only</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name={`recordDisplay-${editModalIndex}`}
                    checked={children[editModalIndex]?.relatedOnly === false}
                    onChange={() => updateChild(editModalIndex, { relatedOnly: false })}
                    className="h-4 w-4"
                    style={{ accentColor: "#156372" }}
                  />
                  <span className="text-sm text-slate-700">Show All Records</span>
                </label>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-5 py-4">
              <button
                onClick={() => setEditModalIndex(null)}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => setEditModalIndex(null)}
                className="rounded-md px-4 py-2 text-sm font-medium text-white transition-colors"
                style={{ background: "#156372" }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.backgroundColor = "#0D4A52";
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.backgroundColor = "#156372";
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer Actions */}
      <div className="mt-6 flex justify-end gap-3">
        <button
          onClick={() => nav("/reports")}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 hover:text-slate-900"
        >
          Cancel
        </button>
        <button
          onClick={handleNext}
          disabled={!canNext}
          className="rounded-xl px-6 py-2 text-sm font-semibold text-white shadow-md transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          style={{ backgroundColor: ACCENT }}
        >
          Next
        </button>
      </div>
    </div>
  );
}

