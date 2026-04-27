import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search } from "lucide-react";

export type LocationOption = {
  id: string;
  label: string;
  isDefault?: boolean;
  type?: string;
};

interface LocationSelectDropdownProps {
  value?: string;
  options: LocationOption[];
  onSelect: (location: LocationOption) => void;
  placeholder?: string;
  className?: string;
}

export const LocationSelectDropdown: React.FC<LocationSelectDropdownProps> = ({
  value,
  options,
  onSelect,
  placeholder = "Select a location",
  className = "",
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [menuStyle, setMenuStyle] = useState<{ left: number; top: number; width: number } | null>(null);

  const selectedOption = useMemo(
    () =>
      options.find(
        (option) =>
          option.id === value || option.label.trim().toLowerCase() === String(value || "").trim().toLowerCase()
      ),
    [options, value]
  );

  const filteredOptions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return options;
    return options.filter((option) => option.label.toLowerCase().includes(term));
  }, [options, searchTerm]);

  useEffect(() => {
    if (!isOpen || !wrapperRef.current) return;

    const updateMenuPosition = () => {
      if (!wrapperRef.current) return;
      const rect = wrapperRef.current.getBoundingClientRect();
      setMenuStyle({
        left: rect.left,
        top: rect.bottom + 6,
        width: Math.max(rect.width, 210),
      });
    };

    updateMenuPosition();

    const handleScrollOrResize = () => updateMenuPosition();
    window.addEventListener("resize", handleScrollOrResize);
    window.addEventListener("scroll", handleScrollOrResize, true);

    return () => {
      window.removeEventListener("resize", handleScrollOrResize);
      window.removeEventListener("scroll", handleScrollOrResize, true);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;

      if (wrapperRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;

      setIsOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const toggleDropdown = () => {
    setIsOpen((prev) => {
      const next = !prev;
      if (next) {
        setSearchTerm("");
      }
      return next;
    });
  };

  return (
    <div ref={wrapperRef} className={`relative w-full ${className}`}>
      <button
        type="button"
        onClick={toggleDropdown}
        className={`flex h-10 w-full items-center justify-between gap-2 rounded-md border bg-white px-3 text-left text-sm outline-none transition-colors ${
          isOpen ? "border-[#156372]" : "border-gray-300"
        }`}
      >
        <span className={selectedOption ? "text-gray-900" : "text-gray-400"}>
          {selectedOption?.label || placeholder}
        </span>
        <ChevronDown
          size={14}
          className={`shrink-0 text-gray-400 transition-transform ${isOpen ? "rotate-180 text-[#156372]" : ""}`}
        />
      </button>

      {isOpen && menuStyle && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              className="fixed z-[13000] overflow-hidden rounded-lg bg-white shadow-[0_16px_36px_rgba(15,23,42,0.14)]"
              style={{
                left: menuStyle.left,
                top: menuStyle.top,
                width: menuStyle.width,
              }}
              onMouseDown={(event) => {
                event.stopPropagation();
              }}
            >
              <div className="border-b border-slate-200 bg-white p-2.5">
                <div className="flex items-center gap-2 rounded-md border border-[#156372] bg-white px-2.5 py-2 focus-within:border-[#156372]">
                  <Search size={14} className="shrink-0 text-slate-400" />
                  <input
                    type="text"
                    className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                    placeholder="Search"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    autoFocus
                  />
                </div>
              </div>

              <div className="max-h-[220px] overflow-y-auto bg-white p-1">
                {filteredOptions.length > 0 ? (
                  filteredOptions.map((option) => {
                    const isSelected = selectedOption?.id === option.id || selectedOption?.label === option.label;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => {
                          onSelect(option);
                          setIsOpen(false);
                        }}
                        className={`flex w-full items-center justify-between gap-3 rounded-md px-3 py-2.5 text-left text-sm transition-colors ${
                          isSelected ? "bg-[#f0fdfa] text-[#156372]" : "text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          {!isSelected ? <span className="text-slate-400">•</span> : null}
                          <span className="truncate font-medium">{option.label}</span>
                        </span>
                        {isSelected && <Check size={15} className="shrink-0 text-[#156372]" />}
                      </button>
                    );
                  })
                ) : (
                  <div className="px-3 py-4 text-sm text-slate-500">No locations found.</div>
                )}
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
};
