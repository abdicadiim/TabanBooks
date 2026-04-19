import React, { useEffect, useState } from "react";
import { X, Search, ChevronDown } from "lucide-react";

interface AdvancedSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSearch: (criteria: any) => void;
    dbAccounts: any[];
    dbTaxes: any[];
    dbVendors: any[];
    searchOptions?: string[];
    filterOptionsBySearch?: Record<string, string[]>;
    initialSearchIn?: string;
    initialFilter?: string;
}

export default function AdvancedSearchModal({
    isOpen,
    onClose,
    onSearch,
    dbAccounts,
    dbTaxes,
    dbVendors,
    searchOptions = ["Items", "Units", "Inventory Adjustments"],
    filterOptionsBySearch = {
        Items: ["All Items", "Active Items", "Inactive Items", "Low Stock", "Inventory Items"],
        Units: ["All"],
        "Inventory Adjustments": ["All", "By Quantity", "By Value"],
    },
    initialSearchIn = "Items",
    initialFilter = "All Items",
}: AdvancedSearchModalProps) {
    const [searchForm, setSearchForm] = useState({
        name: "",
        sku: "",
        description: "",
        rate: "",
        purchaseRate: "",
        status: "All",
        salesAccount: "",
        purchaseAccount: "",
        preferredVendor: "",
        salesTax: "",
        searchIn: "Items",
        filter: initialFilter
    });
    const getFilterOptions = (searchIn: string) => {
        const options = filterOptionsBySearch[searchIn];
        if (Array.isArray(options) && options.length > 0) return options;
        return ["All"];
    };

    useEffect(() => {
        if (!isOpen) return;
        const availableSearchIn = searchOptions.includes(initialSearchIn) ? initialSearchIn : searchOptions[0];
        const availableFilterOptions = getFilterOptions(availableSearchIn);
        const availableFilter = availableFilterOptions.includes(initialFilter)
            ? initialFilter
            : availableFilterOptions[0];
        setSearchForm((prev) => ({
            ...prev,
            searchIn: availableSearchIn,
            filter: availableFilter,
        }));
    }, [isOpen, initialSearchIn, initialFilter]);

    if (!isOpen) return null;

    const handleSearch = () => {
        onSearch(searchForm);
        onClose();
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === "searchIn") {
            const nextFilterOptions = getFilterOptions(value);
            setSearchForm(prev => ({
                ...prev,
                searchIn: value,
                filter: nextFilterOptions.includes(prev.filter) ? prev.filter : nextFilterOptions[0],
            }));
            return;
        }
        setSearchForm(prev => ({ ...prev, [name]: value }));
    };

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200">
                {/* Header with Search and Filter selection */}
                <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 bg-white">
                    <div className="flex items-center gap-8 flex-1">
                        <div className="flex items-center gap-4">
                            <span className="text-sm font-medium text-slate-500">Search</span>
                            <div className="relative min-w-[200px]">
                                <select
                                    name="searchIn"
                                    value={searchForm.searchIn}
                                    onChange={handleChange}
                                    className="w-full h-10 px-4 border border-teal-200 rounded-md text-[13px] bg-white appearance-none focus:ring-1 focus:ring-teal-500 outline-none pr-10 text-slate-700 font-medium shadow-sm transition-all"
                                >
                                    {searchOptions.map((option) => (
                                        <option key={option}>{option}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-teal-500 pointer-events-none" />
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <span className="text-sm font-medium text-slate-500">Filter</span>
                            <div className="relative min-w-[200px]">
                                <select
                                    name="filter"
                                    value={searchForm.filter}
                                    onChange={handleChange}
                                    className="w-full h-10 px-4 border border-slate-200 rounded-md text-[13px] bg-white appearance-none focus:ring-1 focus:ring-teal-500 outline-none pr-10 text-slate-700 font-medium transition-all"
                                >
                                    {getFilterOptions(searchForm.searchIn).map((option) => (
                                        <option key={option}>{option}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full transition-colors group">
                        <X size={20} className="text-slate-900 group-hover:scale-110 transition-transform" />
                    </button>
                </div>

                {/* Main Form Body */}
                <div className="p-10 bg-white">
                    <div className="grid grid-cols-2 gap-x-16 gap-y-6">
                        {/* Left Column */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-4">
                                <label className="w-32 text-right text-[13px] font-medium text-slate-600">Item Name</label>
                                <input
                                    name="name"
                                    value={searchForm.name}
                                    onChange={handleChange}
                                    className="flex-1 h-10 px-4 border border-teal-300 rounded-md text-sm outline-none focus:ring-1 focus:ring-teal-500 shadow-sm"
                                />
                            </div>

                            <div className="flex items-center gap-4">
                                <label className="w-32 text-right text-[13px] font-medium text-slate-600">Description</label>
                                <input
                                    name="description"
                                    value={searchForm.description}
                                    onChange={handleChange}
                                    className="flex-1 h-10 px-4 border border-slate-200 rounded-md text-sm outline-none focus:ring-1 focus:ring-teal-500 transition-all"
                                />
                            </div>

                            <div className="flex items-center gap-4">
                                <label className="w-32 text-right text-[13px] font-medium text-slate-600">Purchase Rate</label>
                                <input
                                    name="purchaseRate"
                                    type="number"
                                    value={searchForm.purchaseRate}
                                    onChange={handleChange}
                                    className="flex-1 h-10 px-4 border border-slate-200 rounded-md text-sm outline-none focus:ring-1 focus:ring-teal-500 transition-all"
                                />
                            </div>

                            <div className="flex items-center gap-4">
                                <label className="w-32 text-right text-[13px] font-medium text-slate-600">Sales Tax</label>
                                <div className="flex-1 relative">
                                    <select
                                        name="salesTax"
                                        value={searchForm.salesTax}
                                        onChange={handleChange}
                                        className="w-full h-10 px-4 border border-slate-200 rounded-md text-[13px] bg-white appearance-none focus:ring-1 focus:ring-teal-500 outline-none pr-10 text-slate-500 transition-all"
                                    >
                                        <option value="">Select a Tax</option>
                                        {dbTaxes.map(t => <option key={t._id} value={t.name}>{t.name} [{t.rate}%]</option>)}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <label className="w-32 text-right text-[13px] font-medium text-slate-600">Purchase Account</label>
                                <div className="flex-1 relative">
                                    <select
                                        name="purchaseAccount"
                                        value={searchForm.purchaseAccount}
                                        onChange={handleChange}
                                        className="w-full h-10 px-4 border border-slate-200 rounded-md text-[13px] bg-white appearance-none focus:ring-1 focus:ring-teal-500 outline-none pr-10 text-slate-500 transition-all"
                                    >
                                        <option value="">Select Account</option>
                                        {dbAccounts.filter(a => a.accountType === "expense" || a.accountType === "cost_of_goods_sold").map(a => <option key={a._id} value={a.accountName}>{a.accountName}</option>)}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                                </div>
                            </div>
                        </div>

                        {/* Right Column */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-4">
                                <label className="w-32 text-right text-[13px] font-medium text-slate-600">SKU</label>
                                <input
                                    name="sku"
                                    value={searchForm.sku}
                                    onChange={handleChange}
                                    className="flex-1 h-10 px-4 border border-slate-200 rounded-md text-sm outline-none focus:ring-1 focus:ring-teal-500 transition-all"
                                />
                            </div>

                            <div className="flex items-center gap-4">
                                <label className="w-32 text-right text-[13px] font-medium text-slate-600">Rate</label>
                                <input
                                    name="rate"
                                    type="number"
                                    value={searchForm.rate}
                                    onChange={handleChange}
                                    className="flex-1 h-10 px-4 border border-slate-200 rounded-md text-sm outline-none focus:ring-1 focus:ring-teal-500 transition-all"
                                />
                            </div>

                            <div className="flex items-center gap-4">
                                <label className="w-32 text-right text-[13px] font-medium text-slate-600">Status</label>
                                <div className="flex-1 relative">
                                    <select
                                        name="status"
                                        value={searchForm.status}
                                        onChange={handleChange}
                                        className="w-full h-10 px-4 border border-slate-200 rounded-md text-[13px] bg-white appearance-none focus:ring-1 focus:ring-teal-500 outline-none pr-10 text-slate-700 transition-all font-medium"
                                    >
                                        <option>All</option>
                                        <option>Active</option>
                                        <option>Inactive</option>
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <label className="w-32 text-right text-[13px] font-medium text-slate-600">Sales Account</label>
                                <div className="flex-1 relative">
                                    <select
                                        name="salesAccount"
                                        value={searchForm.salesAccount}
                                        onChange={handleChange}
                                        className="w-full h-10 px-4 border border-slate-200 rounded-md text-[13px] bg-white appearance-none focus:ring-1 focus:ring-teal-500 outline-none pr-10 text-slate-500 transition-all"
                                    >
                                        <option value="">Select Account</option>
                                        {dbAccounts.filter(a => a.accountType === "income").map(a => <option key={a._id} value={a.accountName}>{a.accountName}</option>)}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <label className="w-32 text-right text-[13px] font-medium text-slate-600">Preferred Vendor</label>
                                <div className="flex-1 relative">
                                    <select
                                        name="preferredVendor"
                                        value={searchForm.preferredVendor}
                                        onChange={handleChange}
                                        className="w-full h-10 px-4 border border-slate-200 rounded-md text-[13px] bg-white appearance-none focus:ring-1 focus:ring-teal-500 outline-none pr-10 text-slate-500 transition-all"
                                    >
                                        <option value="">Select a Vendor</option>
                                        {dbVendors.map(v => <option key={v._id} value={v.name}>{v.name}</option>)}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-center gap-3 px-8 py-8 border-t border-slate-100 bg-white">
                    <button
                        onClick={handleSearch}
                        className="px-8 py-2.5 bg-teal-700 text-white rounded text-sm font-semibold hover:bg-teal-800 transition-colors shadow-sm min-w-[120px]"
                    >
                        Search
                    </button>
                    <button
                        onClick={onClose}
                        className="px-8 py-2.5 border border-slate-200 text-slate-700 bg-white rounded text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm min-w-[120px]"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
