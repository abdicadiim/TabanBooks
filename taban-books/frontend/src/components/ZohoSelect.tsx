import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

type ZohoSelectProps = {
  value: string;
  options: any[];
  onChange: (value: string) => void;
  placeholder?: string;
  direction?: "up" | "down";
  groupBy?: string;
  className?: string;
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
}: ZohoSelectProps) {
  const [open, setOpen] = useState(false);
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

  const groupedOptions = useMemo(() => {
    if (!groupBy) {
      return [{ group: "", items: options || [] }];
    }

    const groups = new Map<string, any[]>();
    (options || []).forEach((option) => {
      const groupName = String(option?.[groupBy] || "Other").trim() || "Other";
      if (!groups.has(groupName)) {
        groups.set(groupName, []);
      }
      groups.get(groupName)!.push(option);
    });

    return Array.from(groups.entries()).map(([group, items]) => ({ group, items }));
  }, [groupBy, options]);

  const selectedOption = useMemo(
    () => (options || []).find((option) => getOptionValue(option) === String(value || "")) || null,
    [options, value]
  );

  const dropdownPlacement = direction === "up" ? "bottom-full mb-2" : "top-full mt-1";

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
                      className={`flex w-full items-center px-3 py-2 text-left text-sm hover:bg-slate-50 ${
                        isSelected ? "bg-slate-100 text-slate-900" : "text-slate-700"
                      }`}
                      onClick={() => {
                        onChange(optionValue);
                        setOpen(false);
                      }}
                    >
                      <span className="truncate">{getOptionLabel(option)}</span>
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
