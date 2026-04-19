import React, { useState, useRef, useEffect } from "react";
import { Search, ChevronDown, Plus, Check, Trash2 } from "lucide-react";
import { useOrganizationBranding } from "../hooks/useOrganizationBranding";

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
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearchTerm("");
            }
        };
        if (isOpen) document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

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
                    className={`w-full h-10 px-3 border rounded-lg flex items-center transition-all outline-none ${disabled ? "bg-slate-50 border-gray-200 cursor-not-allowed opacity-70" : "bg-white"} ${isOpen ? "" : error ? "border-red-500 shadow-[0_0_0_1px_rgba(239,68,68,0.2)]" : disabled ? "" : "border-gray-200 hover:border-gray-300 shadow-sm"}`}
                    style={!disabled && isOpen ? {
                        borderColor: accentColor,
                        boxShadow: `0 0 0 2px ${accentColor}20`,
                        borderWidth: '1.5px'
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
                        className={`bg-transparent border-none outline-none w-full h-full text-sm ${disabled ? "cursor-not-allowed" : ""} ${value && !isOpen ? "text-slate-700 font-medium" : "text-slate-400"}`}
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
                                color: disabled ? "#94a3b8" : accentColor,
                                transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)'
                            }}
                        />
                    </div>
                </div>
            </div>

            {!disabled && isOpen && (
                <div className={`absolute ${direction === "up" ? "bottom-full mb-2" : "top-full mt-2"} left-0 right-0 bg-white border border-gray-100 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] z-[1000] flex flex-col max-h-[350px] overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top`}>
                    {/* Options List */}
                    <div className="overflow-y-auto flex-1 py-2 custom-scrollbar focus-within:ring-0">
                        {Object.entries(groupedOptions).map(([group, groupOpts]: [string, any]) => (
                            <div key={group}>
                                {group && groupOpts.length > 0 && (
                                    <div className="px-4 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
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
                                            className={`w-full px-4 py-2.5 text-[13px] text-left flex items-center transition-all group/item ${isSelected ? "" : "text-slate-600"}`}
                                            style={{
                                                backgroundColor: isSelected ? `#1b5e6a1A` : undefined,
                                                color: isSelected ? '#1b5e6a' : undefined,
                                                borderLeft: isSelected ? `4px solid #1b5e6a` : '4px solid transparent',
                                                fontWeight: isSelected ? 600 : 400
                                            }}
                                            onMouseEnter={(e) => {
                                                if (!isSelected) {
                                                    e.currentTarget.style.backgroundColor = '#1b5e6a';
                                                    e.currentTarget.style.color = 'white';
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (!isSelected) {
                                                    e.currentTarget.style.backgroundColor = '';
                                                    e.currentTarget.style.color = '';
                                                }
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
                                                        <Check size={14} className="flex-shrink-0 transition-colors" style={{ color: '#1b5e6a' }} />
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
                                className="w-full px-4 py-3 text-[13px] font-medium flex items-center gap-2 hover:bg-slate-50 transition-colors"
                                style={{ color: '#1b5e6a' }}
                            >
                                <Plus size={18} className="text-white rounded-full p-0.5" strokeWidth={3} style={{ backgroundColor: '#1b5e6a' }} />
                                {addNewLabel}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

