import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Plus, Search, X } from "lucide-react";

type DropdownOption = {
  value: string;
  label: string;
};

type SearchableDropdownProps = {
  value: string;
  options: DropdownOption[];
  placeholder?: string;
  accentColor?: string;
  onChange: (value: string) => void;
  showClear?: boolean;
  onClear?: () => void;
  disabled?: boolean;
};

export default function SearchableDropdown({
  value,
  options,
  placeholder = "Select an option",
  accentColor = "#475569",
  onChange,
  showClear = false,
  onClear,
  disabled = false,
}: SearchableDropdownProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isOpen]);

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value),
    [options, value]
  );

  const filteredOptions = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) return options;

    return options.filter((option) => {
      return (
        option.label.toLowerCase().includes(normalizedSearch) ||
        option.value.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [options, searchTerm]);

  const clearSelection = () => {
    if (onClear) {
      onClear();
      return;
    }
    onChange("");
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        disabled={disabled}
        className={`flex h-10 w-full items-center gap-2 rounded-md border bg-white px-3 text-sm transition-colors ${
          disabled ? "cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400" : "border-gray-300"
        }`}
        style={isOpen && !disabled ? { borderColor: accentColor, boxShadow: `0 0 0 1px ${accentColor}` } : undefined}
        onClick={() => {
          if (disabled) return;
          setIsOpen((prev) => !prev);
          setSearchTerm("");
        }}
      >
        <span className={`min-w-0 flex-1 truncate text-left ${selectedOption ? "text-gray-900" : "text-gray-400"}`}>
          {selectedOption?.label || placeholder}
        </span>
        {showClear && value ? (
          <span
            className="inline-flex h-5 w-5 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            onClick={(event) => {
              event.stopPropagation();
              clearSelection();
            }}
          >
            <Plus size={14} className="rotate-45" />
          </span>
        ) : null}
        <ChevronDown size={16} className={`shrink-0 text-gray-500 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen ? (
        <div className="absolute left-0 right-0 top-full z-[2500] mt-2 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="border-b border-gray-100 p-2">
            <div className="flex items-center gap-2 rounded-md border border-gray-200 px-2 py-2">
              <Search size={14} className="text-gray-400" />
              <input
                autoFocus
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search..."
                className="w-full border-none bg-transparent text-sm outline-none"
              />
              {searchTerm ? (
                <button
                  type="button"
                  className="text-gray-400 hover:text-gray-600"
                  onClick={() => setSearchTerm("")}
                >
                  <X size={14} />
                </button>
              ) : null}
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto py-1">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">No options found.</div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = option.value === value;
                return (
                  <button
                    key={`${option.value}-${option.label}`}
                    type="button"
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                      setSearchTerm("");
                    }}
                  >
                    <span className="truncate">{option.label}</span>
                    {isSelected ? <Check size={14} style={{ color: accentColor }} /> : null}
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
