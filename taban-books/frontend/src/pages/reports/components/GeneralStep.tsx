import React, { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import WizardNav from "./WizardNav";
import {
  useReportWizard,
  type ReportFilterRow,
  type ReportModuleSelection,
} from "./ReportWizardContext";

/* theme */
const ACCENT = "#156372";

type FieldType = "text" | "number" | "date" | "enum";

type FieldMeta =
  | { type: "text" | "number" | "date" }
  | { type: "enum"; options: string[] };

type FieldMetaMap = Record<string, FieldMeta>;

interface DropdownProps {
  value: string;
  placeholder: string;
  options: string[];
  onChange: (value: string) => void;
  category?: string;
}

interface DropdownPosition {
  top: number;
  left: number;
  width: number;
  openUpward: boolean;
}

interface FilterRowProps {
  idx: number;
  row: ReportFilterRow;
  onChange: (next: ReportFilterRow) => void;
  onAddNext: () => void;
  onRemove: () => void;
  fieldMeta: FieldMetaMap;
  allowedFields: string[];
}

interface CalendarDay {
  date: number;
  month: "prev" | "current" | "next";
  fullDate: Date;
}

/* ---------- Field metadata generator based on modules ---------- */
function generateFieldMeta(modules: ReportModuleSelection[]): FieldMetaMap {
  const fieldMeta: FieldMetaMap = {};
  
  // Common fields for all modules
  const commonFields: FieldMetaMap = {
    "Created Time": { type: "date" },
    "Last Modified Time": { type: "date" },
    "Created By": { type: "text" },
  };

  // Module-specific fields
  const moduleFields: Record<string, FieldMetaMap> = {
    Quote: {
      Status: { type: "enum", options: ["Draft", "Sent", "Accepted", "Declined", "Expired"] },
      "Quote Date": { type: "date" },
      "Expiry Date": { type: "date" },
      "Quote#": { type: "text" },
      "Reference#": { type: "text" },
      "Quote Amount": { type: "number" },
      "Quote Amount (FCY)": { type: "number" },
      "Sales person": { type: "text" },
      "Customer Name": { type: "text" },
      "Invoice#": { type: "text" },
      "Project Name": { type: "text" },
      "Accepted Date": { type: "date" },
      Currency: { type: "text" },
      Notes: { type: "text" },
      "Terms and Conditions": { type: "text" },
      "Shipping Charge": { type: "number" },
      "Billing Country": { type: "text" },
      "Shipping Country": { type: "text" },
    },
    Invoice: {
      Status: { type: "enum", options: ["Draft", "Sent", "Paid", "Overdue", "Void"] },
      "Invoice Date": { type: "date" },
      "Due Date": { type: "date" },
      "Invoice#": { type: "text" },
      "Reference#": { type: "text" },
      "Invoice Amount": { type: "number" },
      "Customer Name": { type: "text" },
      "Sales person": { type: "text" },
      Currency: { type: "text" },
      Notes: { type: "text" },
    },
    "Credit Note": {
      Status: { type: "enum", options: ["Draft", "Sent", "Applied"] },
      "Credit Note Date": { type: "date" },
      "Credit Note#": { type: "text" },
      "Reference#": { type: "text" },
      "Credit Note Amount": { type: "number" },
      "Customer Name": { type: "text" },
      Currency: { type: "text" },
      Notes: { type: "text" },
    },
    "Customer Payment": {
      "Payment Date": { type: "date" },
      "Payment#": { type: "text" },
      "Payment Amount": { type: "number" },
      "Customer Name": { type: "text" },
      "Payment Mode": { type: "text" },
      Currency: { type: "text" },
      Notes: { type: "text" },
    },
    "Sales Receipt": {
      "Receipt Date": { type: "date" },
      "Receipt#": { type: "text" },
      "Receipt Amount": { type: "number" },
      "Customer Name": { type: "text" },
      "Sales Person": { type: "text" },
      Currency: { type: "text" },
      Notes: { type: "text" },
    },
    "Purchase Order": {
      Status: { type: "enum", options: ["Draft", "Sent", "Received", "Cancelled"] },
      "PO Date": { type: "date" },
      "Expected Date": { type: "date" },
      "PO#": { type: "text" },
      "Reference#": { type: "text" },
      "PO Amount": { type: "number" },
      "Vendor Name": { type: "text" },
      Currency: { type: "text" },
      Notes: { type: "text" },
    },
    Bill: {
      Status: { type: "enum", options: ["Draft", "Open", "Paid", "Void"] },
      "Bill Date": { type: "date" },
      "Due Date": { type: "date" },
      "Bill#": { type: "text" },
      "Reference#": { type: "text" },
      "Bill Amount": { type: "number" },
      "Vendor Name": { type: "text" },
      Currency: { type: "text" },
      Notes: { type: "text" },
    },
    "Vendor Credits": {
      Status: { type: "enum", options: ["Draft", "Applied"] },
      "Credit Date": { type: "date" },
      "Credit#": { type: "text" },
      "Credit Amount": { type: "number" },
      "Vendor Name": { type: "text" },
      Currency: { type: "text" },
      Notes: { type: "text" },
    },
    "Vendor Payment": {
      "Payment Date": { type: "date" },
      "Payment#": { type: "text" },
      "Payment Amount": { type: "number" },
      "Vendor Name": { type: "text" },
      "Payment Mode": { type: "text" },
      Currency: { type: "text" },
      Notes: { type: "text" },
    },
    Expense: {
      "Expense Date": { type: "date" },
      "Expense#": { type: "text" },
      "Expense Amount": { type: "number" },
      "Vendor Name": { type: "text" },
      Category: { type: "text" },
      Currency: { type: "text" },
      Notes: { type: "text" },
    },
    Journal: {
      "Journal Date": { type: "date" },
      "Journal#": { type: "text" },
      "Journal Amount": { type: "number" },
      Currency: { type: "text" },
      Notes: { type: "text" },
    },
    Projects: {
      "Project Name": { type: "text" },
      "Start Date": { type: "date" },
      "End Date": { type: "date" },
      Status: { type: "enum", options: ["Active", "Completed", "On Hold", "Cancelled"] },
      "Project Budget": { type: "number" },
      Notes: { type: "text" },
    },
    Contacts: {
      "Contact Name": { type: "text" },
      Email: { type: "text" },
      Phone: { type: "text" },
      Company: { type: "text" },
      Address: { type: "text" },
      City: { type: "text" },
      Country: { type: "text" },
    },
    Vendors: {
      "Vendor Name": { type: "text" },
      Email: { type: "text" },
      Phone: { type: "text" },
      Company: { type: "text" },
      Address: { type: "text" },
      City: { type: "text" },
      Country: { type: "text" },
    },
    Item: {
      "Item Name": { type: "text" },
      SKU: { type: "text" },
      "Item Type": { type: "enum", options: ["Product", "Service"] },
      "Unit Price": { type: "number" },
      "Purchase Price": { type: "number" },
      "Stock Quantity": { type: "number" },
      Description: { type: "text" },
    },
    Timesheet: {
      "Date": { type: "date" },
      "Hours": { type: "number" },
      "Project Name": { type: "text" },
      "Task": { type: "text" },
      Description: { type: "text" },
    },
  };

  // Add common fields
  Object.assign(fieldMeta, commonFields);

  // Add fields from selected modules
  if (modules && modules.length > 0) {
    const moduleData = modules[0];
    const parent = moduleData?.parent;
    const children = moduleData?.children || [];

    // Add parent module fields
    if (parent && moduleFields[parent]) {
      Object.assign(fieldMeta, moduleFields[parent]);
    }

    // Add child module fields
    children.forEach((child) => {
      if (child.module && moduleFields[child.module]) {
        Object.assign(fieldMeta, moduleFields[child.module]);
      }
    });
  } else {
    // Default to Quote if no modules selected
    Object.assign(fieldMeta, moduleFields.Quote);
  }

  return fieldMeta;
}

/* ---------- comparators per type ---------- */
const CMP = {
  text: ["contains", "equals", "starts with", "ends with", "is empty", "is not empty"],
  number: ["=", "≠", ">", "<", "≥", "≤", "between", "is empty", "is not empty"],
  date: ["is", "is before", "is after", "between", "is empty", "is not empty"],
  enum: ["is", "is not", "is empty", "is not empty"],
};

/* ---------- helpers ---------- */
function useClickAway(
  ref: RefObject<HTMLElement | null>,
  onAway?: () => void,
  additionalRef?: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    const fn = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      const clickedInside = ref.current?.contains(target) || additionalRef?.current?.contains(target);
      if (!clickedInside) onAway?.();
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [onAway, ref, additionalRef]);
}

