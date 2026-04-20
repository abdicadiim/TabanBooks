import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, ChevronUp, Search } from "lucide-react";

type ZohoSelectProps = {
  value: string;
  options: any[];
  onChange: (value: string) => void;
  placeholder?: string;
  direction?: "up" | "down";
  groupBy?: string;
  className?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  selectedVariant?: "default" | "blue";
  showSelectedCheck?: boolean;
};

const getOptionValue = (option: any) =>
  String(option?.id || option?._id || option?.value || option?.name || option?.accountName || "").trim();

const getOptionLabel = (option: any) =>
  String(option?.label || option?.name || option?.accountName || option?.title || getOptionValue(option) || "").trim();

export default function ZohoSelect({
  value,
  options,
  onChange,
  placeholder = "Select",
  direction = "down",
  groupBy,
  className = "",
  searchable = false,
  searchPlaceholder = "Search",
  selectedVariant = "default",
  showSelectedCheck = false,
}: ZohoSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    const term = String(search || "").trim().toLowerCase();
    if (!term) return options || [];
    return (options || []).filter((option) => {
      const label = getOptionLabel(option).toLowerCase();
      const val = getOptionValue(option).toLowerCase();
      return label.includes(term) || val.includes(term);
    });
  }, [options, search]);

  const groupedOptions = useMemo(() => {
    if (!groupBy) {
      return [{ group: "", items: filteredOptions || [] }];
    }

    const groups = new Map<string, any[]>();
    (filteredOptions || []).forEach((option) => {
      const groupName = String(option?.[groupBy] || "Other").trim() || "Other";
      if (!groups.has(groupName)) {
        groups.set(groupName, []);
      }
      groups.get(groupName)!.push(option);
    });

    return Array.from(groups.entries()).map(([group, items]) => ({ group, items }));
  }, [filteredOptions, groupBy]);

  const selectedOption = useMemo(
    () => (options || []).find((option) => getOptionValue(option) === String(value || "")) || null,
    [options, value]
  );

  const dropdownPlacement = direction === "up" ? "bottom-full mb-2" : "top-full mt-1";
  const selectedClasses =
    selectedVariant === "blue"
      ? "bg-[#3B82F6] text-white hover:bg-[#3B82F6]"
      : "bg-slate-100 text-slate-900";

  return (
    <div ref={wrapperRef} className="relative w-full">
      <button
        type="button"
        className={`flex h-full w-full items-center justify-between gap-2 ${className}`}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className={selectedOption ? "text-gray-700" : "text-gray-400"}>
          {selectedOption ? getOptionLabel(selectedOption) : placeholder}
        </span>
        {direction === "up" ? (
          <ChevronUp size={14} className="text-gray-400" />
        ) : (
          <ChevronDown size={14} className="text-gray-400" />
        )}
      </button>

      {open && (
        <div className={`absolute left-0 ${dropdownPlacement} z-[13000] w-full overflow-hidden rounded-md border border-gray-200 bg-white shadow-xl`}>
          {searchable && (
            <div className="border-b border-gray-100 bg-white px-3 py-2">
              <div className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-2 py-1.5">
                <Search size={14} className="text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
                />
              </div>
            </div>
          )}
          <div className="max-h-64 overflow-y-auto py-1">
            {groupedOptions.map(({ group, items }) => (
              <div key={group || "default"}>
                {group && (
                  <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    {group}
                  </div>
                )}
                {items.map((option) => {
                  const optionValue = getOptionValue(option);
                  const isSelected = String(value || "") === optionValue;
                  return (
                    <button
                      key={optionValue || getOptionLabel(option)}
                      type="button"
                      className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-slate-50 ${
                        isSelected ? selectedClasses : "text-slate-700"
                      }`}
                      onClick={() => {
                        onChange(optionValue);
                        setSearch("");
                        setOpen(false);
                      }}
                    >
                      <span className="truncate">{getOptionLabel(option)}</span>
                      {showSelectedCheck && isSelected && (
                        <Check size={16} className={selectedVariant === "blue" ? "text-white" : "text-slate-900"} />
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
