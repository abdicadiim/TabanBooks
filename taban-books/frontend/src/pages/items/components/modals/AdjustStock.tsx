import React, { useEffect, useMemo, useRef, useState } from "react";
import { Calendar, Check, ChevronDown, Search, Settings, X } from "lucide-react";
import toast from "react-hot-toast";
import { Item } from "../../itemsModel";
import { AccountSelectDropdown } from "../../../../components/AccountSelectDropdown";
import type { Account } from "../../../../hooks/useAccountSelect";
import { inventoryAdjustmentsAPI } from "../../../../services/api";

interface AdjustStockProps {
    item: Item;
    onBack: () => void;
    onUpdate: (data: any) => void;
    initialAccounts?: Account[];
    initialLocations?: Array<any>;
    initialStockOnHand?: number;
    initialLocationStocks?: Record<string, number>;
}

const uid = () => Math.random().toString(36).slice(2, 11);
const inputClassName =
    "h-11 w-full rounded-md border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-[#156372] focus:ring-2 focus:ring-[rgba(21,99,114,0.15)]";

const numberInputClassName = `${inputClassName} appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`;

const readOnlyInputClassName =
    "h-11 w-full rounded-md border border-slate-200 bg-slate-50 px-4 text-sm text-slate-400 outline-none";

const normalizeLocationKey = (value: any) => String(value || "").trim().toLowerCase();

