import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { accountantAPI } from "../../../../services/api";

interface BulkUpdateModalProps {
    onClose: () => void;
    onUpdate: (field: string, value: any) => void;
    selectedCount: number;
}

const BulkUpdateModal = ({ onClose, onUpdate, selectedCount }: BulkUpdateModalProps) => {
    const [field, setField] = useState("");
    const [value, setValue] = useState("");
    const [accounts, setAccounts] = useState<any[]>([]);

    useEffect(() => {
        const fetchAccounts = async () => {
            try {
                const response = await accountantAPI.getAccounts();
                setAccounts(response.data || []);
            } catch (error) {
                console.error("Failed to fetch accounts", error);
            }
        };
        fetchAccounts();
    }, []);

    const fields = [
        { label: "Sales Description", value: "salesDescription", type: "text" },
        { label: "Selling Price", value: "sellingPrice", type: "number" },
        { label: "Sales Account", value: "salesAccount", type: "account" },
        { label: "Purchase Price", value: "costPrice", type: "number" },
        { label: "Purchase Account", value: "purchaseAccount", type: "account" },
        { label: "Inventory Account", value: "inventoryAccount", type: "account" },
        { label: "Purchase Description", value: "purchaseDescription", type: "text" },
        { label: "Inventory Valuation Method", value: "inventoryValuationMethod", type: "select", options: ["FIFO (First In First Out)", "LIFO (Last In First Out)", "Weighted Average"] }
    ];

    const selectedFieldConfig = fields.find(f => f.value === field);

    const renderInput = () => {
        if (!selectedFieldConfig) return <input disabled className="w-full px-4 py-2 border border-gray-200 rounded-md bg-gray-50" />;

        switch (selectedFieldConfig.type) {
            case "number":
                return (
                    <input
                        type="number"
                        step="0.01"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        className="w-full px-4 py-2 border border-blue-400 rounded-md text-sm focus:ring-4 focus:ring-blue-100 outline-none shadow-[0_0_10px_rgba(59,130,246,0.1)] transition-all"
                        placeholder="0.00"
                    />
                );
            case "account":
                return (
                    <select
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        className="w-full px-4 py-2 border border-blue-400 rounded-md text-sm focus:ring-4 focus:ring-blue-100 outline-none shadow-[0_0_10px_rgba(59,130,246,0.1)] transition-all"
                    >
                        <option value="">Select Account</option>
                        {accounts.map((acc: any) => (
                            <option key={acc.id || acc._id} value={acc.accountName}>
                                {acc.accountName}
                            </option>
                        ))}
                    </select>
                );
            case "select":
                return (
                    <select
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        className="w-full px-4 py-2 border border-blue-400 rounded-md text-sm focus:ring-4 focus:ring-blue-100 outline-none shadow-[0_0_10px_rgba(59,130,246,0.1)] transition-all"
                    >
                        <option value="">Select Option</option>
                        {selectedFieldConfig.options?.map((opt) => (
                            <option key={opt} value={opt}>
                                {opt}
                            </option>
                        ))}
                    </select>
                );
            default:
                return (
                    <input
                        type="text"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        className="w-full px-4 py-2 border border-blue-400 rounded-md text-sm focus:ring-4 focus:ring-blue-100 outline-none shadow-[0_0_10px_rgba(59,130,246,0.1)] transition-all"
                    />
                );
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[2000] backdrop-blur-[2px] animate-in fade-in duration-200">
            <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full mx-4 overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <h2 className="text-lg font-semibold text-slate-800">Bulk Update Items</h2>
                    <button onClick={onClose} className="rounded-full p-1 hover:bg-gray-200 transition-colors">
                        <X size={20} className="text-red-500" />
                    </button>
                </div>

                <div className="p-8">
                    <p className="text-sm text-slate-600 mb-6 font-medium">
                        Choose a field from the dropdown and update with new information.
                    </p>

                    <div className="flex gap-4 items-start mb-6">
                        <div className="flex-1">
                            <select
                                value={field}
                                onChange={(e) => {
                                    setField(e.target.value);
                                    setValue("");
                                }}
                                className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none bg-no-repeat bg-[right_1rem_center] transition-all"
                                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m2 4 4 4 4-4'/%3E%3C/svg%3E")` }}
                            >
                                <option value="">Select a field</option>
                                {fields.map(f => (
                                    <option key={f.value} value={f.value}>{f.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex-1">
                            {renderInput()}
                        </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-md border border-gray-100">
                        <p className="text-xs text-slate-500 leading-relaxed">
                            <span className="font-bold text-slate-700">Note:</span> All the {selectedCount} selected items will be updated with the new information and you cannot undo this action.
                        </p>
                    </div>
                </div>

                <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex gap-3">
                    <button
                        onClick={() => onUpdate(field, value)}
                        className="px-6 py-2 bg-blue-600 text-white rounded-md text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
                        disabled={!field || !value}
                    >
                        Update
                    </button>
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-white border border-gray-300 rounded-md text-sm font-semibold text-slate-700 hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BulkUpdateModal;
