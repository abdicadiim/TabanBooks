import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
    X,
    HelpCircle,
    Search,
    Check,
    Plus,
    Settings,
    Upload,
    ChevronDown,
    Info,
    RefreshCw,
} from "lucide-react";
import {
    itemsAPI,
    unitsAPI,
    taxesAPI,
    reportingTagsAPI,
    vendorsAPI,
} from "../../../services/api";
import { getChartOfAccounts } from "../../accountant/accountantModel";
import { Item, Z } from "../itemsModel";
import NewAccountModal from "../../accountant/components/NewAccountModal";
import NewTaxModal from "../../../components/modals/NewTaxModal";
import NewVendorModal from "../../../components/modals/NewVendorModal";
import ManageUnitsModal from "./modals/ManageUnitsModal";
import TabanSelect from "../../../components/TabanSelect";
import { useOrganizationBranding } from "../../../hooks/useOrganizationBranding";

interface NewItemFormProps {
    onCancel: () => void;
    onCreate: (data: any, selectedTagIds: string[]) => Promise<void>;
    baseCurrency?: any;
    initialData?: any;
    formTitle?: string;
}

const REQUIRED_RED = "#ff0000";

const FieldRow = ({
    children,
    className = "",
    delay = 0,
}: {
    children: React.ReactNode;
    className?: string;
    delay?: number;
}) => (
    <div
        className={`${className} taban-field-in`}
        style={{
            animationDelay: delay ? `${delay}ms` : undefined,
        }}
    >
        {children}
    </div>
);

const Label = ({ children, required = false, help = true, tooltip, htmlFor }: { children: React.ReactNode; required?: boolean; help?: boolean; tooltip?: React.ReactNode; htmlFor?: string }) => (
    <div className="flex items-center gap-1 w-full md:w-[170px] shrink-0">
        <label
            htmlFor={htmlFor}
            className={`block text-[13px] font-medium ${required ? "underline decoration-dotted underline-offset-4" : "text-slate-600"}`}
            style={{
                color: required ? REQUIRED_RED : undefined,
                textDecorationColor: required ? REQUIRED_RED : undefined,
            }}
        >
            {children}{required && "*"}
        </label>
        {help && (
            <div className="relative group/help">
                <HelpCircle className="h-3.5 w-3.5 text-slate-300 cursor-help" />
                {tooltip && (
                    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-3 py-2 bg-slate-800 text-white text-[11px] rounded opacity-0 invisible group-hover/help:opacity-100 group-hover/help:visible transition-all duration-200 pointer-events-none z-[9999] shadow-lg w-64">
                        {tooltip}
                        <div className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-t-4 border-b-4 border-r-4 border-transparent border-r-slate-800"></div>
                    </div>
                )}
            </div>
        )}
    </div>
);

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    error?: boolean;
}

const Input = ({ className = "", error, ...props }: InputProps) => {
    const { accentColor } = useOrganizationBranding();
    return (
        <input
            {...props}
            className={`block w-full max-w-[560px] h-9 px-3 rounded-md border text-[13px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 transition-all ${error ? "border-red-500 ring-red-500/20 ring-1" : "border-slate-200"} ${className}`}
            style={{
                '--tw-ring-color': error ? undefined : (accentColor || "#3b82f6"),
            } as any}
        />
    );
};

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    error?: boolean;
}

const Select = ({ className = "", children, error, ...props }: SelectProps) => {
    const { accentColor } = useOrganizationBranding();
    return (
        <div className="relative w-full max-w-[560px]">
            <select
                {...props}
                className={`w-full h-9 appearance-none rounded-md border px-3 py-1.5 pr-8 text-[13px] text-gray-900 focus:outline-none focus:ring-1 bg-white transition-all ${error ? "border-red-500 ring-red-500/20 ring-1" : "border-slate-200"} ${className}`}
                style={{ '--tw-ring-color': error ? undefined : (accentColor || "#3b82f6") } as any}
            >
                {children}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
    );
};

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    error?: boolean;
}

const Textarea = ({ className = "", error, ...props }: TextareaProps) => {
    const { accentColor } = useOrganizationBranding();
    return (
        <textarea
            {...props}
            className={`block w-full max-w-[560px] rounded-md border px-3 py-1.5 text-[13px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 resize-none transition-all ${error ? "border-red-500 ring-red-500/20 ring-1" : "border-slate-200"} ${className}`}
            style={{ '--tw-ring-color': error ? undefined : (accentColor || "#3b82f6") } as any}
            rows={3}
        />
    );
};