export default function AdjustStock({
    item,
    onBack,
    onUpdate,
    initialAccounts = [],
    initialLocations = [],
    initialStockOnHand,
    initialLocationStocks = {},
}: AdjustStockProps) {
    const currentStock = Number(
        initialStockOnHand ??
        item.stockOnHand ??
        item.stockQuantity ??
        item.openingStock ??
        0
    );
    const unitLabel = item?.unit || "pcs";
    const unitCost = Number(item.costPrice || 0);
    const locationDropdownRef = useRef<HTMLDivElement>(null);
    const reasonDropdownRef = useRef<HTMLDivElement>(null);
    const [locationDropdownOpen, setLocationDropdownOpen] = useState(false);
    const [locationSearch, setLocationSearch] = useState("");
    const [reasonDropdownOpen, setReasonDropdownOpen] = useState(false);
    const [reasonSearch, setReasonSearch] = useState("");
    const [reasonOptions, setReasonOptions] = useState<string[]>([]);
    const [manageReasonsOpen, setManageReasonsOpen] = useState(false);
    const [newReasonName, setNewReasonName] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [validationMessage, setValidationMessage] = useState("");

    const [form, setForm] = useState({
        adjustmentType: "quantity",
        date: new Date().toISOString().split("T")[0],
        account: "Cost of Goods Sold",
        referenceNumber: "",
        location: initialLocations.find((loc: any) => loc?.isDefault)?.name || initialLocations[0]?.name || "",
        newQuantity: "",
        quantityAdjusted: "",
        costPrice: item.costPrice?.toString() || "0",
        reason: "",
        description: "",
    });

    const accountAllowedTypes = [
        "expense",
        "cost_of_goods_sold",
        "other_expense",
    ];

    const requiredLabelClassName = "mb-2 block text-[14px] font-medium text-red-500";
    const labelClassName = "mb-2 block text-[14px] font-medium text-slate-700";
    const selectedLocationStock = useMemo(() => {
        const selectedKey = normalizeLocationKey(form.location);
        if (selectedKey && Object.prototype.hasOwnProperty.call(initialLocationStocks, selectedKey)) {
            return Number(initialLocationStocks[selectedKey] || 0);
        }
        return currentStock;
    }, [currentStock, form.location, initialLocationStocks]);

    const selectedLocationValue = useMemo(
        () => selectedLocationStock * unitCost,
        [selectedLocationStock, unitCost],
    );

    const displayDate = useMemo(() => {
        if (!form.date) return "";
        const date = new Date(`${form.date}T00:00:00`);
        return date.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
        });
    }, [form.date]);

    const filteredLocations = useMemo(() => {
        return initialLocations.filter((loc: any) => {
            const name = String(loc?.name || loc?.locationName || "").trim();
            return name.toLowerCase().includes(locationSearch.toLowerCase());
        });
    }, [initialLocations, locationSearch]);

    const filteredReasons = useMemo(() => {
        return reasonOptions.filter((reason) =>
            reason.toLowerCase().includes(reasonSearch.toLowerCase())
        );
    }, [reasonOptions, reasonSearch]);

    useEffect(() => {
        setForm((prev) => {
            if (prev.adjustmentType === "value") {
                return {
                    ...prev,
                    newQuantity: "0.00",
                    quantityAdjusted: "",
                };
            }

            return {
                ...prev,
                newQuantity: "",
                quantityAdjusted: "",
            };
        });
    }, [selectedLocationStock, selectedLocationValue]);

    useEffect(() => {
        const loadReasons = async () => {
            try {
                const response = await inventoryAdjustmentsAPI.getReasons();
                const customReasons = Array.isArray(response) ? response : Array.isArray(response?.data) ? response.data : [];
                setReasonOptions(customReasons.map((reason: any) => reason.name).filter(Boolean));
            } catch (error) {
                console.warn("Failed to fetch adjustment reasons", error);
            }
        };

        void loadReasons();
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (locationDropdownRef.current && !locationDropdownRef.current.contains(event.target as Node)) {
                setLocationDropdownOpen(false);
            }
            if (reasonDropdownRef.current && !reasonDropdownRef.current.contains(event.target as Node)) {
                setReasonDropdownOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleCreateReason = async () => {
        const trimmedReason = newReasonName.trim();
        if (!trimmedReason) return;

        try {
            await inventoryAdjustmentsAPI.createReason({ reason: trimmedReason });
            setReasonOptions((prev) => Array.from(new Set([...prev, trimmedReason])));
            setForm((prev) => ({ ...prev, reason: trimmedReason }));
            setNewReasonName("");
            setManageReasonsOpen(false);
            setReasonDropdownOpen(false);
        } catch (error) {
            console.warn("Failed to create adjustment reason", error);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        if (validationMessage) {
            setValidationMessage("");
        }
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setForm((prev) => {
            if (validationMessage) {
                setValidationMessage("");
            }
            if (value.trim() === "") {
                return {
                    ...prev,
                    newQuantity: "",
                    quantityAdjusted: "",
                };
            }

            const newQty = parseFloat(value) || 0;
            const adjusted =
                prev.adjustmentType === "value"
                    ? newQty - selectedLocationValue
                    : newQty - selectedLocationStock;
            return {
                ...prev,
                newQuantity: value,
                quantityAdjusted: adjusted !== 0 ? (adjusted > 0 ? `+${adjusted}` : `${adjusted}`) : "",
            };
        });
    };

    const handleAdjustedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setForm((prev) => {
            if (validationMessage) {
                setValidationMessage("");
            }
            if (value.trim() === "") {
                return {
                    ...prev,
                    quantityAdjusted: "",
                    newQuantity: "",
                };
            }

            const signedAdjusted = parseFloat(value.replace(/[+]/g, "")) || 0;
            return {
                ...prev,
                quantityAdjusted: value,
                newQuantity: String(
                    prev.adjustmentType === "value"
                        ? selectedLocationValue + signedAdjusted
                        : selectedLocationStock + signedAdjusted
                ),
            };
        });
    };

    const handleAdjustmentTypeChange = (value: "quantity" | "value") => {
        if (validationMessage) {
            setValidationMessage("");
        }
        setForm((prev) => ({
            ...prev,
            adjustmentType: value,
            newQuantity: value === "value" ? "0.00" : "",
            quantityAdjusted: "",
        }));
    };

    const handleSave = async (status = "DRAFT") => {
        if (!form.reason) {
            setValidationMessage("Please specify a reason for the adjustment");
            return;
        }

        if (!form.date || !form.account || !form.quantityAdjusted) {
            setValidationMessage("Please fill in all required fields");
            return;
        }

        const itemId = String(item._id || item.id || "").trim();
        if (!itemId) {
            toast.error("Item id is missing");
            return;
        }

        const adjustmentValue = parseFloat(String(form.quantityAdjusted || "").replace(/[+]/g, "")) || 0;
        const resolvedNewQuantity =
            form.newQuantity.trim() === ""
                ? form.adjustmentType === "value"
                    ? 0
                    : selectedLocationStock + adjustmentValue
                : parseFloat(form.newQuantity) || 0;
        const adjustmentNumber = form.referenceNumber.trim() || `ADJ-${Date.now()}`;

        const payload = {
            adjustmentNumber,
            referenceNumber: form.referenceNumber.trim() || adjustmentNumber,
            reference: form.referenceNumber.trim() || adjustmentNumber,
            date: new Date(`${form.date}T00:00:00`),
            type: form.adjustmentType === "value" ? "Value" : "Quantity",
            status,
            reason: form.reason,
            description: form.description || "",
            notes: form.description || "",
            account: form.account,
            location: form.location,
            locationName: form.location,
            items: [
                {
                    item: itemId,
                    itemName: item.name || "",
                    itemSku: item.sku || "",
                    quantityOnHand: form.adjustmentType === "value" ? selectedLocationValue : selectedLocationStock,
                    quantityAdjusted: adjustmentValue,
                    newQuantity: resolvedNewQuantity,
                    cost: parseFloat(form.costPrice) || 0,
                    reason: form.reason,
                },
            ],
        };

        try {
            setIsSaving(true);
            await inventoryAdjustmentsAPI.create(payload);

            if (status === "ADJUSTED") {
                const newTransaction = {
                    id: uid(),
                    date: form.date,
                    type: "adjustment",
                    qty: adjustmentValue,
                    price: parseFloat(form.costPrice) || 0,
                    total: adjustmentValue * (parseFloat(form.costPrice) || 0),
                    status: "Adjusted",
                    reference: form.referenceNumber || adjustmentNumber,
                };

                void onUpdate({
                    stockOnHand: resolvedNewQuantity,
                    stockQuantity: resolvedNewQuantity,
                    transactions: [...(item.transactions || []), newTransaction],
                });
            }

            toast.success(
                status === "ADJUSTED"
                    ? "Inventory Adjustment has been added"
                    : "Inventory adjustment draft saved",
            );

            onBack();

            window.dispatchEvent(new Event("inventoryAdjustmentsUpdated"));
            window.dispatchEvent(new Event("itemsUpdated"));
        } catch (error: any) {
            console.error("Failed to save inventory adjustment", error);
            toast.error(error?.data?.message || error?.message || "Failed to save inventory adjustment");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="flex h-full flex-col bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
                <h2 className="text-[20px] font-medium text-slate-800">
                    Adjust Stock - {item?.name || "Unnamed Item"}
                </h2>
                <button
                    type="button"
                    onClick={onBack}
                    className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-50 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
                >
                    <X size={20} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6">
                <div className="max-w-[780px] space-y-7">
                    {validationMessage && (
                        <div className="flex items-center justify-between rounded-md border border-[#3b82f6] bg-[#fdecec] px-4 py-4 text-sm text-slate-700">
                            <div className="flex items-center gap-3">
                                <span className="text-base leading-none text-slate-900">•</span>
                                <span>{validationMessage}</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setValidationMessage("")}
                                className="shrink-0 text-red-500"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    )}

                    <div>
                        <div className="space-y-3">
                            <label className="flex items-center gap-2 text-[14px] text-slate-600">
                                <input
                                    type="radio"
                                    name="adjustmentType"
                                    value="quantity"
                                    checked={form.adjustmentType === "quantity"}
                                    onChange={() => handleAdjustmentTypeChange("quantity")}
                                    className="h-4 w-4"
                                />
                                <span>Quantity Adjustment</span>
                            </label>
                            <label className="flex items-center gap-2 text-[14px] text-slate-600">
                                <input
                                    type="radio"
                                    name="adjustmentType"
                                    value="value"
                                    checked={form.adjustmentType === "value"}
                                    onChange={() => handleAdjustmentTypeChange("value")}
                                    className="h-4 w-4"
                                />
                                <span>Value Adjustment</span>
                            </label>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-x-4 gap-y-5 md:grid-cols-3">
                        <div className="md:w-[250px]">
                            <label className={requiredLabelClassName}>Date*</label>
                            <div className="relative">
                                <input
                                    type="date"
                                    name="date"
                                    value={form.date}
                                    onChange={handleChange}
                                    className={`${inputClassName} pr-11`}
                                />
                                <Calendar size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" />
                            </div>
                            <div className="mt-2 text-xs text-slate-500">{displayDate}</div>
                        </div>

                        <div className="md:w-[250px]">
                            <label className={requiredLabelClassName}>Account*</label>
                            <div className="h-11 rounded-md border border-slate-200 bg-white px-4">
                                <AccountSelectDropdown
                                    value={form.account}
                                    onSelect={(account) =>
                                        setForm((prev) => ({
                                            ...prev,
                                            account: account.name,
                                        }))
                                    }
                                    placeholder="Select an account"
                                    allowedTypes={accountAllowedTypes}
                                    preload
                                    initialAccounts={initialAccounts}
                                />
                            </div>
                        </div>

                        <div className="md:w-[250px]">
                            <label className={labelClassName}>Reference Number</label>
                            <input
                                type="text"
                                name="referenceNumber"
                                value={form.referenceNumber}
                                onChange={handleChange}
                                className={inputClassName}
                            />
                        </div>

                        <div className="md:col-span-3">
                            <div className="overflow-hidden rounded-sm border border-slate-200 bg-white">
                                <div className="grid grid-cols-[1fr_280px] items-center gap-4 border-b border-slate-200 px-3 py-6">
                                    <label className="text-[14px] font-medium text-red-500">Location*</label>
                                    <div className="relative" ref={locationDropdownRef}>
                                        <button
                                            type="button"
                                            onClick={() => setLocationDropdownOpen((prev) => !prev)}
                                            className={`${inputClassName} flex h-10 items-center justify-between pr-11 text-left`}
                                        >
                                            <span className={form.location ? "text-slate-700" : "text-slate-400"}>
                                                {form.location || "Add Location"}
                                            </span>
                                            <ChevronDown size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" />
                                        </button>
                                        {locationDropdownOpen && (
                                            <div className="absolute left-0 top-full z-50 mt-2 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_16px_36px_rgba(15,23,42,0.14)]">
                                                <div className="border-b border-slate-200 px-3 py-2.5">
                                                    <div className="flex items-center gap-2 rounded-md border border-blue-400 bg-white px-2.5 py-2">
                                                        <Search size={14} className="shrink-0 text-slate-400" />
                                                        <input
                                                            type="text"
                                                            className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                                                            placeholder="Search"
                                                            value={locationSearch}
                                                            onChange={(e) => setLocationSearch(e.target.value)}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="max-h-[180px] overflow-y-auto py-1">
                                                    {filteredLocations.length > 0 ? filteredLocations.map((loc: any) => {
                                                        const name = String(loc?.name || loc?.locationName || "").trim();
                                                        const selected = form.location === name;
                                                        return (
                                                            <button
                                                                key={loc?._id || loc?.id || name}
                                                                type="button"
                                                                onClick={() => {
                                                                    setForm((prev) => ({
                                                                        ...prev,
                                                                        location: name,
                                                                        newQuantity: prev.adjustmentType === "value" ? "0.00" : "",
                                                                        quantityAdjusted: "",
                                                                    }));
                                                                    setLocationDropdownOpen(false);
                                                                    setLocationSearch("");
                                                                }}
                                                                className={`block w-full px-4 py-2 text-left text-sm ${selected ? "bg-[#3B82F6] text-white" : "text-slate-700 hover:bg-slate-50"}`}
                                                            >
                                                                {name}
                                                            </button>
                                                        );
                                                    }) : (
                                                        <div className="px-4 py-3 text-sm text-slate-500">No locations found.</div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-[1fr_220px] items-center gap-4 border-b border-slate-200 px-3 py-4">
                                    <label className="text-[14px] font-medium text-slate-700">
                                        {form.adjustmentType === "value" ? "Current Value" : "Quantity Available"}
                                    </label>
                                    <div className="text-right">
                                        <input
                                            type="text"
                                            readOnly
                                            value={form.adjustmentType === "value"
                                                ? `KES${selectedLocationValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                                : selectedLocationStock.toFixed(2)}
                                            className={`${readOnlyInputClassName} h-9 text-right ${form.adjustmentType === "value" ? "text-slate-700 font-medium" : "text-slate-700"}`}
                                        />
                                        {form.adjustmentType === "quantity" && (
                                            <div className="mt-1 text-[14px] text-slate-900">{unitLabel}</div>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-[1fr_220px] items-center gap-4 border-b border-slate-200 px-3 py-4">
                                    <label className="text-[14px] font-medium text-slate-700">
                                        {form.adjustmentType === "value" ? "Changed Value" : "New Quantity on hand"}
                                    </label>
                                    <input
                                        type="number"
                                        name="newQuantity"
                                        value={form.newQuantity}
                                        onChange={handleQuantityChange}
                                        step="0.01"
                                        className={`${numberInputClassName} h-9 text-right`}
                                    />
                                </div>

                                <div className="grid grid-cols-[1fr_220px] items-center gap-4 border-b border-slate-200 px-3 py-4">
                                    <label className="text-[14px] font-medium text-red-500">
                                        {form.adjustmentType === "value" ? "Adjusted Value*" : "Quantity Adjusted*"}
                                    </label>
                                    <input
                                        type="text"
                                        name="quantityAdjusted"
                                        value={form.quantityAdjusted}
                                        onChange={handleAdjustedChange}
                                        placeholder="Eg. +10, -10"
                                        className={`${inputClassName} h-9 text-right`}
                                    />
                                </div>

                                {form.adjustmentType === "quantity" && (
                                    <div className="grid grid-cols-[1fr_220px] items-center gap-4 px-3 py-4">
                                        <label className="text-[14px] font-medium text-slate-700">Cost Price</label>
                                        <input
                                            type="number"
                                            name="costPrice"
                                            value={form.costPrice}
                                            onChange={handleChange}
                                            step="0.01"
                                            className={`${numberInputClassName} h-9 text-right`}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="md:col-span-3">
                            <label className={requiredLabelClassName}>Reason*</label>
                            <div className="relative" ref={reasonDropdownRef}>
                                <button
                                    type="button"
                                    onClick={() => setReasonDropdownOpen((prev) => !prev)}
                                    className={`${inputClassName} flex items-center justify-between pr-11 text-left`}
                                >
                                    <span className={form.reason ? "text-slate-700" : "text-slate-400"}>
                                        {form.reason || "Select a reason"}
                                    </span>
                                    <ChevronDown size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" />
                                </button>

                                {reasonDropdownOpen && (
                                    <div className="absolute left-0 top-full z-50 mt-2 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_16px_36px_rgba(15,23,42,0.14)]">
                                        <div className="border-b border-slate-200 px-3 py-2.5">
                                            <div className="flex items-center gap-2 rounded-md border border-blue-400 bg-white px-2.5 py-2">
                                                <Search size={14} className="shrink-0 text-slate-400" />
                                                <input
                                                    type="text"
                                                    className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                                                    placeholder="Search"
                                                    value={reasonSearch}
                                                    onChange={(e) => setReasonSearch(e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        <div className="max-h-[220px] overflow-y-auto py-1">
                                            {filteredReasons.length > 0 ? filteredReasons.map((reason) => {
                                                const selected = form.reason === reason;
                                                return (
                                                    <button
                                                        key={reason}
                                                        type="button"
                                                        onClick={() => {
                                                            setValidationMessage("");
                                                            setForm((prev) => ({ ...prev, reason }));
                                                            setReasonDropdownOpen(false);
                                                            setReasonSearch("");
                                                        }}
                                                        className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm ${selected ? "bg-[#3B82F6] text-white" : "text-slate-700 hover:bg-slate-50"}`}
                                                    >
                                                        <span>{reason}</span>
                                                        {selected && <Check size={15} className="shrink-0 text-white" />}
                                                    </button>
                                                );
                                            }) : (
                                                <div className="px-4 py-3 text-sm text-slate-500">No reasons found.</div>
                                            )}
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                setValidationMessage("");
                                                setManageReasonsOpen(true);
                                                setReasonDropdownOpen(false);
                                            }}
                                            className="flex w-full items-center gap-2 border-t border-slate-200 px-4 py-3 text-left text-sm text-blue-600 hover:bg-slate-50"
                                        >
                                            <Settings size={15} />
                                            <span>Manage Reasons</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className={labelClassName}>Description</label>
                        <textarea
                            name="description"
                            value={form.description}
                            onChange={handleChange}
                            rows={4}
                            maxLength={500}
                            placeholder="Max 500 characters"
                            className="min-h-[98px] w-full rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-[#156372] focus:ring-2 focus:ring-[rgba(21,99,114,0.15)]"
                        />
                    </div>

                    <div className="flex items-center gap-3 border-t border-slate-200 pt-5">
                        <button
                            type="button"
                            onClick={() => void handleSave("DRAFT")}
                            disabled={isSaving}
                            className="rounded-md bg-[#156372] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#0d4a52]"
                        >
                            {isSaving ? "Saving..." : "Save as Draft"}
                        </button>
                        <button
                            type="button"
                            onClick={() => void handleSave("ADJUSTED")}
                            disabled={isSaving}
                            className="rounded-md border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                        >
                            Convert to Adjusted
                        </button>
                        <button
                            type="button"
                            onClick={onBack}
                            className="rounded-md border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>

            {manageReasonsOpen && (
                <div className="fixed inset-0 z-[14000] flex items-center justify-center bg-black/40 px-4">
                    <div className="w-full max-w-[660px] overflow-hidden rounded-lg bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                            <h3 className="text-[18px] font-medium text-slate-800">
                                Adjust Stock - {item?.name || "Unnamed Item"}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setManageReasonsOpen(false)}
                                className="text-red-500"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-5">
                            <div className="rounded border border-slate-200 p-5">
                                <label className={requiredLabelClassName}>Reason*</label>
                                <input
                                    type="text"
                                    value={newReasonName}
                                    onChange={(e) => setNewReasonName(e.target.value)}
                                    className="h-10 w-full max-w-[340px] rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-[#156372]"
                                />
                                <div className="mt-4 flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={handleCreateReason}
                                        className="rounded bg-[#156372] px-4 py-2 text-sm font-medium text-white hover:bg-[#0d4a52]"
                                    >
                                        Save and Select
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setManageReasonsOpen(false)}
                                        className="rounded border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>

                            <div className="mt-5">
                                <div className="border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase text-slate-500">
                                    Reason
                                </div>
                                <div className="border-x border-b border-slate-200">
                                    {reasonOptions.map((reason) => (
                                        <div key={reason} className="border-b border-slate-200 px-4 py-3 text-[15px] text-slate-700 last:border-b-0">
                                            {reason}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
