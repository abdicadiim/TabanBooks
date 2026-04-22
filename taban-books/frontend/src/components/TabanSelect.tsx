import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Search, ChevronDown, Plus, Check, Trash2 } from "lucide-react";
import { useOrganizationBranding } from "../hooks/useOrganizationBranding";

function toRgba(color: string, alpha: number) {
    const trimmed = (color || "").trim();
    const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(trimmed);
    if (!m) return color;
    let hex = m[1];
    if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

interface TabanSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: any[]; // Expecting array of objects with { name, type, ... } or strings
    placeholder?: string;
    onAddNew?: () => void;
    addNewLabel?: string;
    label?: string;
    required?: boolean;
    groupBy?: string;
    className?: string; // Additional classes for the container
    selectClassName?: string; // Additional classes for the button/select itself
    direction?: "up" | "down";
    onDelete?: (item: any) => void;
    error?: boolean;
    disabled?: boolean;
}

export default function TabanSelect({
    value,
    onChange,
    options,
    placeholder = "Select an option",
    onAddNew,
    addNewLabel = "+ Add New",
    label,
    required,
    groupBy,
    className = "",
    selectClassName = "",
    direction = "down",
    onDelete,
    error,
    disabled = false
}: TabanSelectProps) {
    const { accentColor } = useOrganizationBranding();
    const uiAccent = accentColor || "#3b82f6";
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const dropdownRef = useRef<HTMLDivElement>(null);
    const controlRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const [menuStyle, setMenuStyle] = useState<{ left: number; top: number; width: number } | null>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            const clickedAnchor = dropdownRef.current?.contains(target);
            const clickedMenu = menuRef.current?.contains(target);
            if (!clickedAnchor && !clickedMenu) {
                setIsOpen(false);
                setSearchTerm("");
            }
        };
        if (isOpen) document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

    const updateMenuPosition = () => {
        const el = controlRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const gap = 8; // matches `mt-2` / `mb-2`
        setMenuStyle({
            left: rect.left,
            top: direction === "up" ? rect.top - gap : rect.bottom + gap,
            width: rect.width,
        });
    };

    useEffect(() => {
        if (!isOpen || disabled) return;
        updateMenuPosition();
        const onScrollOrResize = () => updateMenuPosition();
        window.addEventListener("resize", onScrollOrResize);
        window.addEventListener("scroll", onScrollOrResize, true);
        return () => {
            window.removeEventListener("resize", onScrollOrResize);
            window.removeEventListener("scroll", onScrollOrResize, true);
        };
    }, [isOpen, disabled, direction]);

    useEffect(() => {
        if (disabled) {
            setIsOpen(false);
            setSearchTerm("");
        }
    }, [disabled]);

    const filteredOptions = options.filter(opt => {
        const name = typeof opt === 'string' ? opt : opt.displayName || opt.accountName || opt.name || "";
        return name.toLowerCase().includes(searchTerm.toLowerCase());
    });

    const groupedOptions = groupBy ? filteredOptions.reduce((acc: any, opt) => {
        // Capitalize key and replace underscores with spaces
        let key = opt[groupBy] || "Other";
        key = key.split('_').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');

        if (!acc[key]) acc[key] = [];
        acc[key].push(opt);
        return acc;
    }, {}) : { "": filteredOptions };

    return (
        <div className={`relative ${className} w-full`} ref={dropdownRef} aria-disabled={disabled}>
            {label && (
                <label className="text-[13px] font-medium text-slate-600 block mb-1.5">
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
            )}

            <div className={`relative w-full group/select`}>
                <div
                    ref={controlRef}
                    className={`w-full h-9 px-3 border rounded-md flex items-center transition-all outline-none ${disabled ? "bg-slate-50 border-gray-200 cursor-not-allowed opacity-70" : "bg-white"} ${isOpen ? "" : error ? "border-red-500 shadow-[0_0_0_1px_rgba(239,68,68,0.2)]" : disabled ? "" : "border-gray-300 hover:border-[#2f6f86] shadow-sm"}`}
                    style={!disabled && isOpen ? {
                        borderColor: uiAccent,
                        boxShadow: `0 0 0 1px ${toRgba(uiAccent, 0.18)}`,
                        borderWidth: "1.5px"
                    } : {}}
                >
                    <input
                        type="text"
                        value={isOpen ? searchTerm : (value || "")}
                        disabled={disabled}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            if (!isOpen) setIsOpen(true);
                        }}
                        onFocus={() => {
                            if (!disabled) setIsOpen(true);
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                            }
                        }}
                        placeholder={value || placeholder}
                        className={`bg-transparent border-none outline-none w-full h-full text-[13px] leading-none placeholder:text-slate-400 ${disabled ? "cursor-not-allowed" : ""} ${value && !isOpen ? "text-slate-700 font-medium" : "text-slate-400"}`}
                    />
                    <div className="flex items-center gap-1">
                        {value && !isOpen && !disabled && (
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); onChange(""); }}
                                className="p-1 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
                            >
                                <Plus size={14} className="rotate-45" />
                            </button>
                        )}
                        <ChevronDown
                            size={14}
                            className="transition-transform flex-shrink-0"
                            style={{
                                color: disabled ? "#94a3b8" : uiAccent,
                                transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)'
                            }}
                        />
                    </div>
                </div>
            </div>

            {!disabled && isOpen && menuStyle && typeof document !== "undefined" && createPortal(
                <div
                    ref={menuRef}
                    className={`fixed bg-white border border-[#d6dbe8] rounded-[14px] shadow-[0_16px_40px_rgba(15,23,42,0.14)] z-[10000] flex flex-col max-h-[350px] overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${direction === "up" ? "origin-bottom" : "origin-top"}`}
                    style={{
                        left: menuStyle.left,
                        top: menuStyle.top,
                        width: menuStyle.width,
                        transform: direction === "up" ? "translateY(-100%)" : undefined,
                    }}
                    >
                    {/* Options List */}
                    <div className="overflow-y-auto flex-1 py-2 custom-scrollbar focus-within:ring-0">
                        {Object.entries(groupedOptions).map(([group, groupOpts]: [string, any]) => (
                            <div key={group}>
                                {group && groupOpts.length > 0 && (
                                    <div className="px-4 py-2 text-[10px] font-bold text-slate-700 uppercase tracking-[0.16em]">
                                        {group}
                                    </div>
                                )}
                                {groupOpts.map((opt: any, idx: number) => {
                                    const name = typeof opt === 'string' ? opt : opt.displayName || opt.accountName || opt.name || "";
                                    const isSelected = value === name;
                                    return (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => {
                                                onChange(name);
                                                setIsOpen(false);
                                                setSearchTerm("");
                                            }}
                                            className={`w-full px-4 py-2.5 text-[13px] text-left flex items-center transition-colors group/item ${isSelected ? "" : "text-slate-600 hover:bg-[#eef8f9] hover:text-slate-900"}`}
                                            style={{
                                                backgroundColor: isSelected ? "#eef8f9" : "transparent",
                                                color: isSelected ? uiAccent : undefined,
                                                fontWeight: isSelected ? 600 : 400
                                            }}
                                        >
                                            <div className="flex items-center justify-between w-full">
                                                <span className="truncate ml-1">{name}</span>
                                                <div className="flex items-center gap-2">
                                                    {onDelete && (
                                                        <Trash2
                                                            size={14}
                                                            className={`transition-all cursor-pointer opacity-0 group-hover/item:opacity-100 ${isSelected ? "text-white/80 hover:text-white" : "text-slate-300 hover:text-white"}`}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onDelete(opt);
                                                            }}
                                                        />
                                                    )}
                                                    {isSelected && (
                                                        <Check size={14} className="flex-shrink-0 transition-colors" style={{ color: uiAccent }} />
                                                    )}
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        ))}
                        {filteredOptions.length === 0 && (
                            <div className="p-8 text-center text-[13px] text-slate-400">
                                No records found.
                            </div>
                        )}
                    </div>

                    {/* Add New Button */}
                    {onAddNew && (
                        <div className="border-t border-gray-100 bg-white sticky bottom-0">
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onAddNew();
                                    setIsOpen(false);
                                }}
                                className="w-full px-4 py-2.5 text-[13px] font-medium flex items-center gap-2 transition-colors"
                                style={{ color: uiAccent }}
                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#eef8f9"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                            >
                                <Plus size={18} className="text-white rounded-full p-0.5" strokeWidth={3} style={{ backgroundColor: uiAccent }} />
                                {addNewLabel}
                            </button>
                        </div>
                    )}
                </div>,
                document.body
            )}
        </div>
    );
}