export default function NewItemForm({ onCancel, onCreate, baseCurrency, initialData, formTitle }: NewItemFormProps) {
    const navigate = useNavigate();
    const { accentColor } = useOrganizationBranding();
    const uiAccent = accentColor || "#3b82f6";
    const currencyCode = baseCurrency?.symbol || baseCurrency?.code || "AED";

    const [form, setForm] = useState({
        type: initialData?.type || "Goods",
        name: initialData?.name || "",
        sku: initialData?.sku || "",
        unit: initialData?.unit || "",
        sellable: initialData?.sellable ?? true,
        sellingPrice: initialData?.sellingPrice?.toString() || "",
        salesAccount: initialData?.salesAccount || "Sales",
        salesDescription: initialData?.salesDescription || "",
        salesTax: initialData?.salesTax || "",
        purchasable: initialData?.purchasable ?? true,
        costPrice: initialData?.costPrice?.toString() || "",
        purchaseAccount: initialData?.purchaseAccount || "Cost of Goods Sold",
        purchaseDescription: initialData?.purchaseDescription || "",
        purchaseTax: initialData?.purchaseTax || "",
        preferredVendor: initialData?.preferredVendor || "",
        trackInventory: initialData?.trackInventory || false,
        inventoryAccount: initialData?.inventoryAccount || "Inventory Asset",
        inventoryValuationMethod: initialData?.inventoryValuationMethod || "FIFO (First In First Out)",
        reorderPoint: initialData?.reorderPoint?.toString() || "",
        currency: initialData?.currency || currencyCode,
    });

    const [images, setImages] = useState<string[]>(initialData?.images || []);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [dbUnits, setDbUnits] = useState<any[]>([]);
    const [dbAccounts, setDbAccounts] = useState<any[]>([]);
    const [dbTaxes, setDbTaxes] = useState<any[]>([]);
    const [dbVendors, setDbVendors] = useState<any[]>([]);
    const [availableTags, setAvailableTags] = useState<any[]>([]);
    const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

    const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
    const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
    const [isManageUnitsModalOpen, setIsManageUnitsModalOpen] = useState(false);
    const [accountModalDefaultType, setAccountModalDefaultType] = useState("");
    const [pendingAccountField, setPendingAccountField] = useState<"salesAccount" | "purchaseAccount" | "inventoryAccount">("salesAccount");
    const [isTaxModalOpen, setIsTaxModalOpen] = useState(false);
    const [pendingTaxField, setPendingTaxField] = useState<"salesTax" | "purchaseTax">("salesTax");
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, boolean>>({});

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [u, a, t, v, tags] = await Promise.all([
                unitsAPI.getAll(),
                getChartOfAccounts({ limit: 1000 }),
                taxesAPI.getAll(),
                vendorsAPI.getAll(),
                reportingTagsAPI.getAll()
            ]);
            setDbUnits(u.data || u || []);
            setDbAccounts(Array.isArray(a?.data || a) ? (a.data || a) : (Array.isArray(a) ? a : []));
            setDbTaxes(t.data || t || []);
            setDbVendors(v.data || v || []);
            setAvailableTags(tags.data || tags || []);
        } catch (e) {
            console.error("Data fetch failed", e);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;
        setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
        // Clear error when user types
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: false }));
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        files.forEach((file) => {
            const reader = new FileReader();
            reader.onload = () => setImages((prev) => [...prev, reader.result as string]);
            reader.readAsDataURL(file);
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const newErrors: Record<string, boolean> = {};

        if (!form.name.trim()) newErrors.name = true;

        if (form.sellable) {
            if (!form.sellingPrice || parseFloat(form.sellingPrice) <= 0) newErrors.sellingPrice = true;
            if (!form.salesAccount) newErrors.salesAccount = true;
        }

        if (form.purchasable) {
            if (!form.costPrice || parseFloat(form.costPrice) <= 0) newErrors.costPrice = true;
            if (!form.purchaseAccount) newErrors.purchaseAccount = true;
        }

        if (form.trackInventory) {
            if (!form.inventoryAccount) newErrors.inventoryAccount = true;
            if (!form.inventoryValuationMethod) newErrors.inventoryValuationMethod = true;
        }

        setErrors(newErrors);

        if (Object.keys(newErrors).length > 0) {
            toast.error("Please fill in all required fields");
            return;
        }

        setIsLoading(true);
        try {
            await onCreate({ ...form, images }, selectedTagIds);
        } catch (error) {
            console.error("Submission failed:", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-white min-h-screen font-sans flex flex-col">
            <style>
                {`.taban-field-in { animation: tabanFieldIn 260ms ease-out both; }\n@keyframes tabanFieldIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }`}
            </style>
            {/* Header */}
            <div className="flex-none flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200">
                <h2 className="text-[18px] font-bold text-slate-800">{formTitle || "New Item"}</h2>
                <button type="button" onClick={onCancel} className="p-1 rounded-full hover:bg-slate-50 transition-colors">
                    <X size={20} className="text-slate-400" />
                </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 flex flex-col pb-10">
                {/* Top Section - Basic Info & Image */}
                <div className="p-4 md:p-8 bg-slate-50/50 border-b border-slate-200">
                    <div className="flex flex-col md:flex-row gap-8 md:gap-12">
                        {/* Left: Info Grid */}
                        <div className="flex-1 space-y-5">
                            <FieldRow delay={0} className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                                <Label required help={false}>Name</Label>
                                <Input name="name" value={form.name} onChange={handleChange} error={errors.name} />
                            </FieldRow>
                            <FieldRow delay={30} className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                                <Label>Type</Label>
                                <div className="flex items-center gap-6">
                                    <label className="flex items-center gap-2 cursor-pointer group">
                                        <input type="radio" name="type" value="Goods" checked={form.type === "Goods"} onChange={handleChange} className="w-4 h-4 border-slate-300" style={{ accentColor: uiAccent } as any} />
                                        <span className="text-[13px] text-slate-700 group-hover:text-slate-900 transition-colors">Goods</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer group">
                                        <input type="radio" name="type" value="Service" checked={form.type === "Service"} onChange={handleChange} className="w-4 h-4 border-slate-300" style={{ accentColor: uiAccent } as any} />
                                        <span className="text-[13px] text-slate-700 group-hover:text-slate-900 transition-colors">Service</span>
                                    </label>
                                </div>
                            </FieldRow>
                            <FieldRow delay={60} className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                                <Label tooltip="The item will be measured in terms of this unit (e.g.: kg, dozen)">Unit</Label>
                                <TabanSelect
                                    value={form.unit}
                                    onChange={(val) => setForm(f => ({ ...f, unit: val }))}
                                    options={[...["cm", "dz", "ft", "g", "in", "kg", "km", "lb", "mg", "ml", "m", "pcs"], ...dbUnits]}
                                    onAddNew={() => setIsManageUnitsModalOpen(true)}
                                    addNewLabel="Manage Units"
                                    placeholder="Select or type to add"
                                    className="w-full max-w-[560px]"
                                />
                            </FieldRow>
                            <FieldRow delay={90} className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                                <Label tooltip="The Stock Keeping Unit of the item">SKU</Label>
                                <Input name="sku" value={form.sku} onChange={handleChange} />
                            </FieldRow>
                        </div>

                        {/* Right: Image Upload Area */}
                        <FieldRow delay={30} className="w-full md:w-[300px] shrink-0">
                            <div
                                className="w-full aspect-square border-2 border-dashed border-slate-200 rounded-md bg-white flex flex-col items-center justify-center cursor-pointer hover:border-slate-300 transition-all p-4 text-center group"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {images.length > 0 ? (
                                    <div className="grid grid-cols-2 gap-2 w-full h-full">
                                        {images.map((img, i) => (
                                            <div key={i} className="relative h-full group/img rounded overflow-hidden border border-slate-100">
                                                <img src={img} className="w-full h-full object-cover" alt="" />
                                                <button type="button" onClick={(e) => { e.stopPropagation(); setImages(prev => prev.filter((_, idx) => idx !== i)) }} className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity">
                                                    <X size={16} className="text-white" />
                                                </button>
                                            </div>
                                        ))}
                                        {images.length < 4 && (
                                            <div className="h-full border border-dashed border-slate-200 rounded flex items-center justify-center bg-slate-50">
                                                <Plus size={20} className="text-slate-300" />
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <>
                                        <ImageIcon size={40} className="text-slate-300 mb-3 transition-colors" />
                                        <p className="text-[12px] text-slate-500">
                                            Drag Image(s) here or <br />
                                            <span className="font-medium" style={{ color: uiAccent }}>Browse Images</span>
                                        </p>
                                    </>
                                )}
                            </div>
                            <input ref={fileInputRef} type="file" hidden multiple accept="image/*" onChange={handleImageUpload} />
                        </FieldRow>
                    </div>
                </div>

                {/* Sales Information Section */}
                <div className="p-4 md:p-8 bg-white border-b border-slate-200">
                    <FieldRow delay={0} className="flex items-center gap-2 mb-8">
                        <input type="checkbox" name="sellable" checked={form.sellable} onChange={handleChange} className="w-4 h-4 rounded border-slate-300" style={{ accentColor: uiAccent } as any} />
                        <h3 className="text-[14px] font-semibold text-slate-800">Sales Information</h3>
                    </FieldRow>

                    <div className={`grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-5 transition-all duration-200 ${!form.sellable ? "opacity-40 pointer-events-none" : "opacity-100"}`}>
                        <FieldRow delay={0} className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                            <Label required>Selling Price</Label>
                            <div className="flex w-full max-w-[560px] group">
                                <span className={`h-9 px-3 border border-r-0 rounded-l flex items-center bg-slate-50 text-slate-400 text-[11px] font-medium transition-colors ${errors.sellingPrice ? "border-red-500" : "border-slate-200"}`}>{currencyCode}</span>
                                <Input name="sellingPrice" type="number" value={form.sellingPrice} onChange={handleChange} className="rounded-l-none" error={errors.sellingPrice} />
                            </div>
                        </FieldRow>
                        <FieldRow delay={30} className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                            <Label required>Account</Label>
                            <TabanSelect
                                value={form.salesAccount}
                                onChange={(val) => {
                                    setErrors(prev => ({ ...prev, salesAccount: false }));
                                    if (val === "NEW_ACCOUNT") {
                                        setPendingAccountField("salesAccount");
                                        setAccountModalDefaultType("Income");
                                        setIsAccountModalOpen(true);
                                    } else {
                                        setForm(f => ({ ...f, salesAccount: val }));
                                    }
                                }}
                                error={errors.salesAccount}
                                options={dbAccounts.filter(a => ["income", "other_income"].includes(a.accountType?.toLowerCase()))}
                                groupBy="accountType"
                                onAddNew={() => {
                                    setPendingAccountField("salesAccount");
                                    setAccountModalDefaultType("Income");
                                    setIsAccountModalOpen(true);
                                }}
                                addNewLabel="New Account"
                                className="w-full max-w-[560px]"
                            />
                        </FieldRow>
                        <FieldRow delay={60} className="flex flex-col md:flex-row md:items-start gap-2 md:gap-4">
                            <Label help={false}>Description</Label>
                            <Textarea name="salesDescription" value={form.salesDescription} onChange={handleChange} />
                        </FieldRow>
                        <FieldRow delay={90} className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                            <Label tooltip={<>Add the sales tax that's applicable<br />for this item. Create a group tax from<br />Settings if you want to apply more than<br />one tax. This tax will be auto-populated<br />when you create transactions with this item.</>}>Tax</Label>
                            <TabanSelect
                                value={form.salesTax}
                                onChange={(val) => setForm(f => ({ ...f, salesTax: val }))}
                                options={dbTaxes.map(t => `${t.name} [${t.rate}%]`)}
                                onAddNew={() => {
                                    setPendingTaxField("salesTax");
                                    setIsTaxModalOpen(true);
                                }}
                                addNewLabel="New Tax"
                                placeholder="Select a Tax"
                                className="w-full max-w-[560px]"
                            />
                        </FieldRow>
                    </div>
                </div>

                {/* Purchase Information Section */}
                <div className="p-4 md:p-8 bg-white border-b border-slate-200">
                    <FieldRow delay={0} className="flex items-center gap-2 mb-8">
                        <input type="checkbox" name="purchasable" checked={form.purchasable} onChange={handleChange} className="w-4 h-4 rounded border-slate-300" style={{ accentColor: uiAccent } as any} />
                        <h3 className="text-[14px] font-semibold text-slate-800">Purchase Information</h3>
                    </FieldRow>

                    <div className={`grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-5 transition-all duration-200 ${!form.purchasable ? "opacity-40 pointer-events-none" : "opacity-100"}`}>
                        <FieldRow delay={0} className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                            <Label required>Cost Price</Label>
                            <div className="flex w-full max-w-[560px] group">
                                <span className={`h-9 px-3 border border-r-0 rounded-l flex items-center bg-slate-50 text-slate-400 text-[11px] font-medium transition-colors ${errors.costPrice ? "border-red-500" : "border-slate-200"}`}>{currencyCode}</span>
                                <Input name="costPrice" type="number" value={form.costPrice} onChange={handleChange} className="rounded-l-none" error={errors.costPrice} />
                            </div>
                        </FieldRow>
                        <FieldRow delay={30} className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                            <Label required>Account</Label>
                            <TabanSelect
                                value={form.purchaseAccount}
                                onChange={(val) => {
                                    setErrors(prev => ({ ...prev, purchaseAccount: false }));
                                    if (val === "NEW_ACCOUNT") {
                                        setPendingAccountField("purchaseAccount");
                                        setAccountModalDefaultType("Expense");
                                        setIsAccountModalOpen(true);
                                    } else {
                                        setForm(f => ({ ...f, purchaseAccount: val }));
                                    }
                                }}
                                error={errors.purchaseAccount}
                                options={dbAccounts.filter(a => ["expense", "other_expense", "cost_of_goods_sold"].includes(a.accountType?.toLowerCase()))}
                                groupBy="accountType"
                                onAddNew={() => {
                                    setPendingAccountField("purchaseAccount");
                                    setAccountModalDefaultType("Expense");
                                    setIsAccountModalOpen(true);
                                }}
                                addNewLabel="New Account"
                                className="w-full max-w-[560px]"
                            />
                        </FieldRow>
                        <FieldRow delay={60} className="flex flex-col md:flex-row md:items-start gap-2 md:gap-4">
                            <Label help={false}>Description</Label>
                            <Textarea name="purchaseDescription" value={form.purchaseDescription} onChange={handleChange} />
                        </FieldRow>
                        <FieldRow delay={90} className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                            <Label tooltip={<>Add the purchase tax that's applicable<br />for this item.</>}>Tax</Label>
                            <TabanSelect
                                value={form.purchaseTax}
                                onChange={(val) => setForm(f => ({ ...f, purchaseTax: val }))}
                                options={dbTaxes.map(t => `${t.name} [${t.rate}%]`)}
                                onAddNew={() => {
                                    setPendingTaxField("purchaseTax");
                                    setIsTaxModalOpen(true);
                                }}
                                addNewLabel="New Tax"
                                placeholder="Select a Tax"
                                className="w-full max-w-[560px]"
                            />
                        </FieldRow>
                        <FieldRow delay={120} className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                            <Label help={false}>Preferred Vendor</Label>
                            <TabanSelect
                                value={form.preferredVendor}
                                onChange={(val) => {
                                    if (val === "NEW_VENDOR") {
                                        setIsVendorModalOpen(true);
                                    } else {
                                        setForm(f => ({ ...f, preferredVendor: val }));
                                    }
                                }}
                                options={dbVendors}
                                onAddNew={() => setIsVendorModalOpen(true)}
                                addNewLabel="New Vendor"
                                className="w-full max-w-[560px]"
                            />
                        </FieldRow>
                    </div>
                </div>

                {/* Inventory Tracking Section */}
                <div className="p-4 md:p-8 bg-white border-b border-slate-200">
                    <FieldRow delay={0} className="flex flex-col gap-1">
                        <label className="flex items-center gap-2 cursor-pointer w-fit">
                            <input type="checkbox" name="trackInventory" checked={form.trackInventory} onChange={handleChange} className="w-4 h-4 rounded border-slate-300" style={{ accentColor: uiAccent } as any} />
                            <span className="text-[13px] font-medium text-slate-700">Track Inventory for this item</span>
                            <HelpCircle size={14} className="text-slate-300" />
                        </label>
                        <p className="text-[11px] text-slate-400 ml-6">
                            You cannot enable/disable inventory tracking once you've created transactions for this item
                        </p>
                    </FieldRow>

                    {form.trackInventory && (
                        <div className="mt-8 ml-0 md:ml-6 grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-5 animate-in slide-in-from-top-2 duration-200">
                            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                                <Label required>Inventory Account</Label>
                                <TabanSelect
                                    value={form.inventoryAccount}
                                    onChange={(val) => {
                                        setErrors(prev => ({ ...prev, inventoryAccount: false }));
                                        setForm(f => ({ ...f, inventoryAccount: val }));
                                    }}
                                    error={errors.inventoryAccount}
                                    options={dbAccounts.filter(a => ["asset", "other_asset", "fixed_asset", "other_current_asset"].includes(a.accountType?.toLowerCase()))}
                                    groupBy="accountType"
                                    onAddNew={() => {
                                        setPendingAccountField("inventoryAccount");
                                        setAccountModalDefaultType("Asset");
                                        setIsAccountModalOpen(true);
                                    }}
                                    addNewLabel="New Account"
                                    className="w-full max-w-[560px]"
                                />
                            </div>
                            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                                <Label required>Valuation Method</Label>
                                <TabanSelect
                                    value={form.inventoryValuationMethod}
                                    onChange={(val) => {
                                        setErrors(prev => ({ ...prev, inventoryValuationMethod: false }));
                                        setForm(f => ({ ...f, inventoryValuationMethod: val }));
                                    }}
                                    error={errors.inventoryValuationMethod}
                                    options={[
                                        "FIFO (First In First Out)",
                                        "LIFO (Last In First Out)",
                                        "Weighted Average",
                                    ]}
                                    placeholder="Select the valuation method"
                                    className="w-full max-w-[560px]"
                                />
                            </div>
                            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                                <Label>Reorder Point</Label>
                                <Input type="number" name="reorderPoint" value={form.reorderPoint} onChange={handleChange} />
                            </div>
                        </div>
                    )}
                </div>

                {/* Reporting Tags Section */}
                {availableTags.length > 0 && (
                    <div className="p-4 md:p-8 bg-white border-b border-slate-200">
                        <FieldRow delay={0} className="text-[14px] font-semibold text-slate-800 mb-8">
                            <h3>Associated Tags</h3>
                        </FieldRow>
                        <div className="grid grid-cols-2 gap-x-16 gap-y-5">
                            {availableTags.map((tag, idx) => (
                                <FieldRow key={tag._id} delay={30 + idx * 20} className="flex items-center gap-4">
                                    <Label help={false}>{tag.name}</Label>
                                    <Select
                                        value={selectedTagIds.find(id => tag.options?.some((opt: any) => opt._id === id)) || ""}
                                        onChange={(e) => {
                                            const newOptionId = e.target.value;
                                            const tagOptionIds = tag.options?.map((opt: any) => opt._id) || [];
                                            const otherSelectedIds = selectedTagIds.filter(id => !tagOptionIds.includes(id));
                                            setSelectedTagIds(newOptionId ? [...otherSelectedIds, newOptionId] : otherSelectedIds);
                                        }}
                                    >
                                        <option value="">Select {tag.name}</option>
                                        {tag.options?.map((opt: any) => (
                                            <option key={opt._id} value={opt._id}>{opt.name}</option>
                                        ))}
                                    </Select>
                                </FieldRow>
                            ))}
                        </div>
                    </div>
                )}

                {/* Footer Buttons */}
                <div className="px-6 py-6 bg-white flex items-center gap-3 mt-auto">
                    <button
                        type="submit"
                        disabled={isLoading}
                        className={`w-full md:w-auto cursor-pointer transition-all text-white px-6 py-2 rounded-md hover:brightness-110 text-[13px] font-semibold flex items-center justify-center gap-2 ${isLoading ? "opacity-70 cursor-not-allowed" : ""}`}
                        style={{ backgroundColor: uiAccent }}
                    >
                        {isLoading && <RefreshCw className="animate-spin" size={14} />}
                        Save
                    </button>
                    <button
                        type="button"
                        onClick={onCancel}
                        className="w-full md:w-auto cursor-pointer transition-all bg-white text-slate-600 px-6 py-2 rounded-md border-slate-300 border hover:bg-slate-50 text-[13px] font-semibold flex items-center justify-center"
                    >
                        Cancel
                    </button>
                </div>
            </form>

            <NewAccountModal isOpen={isAccountModalOpen} onClose={() => setIsAccountModalOpen(false)} defaultType={accountModalDefaultType} onCreated={(acc) => { setDbAccounts(prev => [...prev, acc]); setForm(f => ({ ...f, [pendingAccountField]: acc.accountName || acc.name })); setIsAccountModalOpen(false); }} />
            <NewTaxModal isOpen={isTaxModalOpen} onClose={() => setIsTaxModalOpen(false)} onCreated={(tax) => { setDbTaxes(prev => [...prev, tax]); setForm(f => ({ ...f, [pendingTaxField]: `${tax.name} [${tax.rate}%]` })); }} />
            <NewVendorModal isOpen={isVendorModalOpen} onClose={() => setIsVendorModalOpen(false)} onCreated={(v) => { setDbVendors(prev => [...prev, v]); setForm(f => ({ ...f, preferredVendor: v.name })); }} />
            <ManageUnitsModal isOpen={isManageUnitsModalOpen} onClose={() => setIsManageUnitsModalOpen(false)} onUnitsChanged={fetchData} />
        </div>
    );
}

const ImageIcon = ({ size, className }: { size: number, className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
    </svg>
);