/* ---------- small searchable dropdown with portal and dynamic positioning ---------- */
function Dropdown({ value, placeholder, options, onChange, category }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [position, setPosition] = useState<DropdownPosition>({
    top: 0,
    left: 0,
    width: 0,
    openUpward: false,
  });
  const box = useRef<HTMLDivElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useClickAway(box, () => setOpen(false), dropdownRef);

  const list = useMemo(() => {
    // Filter out "Quote" as it's only a category header, not an option
    const filteredOptions = options.filter((option) => option !== "Quote" && option !== category);
    const s = q.trim().toLowerCase();
    return s ? filteredOptions.filter((option) => option.toLowerCase().includes(s)) : filteredOptions;
  }, [options, q, category]);

  // Calculate position when opening
  useEffect(() => {
    if (open && box.current) {
      const rect = box.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const dropdownHeight = 320; // max height
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      const openUpward = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;

      setPosition({
        top: openUpward ? rect.top - dropdownHeight - 8 : rect.bottom + 8,
        left: rect.left,
        width: rect.width,
        openUpward
      });
    }
  }, [open]);

  // Handle scroll and resize
  useEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      if (box.current) {
        const rect = box.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const dropdownHeight = 320;
        const spaceBelow = viewportHeight - rect.bottom;
        const spaceAbove = rect.top;
        const openUpward = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;

        setPosition({
          top: openUpward ? rect.top - dropdownHeight - 8 : rect.bottom + 8,
          left: rect.left,
          width: rect.width,
          openUpward
        });
      }
    };

    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open]);

  return (
    <>
      <div ref={box} className="relative w-full">
        <button
          type="button"
          className={`h-11 w-full rounded-lg border-2 bg-white px-4 text-left text-sm font-medium flex items-center justify-between transition
            ${open ? "ring-2 shadow-md" : "border-slate-300 hover:border-slate-400"}
          `}
          style={open ? { borderColor: ACCENT, boxShadow: "0 0 0 2px rgba(21, 99, 114, 0.2)" } : undefined}
          onClick={() => setOpen((prevOpen) => !prevOpen)}
        >
          <span className={`truncate ${value ? "text-slate-900 font-semibold" : "text-slate-500"}`}>
            {value || placeholder}
          </span>
          <svg 
            width="14" 
            height="14" 
            viewBox="0 0 14 14" 
            fill="none"
            className={`transition-transform ${open ? "rotate-180" : ""}`}
          >
            <path d="M3.5 5.25l3.5 3.5 3.5-3.5" stroke="#6b7280" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {open && createPortal(
        <div
          ref={dropdownRef}
          className="fixed overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
            width: `${position.width}px`,
            zIndex: 99999,
            maxHeight: '320px',
            display: 'flex',
            flexDirection: 'column'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-3 py-2.5 flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="7" cy="7" r="5" stroke="#9ca3af" strokeWidth="1.5" fill="none"/>
              <path d="M11 11l-3-3" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input
              autoFocus
              className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-slate-400"
              placeholder="Search"
              value={q}
              onChange={(event) => setQ(event.target.value)}
            />
          </div>

          <div className="overflow-auto flex-1" style={{ maxHeight: '280px' }}>
            {category && (
              <div className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-50 border-b border-slate-100">
                {category}
              </div>
            )}
            {list.map((opt) => {
              const isSelected = opt === value;
              return (
                <button
                  key={opt}
                  type="button"
                  className={`w-full px-4 py-2.5 text-left text-sm font-medium transition flex items-center justify-between
                    ${isSelected ? "text-white" : "text-slate-900 hover:bg-slate-50"}
                  `}
                  style={isSelected ? { backgroundColor: ACCENT } : undefined}
                  onClick={() => {
                    onChange(opt);
                    setOpen(false);
                    setQ("");
                  }}
                >
                  <span>{opt}</span>
                  {isSelected && (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M13 4l-6 6-3-3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
              );
            })}
            {list.length === 0 && (
              <div className="px-4 py-3 text-sm text-slate-400 text-center">No matches found</div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

/* ---------- one filter row ---------- */
function FilterRow({
  idx,
  row,
  onChange,
  onAddNext,
  onRemove,
  fieldMeta,
  allowedFields,
}: FilterRowProps) {
  const meta = row.field ? fieldMeta[row.field] : undefined;
  const type = meta?.type;
  const cmpOptions = type ? CMP[type as keyof typeof CMP] : ["Select a comparator"];

  const inputBase =
    "h-11 w-full rounded-lg border-2 border-slate-300 bg-white px-4 text-sm font-medium outline-none transition focus:ring-2";

  const renderValue = () => {
    if (row.comparator?.includes("empty")) return null;

    const isBetween = row.comparator === "between";

    if (meta?.type === "enum") {
      return (
        <Dropdown
          value={row.value || ""}
          placeholder="Choose value"
          options={meta.options}
          onChange={(value) => onChange({ ...row, value })}
        />
      );
    }

    if (type === "date") {
      if (isBetween) {
        return (
          <div className="flex items-center gap-3">
            <input
              type="date"
              className={inputBase}
              value={row.value || ""}
              onChange={(event) => onChange({ ...row, value: event.target.value })}
            />
            <span className="text-sm font-semibold text-slate-600 whitespace-nowrap">to</span>
            <input
              type="date"
              className={inputBase}
              value={row.value2 || ""}
              onChange={(event) => onChange({ ...row, value2: event.target.value })}
            />
          </div>
        );
      }
      return (
        <input
          type="date"
          className={inputBase}
          value={row.value || ""}
          onChange={(event) => onChange({ ...row, value: event.target.value })}
        />
      );
    }

    if (type === "number") {
      if (isBetween) {
        return (
          <div className="flex items-center gap-3">
            <input
              type="number"
              inputMode="decimal"
              className={inputBase}
              value={row.value || ""}
              onChange={(event) => onChange({ ...row, value: event.target.value })}
            />
            <span className="text-sm font-semibold text-slate-600 whitespace-nowrap">to</span>
            <input
              type="number"
              inputMode="decimal"
              className={inputBase}
              value={row.value2 || ""}
              onChange={(event) => onChange({ ...row, value2: event.target.value })}
            />
          </div>
        );
      }
      return (
        <input
          type="number"
          inputMode="decimal"
          className={inputBase}
          value={row.value || ""}
          onChange={(event) => onChange({ ...row, value: event.target.value })}
        />
      );
    }

    // text
    if (isBetween) {
      return (
        <div className="flex items-center gap-3">
          <input
            type="text"
            className={inputBase}
            value={row.value || ""}
            onChange={(event) => onChange({ ...row, value: event.target.value })}
          />
          <span className="text-sm font-semibold text-slate-600 whitespace-nowrap">to</span>
          <input
            type="text"
            className={inputBase}
            value={row.value2 || ""}
            onChange={(event) => onChange({ ...row, value2: event.target.value })}
          />
        </div>
      );
    }

    return (
      <input
        type="text"
        className={inputBase}
        value={row.value || ""}
        onChange={(event) => onChange({ ...row, value: event.target.value })}
      />
    );
  };

  return (
    <div className="relative flex flex-wrap items-start gap-6 p-6 rounded-xl border-2 border-slate-300 bg-white shadow-md min-h-[160px] mb-8" style={{ position: 'relative', zIndex: 1 }}>
        <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center text-center font-bold text-lg text-slate-700 bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg border-2 border-slate-300">
          {idx + 1}
        </div>

        <div className="flex-1 min-w-[280px]">
          <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Select a field</label>
          <Dropdown
            value={row.field}
            placeholder="Select a field"
            options={allowedFields.length > 0 ? allowedFields : Object.keys(fieldMeta)}
            onChange={(value) =>
              onChange({ id: row.id, field: value, comparator: "", value: "", value2: "" })
            }
            category="Quote"
          />
        </div>

        <div className="flex-1 min-w-[280px]">
          <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Select a comparator</label>
          <Dropdown
            value={row.comparator}
            placeholder="Select a comparator"
            options={cmpOptions}
            onChange={(value) => onChange({ ...row, comparator: value, value: "", value2: "" })}
          />
        </div>

        <div className="flex-1 min-w-[280px]">
          {row.field && (
            <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Value</label>
          )}
          <div style={{ minHeight: row.field ? '44px' : '0' }}>
            {renderValue()}
          </div>
        </div>

        <div className="flex gap-3 flex-shrink-0 items-start pt-8">
          <button
            type="button"
            className="h-12 w-12 rounded-lg border-2 text-xl font-bold active:scale-[.95] flex items-center justify-center transition shadow-sm"
            style={{ 
              borderColor: "#156372", 
              backgroundColor: "rgba(21, 99, 114, 0.1)", 
              color: "#156372" 
            }}
            onMouseOver={(event) => {
              const target = event.currentTarget;
              target.style.backgroundColor = "rgba(21, 99, 114, 0.2)";
              target.style.borderColor = "#0e4a5e";
            }}
            onMouseOut={(event) => {
              const target = event.currentTarget;
              target.style.backgroundColor = "rgba(21, 99, 114, 0.1)";
              target.style.borderColor = "#156372";
            }}
            title="Add filter"
            onClick={onAddNext}
          >
            +
          </button>

          <button
            type="button"
            className="text-sm font-medium text-red-600 hover:text-red-700 hover:underline cursor-pointer transition-colors"
            title="Remove filter"
            onClick={onRemove}
          >
            Delete
          </button>
        </div>
    </div>
  );
}

/* ---------- main ---------- */
export default function GeneralStep() {
  const nav = useNavigate();
  const { 
    dateRange, setDateRange, 
    reportBy, setReportBy, 
    groupBy, setGroupBy, 
    filters, setFilters,
    modules 
  } = useReportWizard();

  // Custom date picker state
  const [isCustomDatePickerOpen, setIsCustomDatePickerOpen] = useState(false);
  const [customStartDate, setCustomStartDate] = useState(new Date());
  const [customEndDate, setCustomEndDate] = useState(new Date());
  const [startCalendarMonth, setStartCalendarMonth] = useState(new Date());
  const [endCalendarMonth, setEndCalendarMonth] = useState(new Date());

  // Generate field metadata based on selected modules
  const fieldMeta = useMemo(() => generateFieldMeta(modules), [modules]);
  const allFields = useMemo(() => Object.keys(fieldMeta), [fieldMeta]);

  // Get parent module name for dynamic description
  const parentModule = modules?.[0]?.parent || "Quote";
  
  // Get date fields for Report By options (exclude "Quote" as it's only a category header)
  const dateFields = useMemo(() => {
    return allFields.filter((field) => fieldMeta[field]?.type === "date" && field !== "Quote");
  }, [allFields, fieldMeta]);

  // Get all fields for Group By options (excluding date fields and "Quote" as it's only a category header)
  const groupByFields = useMemo(() => {
    return allFields.filter((field) => {
      const meta = fieldMeta[field];
      return meta && (meta.type === "text" || meta.type === "enum") && field !== "Quote";
    });
  }, [allFields, fieldMeta]);

  // Allowed fields for Advanced Filters dropdown
  const allowedFilterFields = useMemo(() => {
    return [
      "Status",
      "Quote Date",
      "Expiry Date",
      "Quote#",
      "Quote Amount",
      "Sales person",
      "Project Name",
      "Currency",
      "Customer Name",
      "Billing Country",
      "Shipping Country"
    ].filter((field) => field in fieldMeta);
  }, [fieldMeta]);

  // Initialize filters if empty or invalid (only on mount) - start with empty array
  useEffect(() => {
    if (!filters || !Array.isArray(filters)) {
      setFilters([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateRow = (i: number, next: ReportFilterRow) => {
    const updated = filters.map((row, idx) => (idx === i ? next : row));
    setFilters(updated);
  };

  const addRowAfter = (i: number) => {
    const newFilters = [...filters];
    const newRow: ReportFilterRow = {
      id: crypto.randomUUID(),
      field: "",
      comparator: "",
      value: "",
      value2: "",
    };
    newFilters.splice(i + 1, 0, newRow);
    setFilters(newFilters);
  };

  const removeRow = (i: number) => {
    const newFilters = filters.filter((_, idx) => idx !== i);
    if (newFilters.length === 0) {
      setFilters([]);
    } else {
      setFilters(newFilters);
    }
  };

  const card =
    "w-full rounded-xl border-2 border-slate-200 bg-white shadow-[0_10px_28px_rgba(17,24,39,0.08)]";
  const label = "text-[12px] font-semibold text-slate-600";
  const select =
    "h-11 w-full rounded-lg border-2 border-slate-300 bg-white px-4 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

  // Check if filters are empty (only empty row with no field selected)
  const hasActiveFilters = filters.some((row) => row.field);

  // Calendar helper functions
  const getDaysInMonth = (date: Date): CalendarDay[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days: CalendarDay[] = [];
    
    // Add previous month's trailing days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: prevMonthLastDay - i,
        month: "prev",
        fullDate: new Date(year, month - 1, prevMonthLastDay - i)
      });
    }
    
    // Add current month's days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: i,
        month: "current",
        fullDate: new Date(year, month, i)
      });
    }
    
    // Add next month's leading days to fill the grid
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        date: i,
        month: "next",
        fullDate: new Date(year, month + 1, i)
      });
    }
    
    return days;
  };

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const parseDateString = (dateString: string): Date | null => {
    if (!dateString) return null;
    const parts = dateString.split('-');
    return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  };

  const handleDateRangeChange = (value: string) => {
    if (value === "Custom") {
      setIsCustomDatePickerOpen(true);
    } else {
      setDateRange(value);
    }
  };

  const handleApplyCustomDate = () => {
    setDateRange(`Custom: ${formatDate(customStartDate)} to ${formatDate(customEndDate)}`);
    setIsCustomDatePickerOpen(false);
  };

  const handlePredefinedRange = (range: string) => {
    setDateRange(range);
    setIsCustomDatePickerOpen(false);
  };

  return (
    <div className="min-h-screen bg-white px-5 py-4 pb-20">
      <div className="text-[18px] font-semibold text-slate-900 pb-3 border-b border-slate-200 mb-4">
        New Custom Report
      </div>

      <div className="mb-4">
        <WizardNav />
      </div>

      <div className="mt-4 flex flex-col gap-4 max-w-[1000px]" style={{ position: 'relative', overflow: 'visible' }}>
        {/* Date Range */}
        <div className={`${card} p-5`}>
          <div className="mb-3">
            <label className={label}>Date Range</label>
          </div>
          <div className="relative">
            <svg 
              width="16" 
              height="16" 
              viewBox="0 0 16 16" 
              fill="none" 
              style={{ 
                position: "absolute", 
                left: "14px", 
                top: "50%", 
                transform: "translateY(-50%)",
                pointerEvents: "none"
              }}
            >
              <rect x="2" y="3" width="12" height="11" rx="1" stroke="#6b7280" strokeWidth="1.5" fill="none"/>
              <path d="M2 6h12M5 3V1M11 3V1" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <select 
              className={`${select} pl-10`} 
              value={dateRange.startsWith("Custom:") ? "Custom" : dateRange} 
              onChange={(event) => handleDateRangeChange(event.target.value)}
            >
              <option>Today</option>
              <option>This Week</option>
              <option>This Month</option>
              <option>This Quarter</option>
              <option>This Year</option>
              <option>Yesterday</option>
              <option>Previous Week</option>
              <option>Previous Month</option>
              <option>Previous Quarter</option>
              <option>Previous Year</option>
              <option>Custom</option>
            </select>
          </div>
        </div>

        {/* Report By */}
        <div className={`${card} p-5`}>
          <div className="mb-3">
            <label className={label}>Report By</label>
          </div>
          <Dropdown
            value={reportBy || ""}
            placeholder="Select a field"
            options={dateFields.length > 0 ? dateFields : ["Quote Date", "Expiry Date"]}
            onChange={(value) => setReportBy(value)}
            category={parentModule}
          />
        </div>

        {/* Group By */}
        <div className={`${card} p-5`}>
          <div className="mb-3">
            <label className={label}>Group By</label>
          </div>
          <Dropdown
            value={groupBy || "None"}
            placeholder="None"
            options={groupByFields.length > 0 ? ["None", ...groupByFields] : ["None", "Customer Name", "Sales person", "Currency"]}
            onChange={(value) => setGroupBy(value)}
            category={parentModule}
          />
        </div>

        {/* Advanced Filters */}
        <div className={`${card} p-6`} style={{ position: 'relative', overflow: 'visible' }}>
          <div className="mb-4">
            <label className="text-sm font-semibold text-slate-900 mb-2 block">Advanced Filters</label>
            <span className="text-sm text-slate-600">
              Use advanced filters to filter the report based on the fields of <b className="font-semibold text-slate-800">{parentModule}</b>.
            </span>
          </div>

          {filters.length === 0 ? (
            <button
              type="button"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg shadow-sm hover:shadow-md transition"
              style={{ background: ACCENT }}
              onClick={() => {
                // Add first filter row
                const newRow: ReportFilterRow = {
                  id: crypto.randomUUID(),
                  field: "",
                  comparator: "",
                  value: "",
                  value2: "",
                };
                setFilters([newRow]);
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 3v10M3 8h10" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Add Filters
            </button>
          ) : (
            <>
              <div className="flex flex-col gap-8 overflow-visible pb-6" style={{ minHeight: '200px', position: 'relative' }}>
                {filters.map((row, i) => (
                  <FilterRow
                    key={row.id}
                    idx={i}
                    row={row}
                    fieldMeta={fieldMeta}
                    allowedFields={allowedFilterFields}
                    onChange={(next) => updateRow(i, next)}
                    onAddNext={() => addRowAfter(i)}
                    onRemove={() => removeRow(i)}
                  />
                ))}
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg shadow-sm hover:shadow-md transition"
                style={{ background: ACCENT }}
                onClick={() => {
                  // Add new filter row at the end
                  addRowAfter(filters.length - 1);
                }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 3v10M3 8h10" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                Add More
              </button>
            </>
          )}
        </div>
      </div>

      {/* Custom Date Range Picker Modal */}
      {isCustomDatePickerOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]"
          onClick={() => setIsCustomDatePickerOpen(false)}
        >
          <div 
            className="bg-white rounded-lg shadow-xl w-[90%] max-w-[900px] max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Date Range</h3>
              
              <div className="flex gap-6">
                {/* Left Panel - Predefined Ranges */}
                <div className="w-48 flex-shrink-0">
                  <div className="space-y-1">
                    {["Today", "This Week", "This Month", "This Quarter", "This Year", "Yesterday", "Previous Week", "Previous Month", "Previous Quarter", "Previous Year"].map((range) => (
                      <button
                        key={range}
                        type="button"
                        onClick={() => handlePredefinedRange(range)}
                        className={`w-full text-left px-3 py-2 rounded text-sm transition ${
                          dateRange === range
                            ? "text-white"
                            : "text-slate-700 hover:bg-slate-100"
                        }`}
                        style={dateRange === range ? { backgroundColor: "#156372" } : {}}
                      >
                        {range}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {}}
                      className="w-full text-left px-3 py-2 rounded text-sm bg-slate-100 text-slate-700 font-medium"
                    >
                      Custom
                    </button>
                  </div>
                </div>

                {/* Right Panel - Custom Date Selection */}
                <div className="flex-1">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    {/* Start Date */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-2">Start Date</label>
                      <div className="relative">
                        <svg 
                          width="16" 
                          height="16" 
                          viewBox="0 0 16 16" 
                          fill="none" 
                          style={{ 
                            position: "absolute", 
                            left: "12px", 
                            top: "50%", 
                            transform: "translateY(-50%)",
                            pointerEvents: "none"
                          }}
                        >
                          <rect x="2" y="3" width="12" height="11" rx="1" stroke="#6b7280" strokeWidth="1.5" fill="none"/>
                          <path d="M2 6h12M5 3V1M11 3V1" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                        <input
                          type="date"
                          value={formatDate(customStartDate)}
                          onChange={(event) => {
                            const nextDate = parseDateString(event.target.value);
                            if (nextDate) {
                              setCustomStartDate(nextDate);
                            }
                          }}
                          className="h-10 w-full rounded-lg border-2 border-slate-300 bg-white pl-10 pr-4 text-sm font-medium text-slate-900 outline-none transition focus:ring-2"
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

                    {/* End Date */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-2">End Date</label>
                      <div className="relative">
                        <svg 
                          width="16" 
                          height="16" 
                          viewBox="0 0 16 16" 
                          fill="none" 
                          style={{ 
                            position: "absolute", 
                            left: "12px", 
                            top: "50%", 
                            transform: "translateY(-50%)",
                            pointerEvents: "none"
                          }}
                        >
                          <rect x="2" y="3" width="12" height="11" rx="1" stroke="#6b7280" strokeWidth="1.5" fill="none"/>
                          <path d="M2 6h12M5 3V1M11 3V1" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                        <input
                          type="date"
                          value={formatDate(customEndDate)}
                          onChange={(event) => {
                            const nextDate = parseDateString(event.target.value);
                            if (nextDate) {
                              setCustomEndDate(nextDate);
                            }
                          }}
                          className="h-10 w-full rounded-lg border-2 border-slate-300 bg-white pl-10 pr-4 text-sm font-medium text-slate-900 outline-none transition focus:ring-2"
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
                  </div>

                  {/* Calendar Grids */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Start Date Calendar */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <button
                          type="button"
                          onClick={() => {
                            const newDate = new Date(startCalendarMonth);
                            newDate.setMonth(newDate.getMonth() - 1);
                            setStartCalendarMonth(newDate);
                          }}
                          className="p-1 hover:bg-slate-100 rounded text-slate-600"
                        >
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                        <div className="flex items-center gap-2">
                          <select
                            value={startCalendarMonth.toLocaleDateString("en-US", { month: "short" })}
                            onChange={(e) => {
                              const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                              const monthIndex = monthNames.indexOf(e.target.value);
                              const newDate = new Date(startCalendarMonth);
                              newDate.setMonth(monthIndex);
                              setStartCalendarMonth(newDate);
                            }}
                            className="text-sm font-semibold text-slate-900 border-none outline-none bg-transparent"
                          >
                            {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map(m => (
                              <option key={m} value={m}>{m}</option>
                            ))}
                          </select>
                          <select
                            value={startCalendarMonth.getFullYear()}
                            onChange={(e) => {
                              const newDate = new Date(startCalendarMonth);
                              newDate.setFullYear(parseInt(e.target.value));
                              setStartCalendarMonth(newDate);
                            }}
                            className="text-sm font-semibold text-slate-900 border-none outline-none bg-transparent"
                          >
                            {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map(year => (
                              <option key={year} value={year}>{year}</option>
                            ))}
                          </select>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const newDate = new Date(startCalendarMonth);
                            newDate.setMonth(newDate.getMonth() + 1);
                            setStartCalendarMonth(newDate);
                          }}
                          className="p-1 hover:bg-slate-100 rounded text-slate-600"
                        >
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                      </div>
                      <div className="grid grid-cols-7 gap-1 mb-2">
                        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                          <div key={day} className="text-xs font-semibold text-center py-1 text-slate-600">
                            {day}
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-7 gap-1">
                        {getDaysInMonth(startCalendarMonth).map((day, idx) => {
                          const isSelected = day.month === "current" &&
                            customStartDate &&
                            day.fullDate.toDateString() === customStartDate.toDateString();
                          const isCurrentMonth = day.month === "current";
                          
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                if (isCurrentMonth) {
                                  setCustomStartDate(day.fullDate);
                                }
                              }}
                              className={`text-sm py-2 rounded transition-colors ${
                                !isCurrentMonth
                                  ? "text-slate-300 cursor-default"
                                  : isSelected
                                  ? "bg-blue-500 text-white font-semibold"
                                  : "text-slate-900 hover:bg-slate-100"
                              }`}
                            >
                              {day.date}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* End Date Calendar */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <button
                          type="button"
                          onClick={() => {
                            const newDate = new Date(endCalendarMonth);
                            newDate.setMonth(newDate.getMonth() - 1);
                            setEndCalendarMonth(newDate);
                          }}
                          className="p-1 hover:bg-slate-100 rounded text-slate-600"
                        >
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                        <div className="flex items-center gap-2">
                          <select
                            value={endCalendarMonth.toLocaleDateString("en-US", { month: "short" })}
                            onChange={(e) => {
                              const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                              const monthIndex = monthNames.indexOf(e.target.value);
                              const newDate = new Date(endCalendarMonth);
                              newDate.setMonth(monthIndex);
                              setEndCalendarMonth(newDate);
                            }}
                            className="text-sm font-semibold text-slate-900 border-none outline-none bg-transparent"
                          >
                            {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map(m => (
                              <option key={m} value={m}>{m}</option>
                            ))}
                          </select>
                          <select
                            value={endCalendarMonth.getFullYear()}
                            onChange={(e) => {
                              const newDate = new Date(endCalendarMonth);
                              newDate.setFullYear(parseInt(e.target.value));
                              setEndCalendarMonth(newDate);
                            }}
                            className="text-sm font-semibold text-slate-900 border-none outline-none bg-transparent"
                          >
                            {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map(year => (
                              <option key={year} value={year}>{year}</option>
                            ))}
                          </select>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const newDate = new Date(endCalendarMonth);
                            newDate.setMonth(newDate.getMonth() + 1);
                            setEndCalendarMonth(newDate);
                          }}
                          className="p-1 hover:bg-slate-100 rounded text-slate-600"
                        >
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                      </div>
                      <div className="grid grid-cols-7 gap-1 mb-2">
                        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                          <div key={day} className="text-xs font-semibold text-center py-1 text-slate-600">
                            {day}
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-7 gap-1">
                        {getDaysInMonth(endCalendarMonth).map((day, idx) => {
                          const isSelected = day.month === "current" &&
                            customEndDate &&
                            day.fullDate.toDateString() === customEndDate.toDateString();
                          const isCurrentMonth = day.month === "current";
                          
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                if (isCurrentMonth) {
                                  setCustomEndDate(day.fullDate);
                                }
                              }}
                              className={`text-sm py-2 rounded transition-colors ${
                                !isCurrentMonth
                                  ? "text-slate-300 cursor-default"
                                  : isSelected
                                  ? "bg-blue-500 text-white font-semibold"
                                  : "text-slate-900 hover:bg-slate-100"
                              }`}
                            >
                              {day.date}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsCustomDatePickerOpen(false)}
                  className="h-9 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 hover:bg-slate-50 active:scale-[.98]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplyCustomDate}
                  className="h-9 rounded-lg px-4 text-sm font-semibold text-white shadow-md hover:brightness-95 active:scale-[.98]"
                  style={{ background: ACCENT }}
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom buttons */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-5 py-4 flex items-center gap-2 z-50">
        <button
          type="button"
          onClick={() => nav("/reports/new/columns")}
          className="h-9 rounded-lg px-4 text-sm font-semibold text-white shadow-md hover:brightness-95 active:scale-[.98]"
          style={{ background: ACCENT }}
        >
          Next
        </button>
        <button
          type="button"
          onClick={() => nav(-1)}
          className="h-9 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 hover:bg-slate-50 active:scale-[.98]"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
