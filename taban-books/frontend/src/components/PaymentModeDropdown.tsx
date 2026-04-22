import React, { useState, useEffect, useRef } from "react";
import { ChevronDown, Search, Check, Settings, X, Plus } from "lucide-react";
import { paymentModesAPI } from "../services/api";
import { getPaymentModeLabel } from "../utils/paymentModes";

interface PaymentMode {
    _id: string; // Changed from id to _id for MongoDB compatibility
    name: string;
    isDefault?: boolean;
    isActive?: boolean;
}

interface PaymentModeDropdownProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
}

export default function PaymentModeDropdown({
    value,
    onChange,
    placeholder = "Select Payment Mode",
    className = "",
    disabled = false
}: PaymentModeDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [modes, setModes] = useState<PaymentMode[]>([]);
    const [isConfigureModalOpen, setIsConfigureModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Configuration modal state
    const [draftModes, setDraftModes] = useState<PaymentMode[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isConfigureModalOpen) {
            setDraftModes([...modes]);
        }
    }, [isConfigureModalOpen, modes]);

    useEffect(() => {
        loadPaymentModes();
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const loadPaymentModes = async () => {
        setIsLoading(true);
        try {
            const response = await paymentModesAPI.getAll();
            if (response && response.success) {
                if (response.data.length === 0) {
                    await paymentModesAPI.seed();
                    const retryResponse = await paymentModesAPI.getAll();
                    setModes(retryResponse.data);
                } else {
                    setModes(response.data);
                }
            }
        } catch (error) {
            console.error("Error loading payment modes:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddNewDraftMode = () => {
        const newMode: PaymentMode = {
            _id: `temp_${Date.now()}`,
            name: "",
            isActive: true,
            isDefault: draftModes.length === 0
        };
        setDraftModes([...draftModes, newMode]);
    };

    const handleUpdateDraftMode = (id: string, name: string) => {
        setDraftModes(draftModes.map(m => m._id === id ? { ...m, name } : m));
    };

    const handleSetDraftDefault = (id: string) => {
        setDraftModes(draftModes.map(m => ({
            ...m,
            isDefault: m._id === id
        })));
    };

    const handleSaveConfiguration = async () => {
        setIsSaving(true);
        try {
            // This is a bit complex as we need to figure out which are new, which are updated, and which are deleted
            // For simplicity and speed as requested, we'll process them

            // 1. Identify deleted
            const currentIds = new Set(draftModes.map(m => m._id));
            const toDelete = modes.filter(m => !currentIds.has(m._id));
            for (const m of toDelete) {
                await paymentModesAPI.delete(m._id);
            }

            // 2. Identify new and updated
            for (const m of draftModes) {
                if (m.name.trim() === "") continue;

                if (m._id.startsWith('temp_')) {
                    await paymentModesAPI.create({ name: m.name, isDefault: m.isDefault });
                } else {
                    await paymentModesAPI.update(m._id, { name: m.name, isDefault: m.isDefault });
                }
            }

            await loadPaymentModes();
            setIsConfigureModalOpen(false);
        } catch (error) {
            console.error("Error saving payment modes:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancelConfiguration = () => {
        setIsConfigureModalOpen(false);
    };

    const filteredModes = modes
        .filter((mode) => mode.isActive)
        .filter((mode) => mode.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const selectedValue = value ? getPaymentModeLabel(value) : "";

    return (
        <>
            <div className={`relative w-full ${className}`} ref={dropdownRef}>
                <div
                    className={`flex items-center justify-between px-3 py-1 border border-gray-300 rounded text-sm bg-white cursor-pointer hover:border-gray-400 transition-colors min-h-[30px] ${disabled ? "bg-gray-100 cursor-not-allowed opacity-60" : ""}`}
                    onClick={() => !disabled && setIsOpen(!isOpen)}
                >
                    <span className={value ? "text-gray-900" : "text-gray-400"}>
                        {selectedValue || placeholder}
                    </span>
                    <ChevronDown
                        size={14}
                        className={`text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""
                            }`}
                    />
                </div>

                {isOpen && (
                    <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-gray-200 rounded shadow-xl z-[1000] overflow-hidden">
                        <div className="p-2 border-b border-gray-100">
                            <div className="flex items-center gap-2 border border-gray-200 rounded px-2 py-1">
                                <Search size={14} className="text-gray-400" />
                                <input
                                    autoFocus
                                className="w-full outline-none text-sm"
                                    placeholder="Search"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                />
                            </div>
                        </div>

                        <div className="max-h-60 overflow-y-auto py-1">
                            {isLoading ? (
                                <div className="px-4 py-8 text-center text-gray-500 text-sm">Loading...</div>
                            ) : filteredModes.length > 0 ? (
                                filteredModes.map((mode) => (
                                    <div
                                        key={mode._id}
                                        className="px-4 py-1.5 text-sm cursor-pointer flex items-center justify-between transition-colors"
                                        style={{
                                            backgroundColor:
                                                selectedValue === mode.name ? "#2563eb" : "transparent",
                                            color: selectedValue === mode.name ? "white" : "#374151",
                                        }}
                                        onClick={() => {
                                            onChange(mode.name);
                                            setIsOpen(false);
                                            setSearchTerm("");
                                        }}
                                    >
                                        <span style={{ fontWeight: selectedValue === mode.name ? "500" : "400" }}>
                                            {mode.name}
                                        </span>
                                        {selectedValue === mode.name && <Check size={14} />}
                                    </div>
                                ))
                            ) : (
                                <div className="px-4 py-8 text-center text-gray-500 text-sm">
                                    No payment modes found
                                </div>
                            )}
                        </div>

                        <div
                            className="px-4 py-2.5 border-t border-gray-100 flex items-center gap-2 text-sm font-medium text-blue-600 cursor-pointer hover:bg-gray-50 transition-colors"
                            onClick={() => {
                                setIsConfigureModalOpen(true);
                                setIsOpen(false);
                            }}
                        >
                            <Settings size={14} />
                            <span>Configure Payment Mode</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Configuration Modal */}
            {isConfigureModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
                    <div className="bg-white rounded shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col relative">
                        {/* Header */}
                        <div className="flex items-center justify-between p-5 border-b border-gray-100">
                            <h2 className="text-[17px] font-medium text-gray-800">Payment Mode</h2>
                            <button
                                onClick={handleCancelConfiguration}
                                className="p-1 hover:bg-gray-100 rounded-md text-red-500 transition-colors border border-red-200"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Body - List of modes */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {draftModes.map((mode) => (
                                <div key={mode._id} className="flex items-center gap-3">
                                    <input
                                        type="text"
                                        value={mode.name}
                                        onChange={(e) => handleUpdateDraftMode(mode._id, e.target.value)}
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none text-[15px] text-gray-700 h-10"
                                        placeholder="Payment mode name"
                                    />
                                    {mode.isDefault ? (
                                        <div className="px-2 py-1 bg-green-600 text-white text-[10px] font-bold rounded">
                                            Default
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => handleSetDraftDefault(mode._id)}
                                            className="text-[11px] text-blue-600 hover:underline font-medium"
                                        >
                                            Set Default
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setDraftModes(draftModes.filter(m => m._id !== mode._id))}
                                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ))}

                            <button
                                onClick={handleAddNewDraftMode}
                                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium mt-6 group"
                            >
                                <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center text-white p-0.5 group-hover:bg-blue-700">
                                    <Plus size={14} strokeWidth={3} />
                                </div>
                                Add New
                            </button>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center gap-3 px-6 py-5 border-t border-gray-100">
                            <button
                                onClick={handleSaveConfiguration}
                                disabled={isSaving}
                                className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:bg-blue-300 transition-colors min-w-[80px]"
                            >
                                {isSaving ? "Saving..." : "Save"}
                            </button>
                            <button
                                onClick={handleCancelConfiguration}
                                disabled={isSaving}
                                className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded hover:bg-gray-50 transition-colors min-w-[80px]"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
