import React, { useState, useEffect } from "react";
import { X, ChevronDown, Check, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { createAccount } from "../accountantModel";
import {
    ACCOUNT_TYPE_LABELS,
    normalizeAccountTypeValue,
    resolveDefaultAccountTypeLabel,
} from "../chartOfAccountsConfig";

interface NewAccountModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreated: (account: any) => void;
    defaultType?: string;
}

export default function NewAccountModal({ isOpen, onClose, onCreated, defaultType }: NewAccountModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
    const [formData, setFormData] = useState({
        accountType: resolveDefaultAccountTypeLabel(defaultType),
        accountName: "",
        accountCode: "",
        description: "",
        isActive: true
    });

    useEffect(() => {
        if (defaultType) {
            setFormData(prev => ({
                ...prev,
                accountType: resolveDefaultAccountTypeLabel(defaultType),
            }));
        }
    }, [defaultType]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.accountType || !formData.accountName) {
            toast.error("Please fill in required fields");
            return;
        }

        setIsLoading(true);
        try {
            const result = await createAccount({
                ...formData,
                accountType: normalizeAccountTypeValue(formData.accountType)
            });
            if (result) {
                toast.success("Account created successfully");
                onCreated(result);
                onClose();
            }
        } catch (error: any) {
            toast.error(error.message || "Failed to create account");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <h3 className="text-lg font-bold text-slate-800">New Account</h3>
                    <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full transition-colors">
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Account Type */}
                    <div className="space-y-1.5">
                        <label className="text-[13px] font-semibold text-slate-700">
                            Account Type <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
                                className="w-full flex items-center justify-between px-3 py-2 border border-slate-200 rounded-md bg-white text-sm text-slate-700 hover:border-blue-400 transition-colors"
                            >
                                <span>{formData.accountType || "Select Type"}</span>
                                <ChevronDown size={16} className={`text-slate-400 transition-transform ${isTypeDropdownOpen ? "rotate-180" : ""}`} />
                            </button>

                            {isTypeDropdownOpen && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-y-auto z-[110] py-1">
                                    {ACCOUNT_TYPE_LABELS.map(type => (
                                        <button
                                            key={type}
                                            type="button"
                                            onClick={() => {
                                                setFormData(prev => ({ ...prev, accountType: type }));
                                                setIsTypeDropdownOpen(false);
                                            }}
                                            className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 transition-colors flex items-center justify-between ${formData.accountType === type ? "text-blue-600 bg-blue-50/50" : "text-slate-600"}`}
                                        >
                                            {type}
                                            {formData.accountType === type && <Check size={14} />}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Account Name */}
                    <div className="space-y-1.5">
                        <label className="text-[13px] font-semibold text-slate-700">
                            Account Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.accountName}
                            onChange={e => setFormData(prev => ({ ...prev, accountName: e.target.value }))}
                            className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            placeholder="e.g. Sales Income"
                        />
                    </div>

                    {/* Account Code */}
                    <div className="space-y-1.5">
                        <label className="text-[13px] font-semibold text-slate-700">
                            Account Code
                        </label>
                        <input
                            type="text"
                            value={formData.accountCode}
                            onChange={e => setFormData(prev => ({ ...prev, accountCode: e.target.value }))}
                            className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            placeholder="e.g. 1000"
                        />
                    </div>

                    {/* Description */}
                    <div className="space-y-1.5">
                        <label className="text-[13px] font-semibold text-slate-700">
                            Description
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                            rows={3}
                            placeholder="Optional description..."
                        />
                    </div>

                    {/* Footer */}
                    <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold py-2 rounded-md transition-colors flex items-center justify-center gap-2"
                        >
                            {isLoading ? <Loader2 size={18} className="animate-spin" /> : "Save Account"}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-2 rounded-md transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
