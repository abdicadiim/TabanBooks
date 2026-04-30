import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    MoreHorizontal,
    MoreVertical,
    Plus,
    ChevronDown,
    X,
    Star,
    RefreshCw,
    Lock,
    Unlock,
    Pencil,
    Trash2,
    Copy,
    Info,
    Image as ImageIcon,
    Filter,
    ArrowUpDown
} from "lucide-react";
import toast from "react-hot-toast";
import { apiRequest, itemsAPI, tagAssignmentsAPI, invoicesAPI, billsAPI, inventoryAdjustmentsAPI, reportsAPI, locationsAPI } from "../../../services/api";
import { Item, Z, fmtMoney } from "../itemsModel";
import LockItemModal from "./modals/LockItemModal";
import OpeningStockModal from "./modals/OpeningStockModal";
import AdjustStock from "./modals/AdjustStock";
import ReorderPointModal from "./modals/ReorderPointModal";
import { clearItemsSettingsCache, getItemsSettings } from "../../../utils/itemsSettings";
import { useCurrency } from "../../../hooks/useCurrency";
import { useOrganizationBranding } from "../../../hooks/useOrganizationBranding";

interface ItemDetailsProps {
    item: Item;
    onBack: () => void;
    onEdit: () => void;
    items: Item[];
    setItems: React.Dispatch<React.SetStateAction<Item[]>>;
    onUpdate: (data: any) => Promise<void>;
    setSelectedId: (id: string | null) => void;
    setView: (view: string) => void;
    onDelete: (id: string) => Promise<void>;
    onClone: (data: any) => void;
    baseCurrency?: any;
    canCreate?: boolean;
    canEdit?: boolean;
    canDelete?: boolean;
}

const FieldLabel = ({ children }: { children: React.ReactNode }) => (
    <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">{children}</div>
);

const FieldValue = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={`text-sm text-slate-900 font-medium ${className || ""}`}>{children || "-"}</div>
);

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <h3 className="text-sm font-semibold text-slate-900 mt-8 mb-4">{children}</h3>
);

const StatusCard = ({ label, value, onEdit, icon }: any) => (
    <div className="p-4 border-b border-gray-100 last:border-0 relative">
        <div className="flex justify-between items-start mb-1">
            <span className="text-[11px] font-bold text-slate-900 uppercase tracking-widest leading-none">{label}</span>
            {onEdit && (
                <button onClick={onEdit} className="text-blue-500 hover:text-blue-600 transition-colors">
                    {icon || <span className="text-xs font-medium lowercase flex items-center gap-1"><Pencil size={12} /> edit</span>}
                </button>
            )}
        </div>
        <div className="text-lg font-bold text-slate-900">{value}</div>
    </div>
);

const toFiniteNumber = (value: any): number | null => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
};

export default function ItemDetails({
    item,
    onBack,
    onEdit,
    items,
    setItems,
    onUpdate,
    setSelectedId,
    setView,
    onDelete,
    onClone,
    baseCurrency,
    canCreate = true,
    canEdit = true,
    canDelete = true,
}: ItemDetailsProps) {
    const navigate = useNavigate();
    const { symbol: currencySymbol } = useCurrency();
    const { accentColor } = useOrganizationBranding();
    const itemId = String(item.id || item._id || "").trim();
    const [activeTab, setActiveTab] = useState("overview");
    const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);
    const [showAdjustStock, setShowAdjustStock] = useState(false);
    const [showLockModal, setShowLockModal] = useState(false);
    const [showOpeningStockModal, setShowOpeningStockModal] = useState(false);
    const [showReorderPointModal, setShowReorderPointModal] = useState(false);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
    const [locations, setLocations] = useState<any[]>([]);
    const [isLoadingLocations, setIsLoadingLocations] = useState(false);
    const [inventorySummary, setInventorySummary] = useState<any>(null);
    const [stockViewMode, setStockViewMode] = useState<"accounting" | "physical">("accounting");
    const [txTypeFilter, setTxTypeFilter] = useState("Quotes");
    const [statusFilter, setStatusFilter] = useState("All");
    const [showTypeDropdown, setShowTypeDropdown] = useState(false);
    const [showStatusDropdown, setShowStatusDropdown] = useState(false);
    const [reorderNotificationEnabled, setReorderNotificationEnabled] = useState(false);
    const [isActionLoading, setIsActionLoading] = useState(false);

    const summaryStockOnHand =
        toFiniteNumber(inventorySummary?.stockOnHand) ??
        toFiniteNumber(inventorySummary?.stockQuantity) ??
        toFiniteNumber(inventorySummary?.quantityOnHand) ??
        toFiniteNumber(inventorySummary?.quantityAvailable) ??
        toFiniteNumber(inventorySummary?.availableQty);

    const resolvedStockOnHand =
        summaryStockOnHand ??
        toFiniteNumber(item.stockOnHand) ??
        toFiniteNumber(item.stockQuantity) ??
        toFiniteNumber(item.openingStock) ??
        0;

    const committedStock = toFiniteNumber(inventorySummary?.committedStock) ?? 0;
    const availableForSale = resolvedStockOnHand - committedStock;

    const transactionTypeOptions = [
        "Quotes",
        "Invoices",
        "Credit Notes",
        "Recurring Invoices",
        "Sales Receipts",
        "Bills",
        "Vendor Credits",
    ] as const;

    const vendorTransactionTypes = new Set(["Bills", "Vendor Credits", "Purchase Orders"]);
    const transactionConfigs: Record<string, {
        endpoint: string;
        typeLabel: string;
        referenceFields: string[];
        entityObjectField: string;
        entityNameFields: string[];
    }> = {
        Quotes: {
            endpoint: "/quotes?limit=1000",
            typeLabel: "Quote",
            referenceFields: ["quoteNumber", "estimate_number"],
            entityObjectField: "customer",
            entityNameFields: ["customerName", "customer_name"],
        },
        Invoices: {
            endpoint: "/sales-invoices?limit=1000",
            typeLabel: "Invoice",
            referenceFields: ["invoiceNumber", "invoice_number"],
            entityObjectField: "customer",
            entityNameFields: ["customerName", "customer_name"],
        },
        "Credit Notes": {
            endpoint: "/credit-notes?limit=1000",
            typeLabel: "Credit Note",
            referenceFields: ["creditNoteNumber", "credit_note_number"],
            entityObjectField: "customer",
            entityNameFields: ["customerName", "customer_name"],
        },
        "Recurring Invoices": {
            endpoint: "/recurring-invoices?limit=1000",
            typeLabel: "Recurring Invoice",
            referenceFields: ["profileName", "profile_name", "orderNumber"],
            entityObjectField: "customer",
            entityNameFields: ["customerName", "customer_name"],
        },
        "Sales Receipts": {
            endpoint: "/sales-receipts?limit=1000",
            typeLabel: "Sales Receipt",
            referenceFields: ["receiptNumber", "receipt_number"],
            entityObjectField: "customer",
            entityNameFields: ["customerName", "customer_name"],
        },
        Bills: {
            endpoint: "/bills?limit=1000",
            typeLabel: "Bill",
            referenceFields: ["billNumber", "bill_number"],
            entityObjectField: "vendor",
            entityNameFields: ["vendorName", "vendor_name"],
        },
        "Vendor Credits": {
            endpoint: "/vendor-credits?limit=1000",
            typeLabel: "Vendor Credit",
            referenceFields: ["vendorCreditNumber", "creditNote", "creditNumber", "credit_number"],
            entityObjectField: "vendor",
            entityNameFields: ["vendorName", "vendor_name"],
        },
    };

    const moreDropdownRef = useRef<HTMLDivElement>(null);
    const typeDropdownRef = useRef<HTMLDivElement>(null);
    const statusDropdownRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const refreshItemCoreData = async () => {
        if (!itemId) return;
        try {
            const response = await itemsAPI.getById(itemId);
            const latestItem = response?.data || response;
            if (!latestItem || typeof latestItem !== "object") return;

            const normalizedItem = {
                ...latestItem,
                id: latestItem.id || latestItem._id || itemId,
                _id: latestItem._id || latestItem.id || itemId,
            };

            setItems((prev) =>
                prev.map((existing) => {
                    const existingId = String(existing.id || existing._id || "").trim();
                    return existingId === itemId ? { ...existing, ...normalizedItem } : existing;
                })
            );
        } catch (error) {
            console.warn("Failed to hydrate item detail record", error);
        }
    };

    const refreshInventorySummary = async () => {
        try {
            const summaryRes = await reportsAPI.run("inventory_summary", {}).catch(() => null);
            const rows = Array.isArray(summaryRes?.data?.rows)
                ? summaryRes.data.rows
                : Array.isArray(summaryRes?.data)
                    ? summaryRes.data
                    : [];
            const matchedRow = rows.find((row: any) =>
                String(row.itemName || "").toLowerCase() === String(item.name || "").toLowerCase() ||
                String(row.sku || "").toLowerCase() === String(item.sku || "").toLowerCase()
            );
            setInventorySummary(matchedRow || null);
        } catch (error) {
            console.warn("Failed to refresh item inventory summary", error);
        }
    };

    // Fetch reorder notification setting
    useEffect(() => {
        const fetchSettings = async (forceRefresh = false) => {
            try {
                if (forceRefresh) {
                    clearItemsSettingsCache();
                }

                const settings = await getItemsSettings();
                setReorderNotificationEnabled(Boolean(settings?.notifyReorderPoint));
            } catch (error) {
                console.error("Failed to fetch settings:", error);
                setReorderNotificationEnabled(false);
            }
        };

        void fetchSettings();

        // Re-fetch when page becomes visible (user returns from settings)
        const handleVisibilityChange = () => {
            if (!document.hidden) {
                void fetchSettings(true);
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    // Click Outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (moreDropdownRef.current && !moreDropdownRef.current.contains(target)) setMoreDropdownOpen(false);
            if (typeDropdownRef.current && !typeDropdownRef.current.contains(target)) setShowTypeDropdown(false);
            if (statusDropdownRef.current && !statusDropdownRef.current.contains(target)) setShowStatusDropdown(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        void refreshItemCoreData();
    }, [itemId, setItems]);

    useEffect(() => {
        if (activeTab === "transactions") {
            void fetchTransactions();
        }
    }, [activeTab, item.id, item._id, txTypeFilter, statusFilter]);

    useEffect(() => {
        const loadLocationAndSummary = async () => {
            if (activeTab !== "overview" && activeTab !== "locations") return;
            setIsLoadingLocations(true);
            try {
                const [locRes, summaryRes] = await Promise.all([
                    locationsAPI.getAll().catch(() => ({ data: [] })),
                    reportsAPI.run("inventory_summary", {}).catch(() => null),
                ]);

                const locationData = Array.isArray(locRes?.data) ? locRes.data : (Array.isArray(locRes) ? locRes : []);
                setLocations(locationData);

                const rows = Array.isArray(summaryRes?.data?.rows)
                    ? summaryRes.data.rows
                    : Array.isArray(summaryRes?.data)
                        ? summaryRes.data
                        : [];
                const matchedRow = rows.find((row: any) =>
                    String(row.itemName || "").toLowerCase() === String(item.name || "").toLowerCase() ||
                    String(row.sku || "").toLowerCase() === String(item.sku || "").toLowerCase()
                );
                setInventorySummary(matchedRow || null);
            } catch (error) {
                console.warn("Failed to load item overview summary", error);
                setLocations([]);
                setInventorySummary(null);
            } finally {
                setIsLoadingLocations(false);
            }
        };

        void loadLocationAndSummary();
    }, [activeTab, item.name, item.sku]);

    useEffect(() => {
        const handlePurchaseSideRefresh = () => {
            void refreshItemCoreData();
            void refreshInventorySummary();
            if (activeTab === "transactions") {
                void fetchTransactions();
            }
        };

        window.addEventListener("itemsUpdated", handlePurchaseSideRefresh);
        window.addEventListener("billsUpdated", handlePurchaseSideRefresh);
        window.addEventListener("paymentsUpdated", handlePurchaseSideRefresh);

        return () => {
            window.removeEventListener("itemsUpdated", handlePurchaseSideRefresh);
            window.removeEventListener("billsUpdated", handlePurchaseSideRefresh);
            window.removeEventListener("paymentsUpdated", handlePurchaseSideRefresh);
        };
    }, [activeTab, itemId, item.name, item.sku]);

    const getFirstAvailableValue = (source: any, fields: string[]) => {
        for (const field of fields) {
            const value = source?.[field];
            if (value !== undefined && value !== null && String(value).trim() !== "") {
                return value;
            }
        }
        return "";
    };

    const buildTransactionRows = (records: any[], config: {
        typeLabel: string;
        referenceFields: string[];
        entityObjectField: string;
        entityNameFields: string[];
    }) => {
        const itemId = item.id || item._id;

        return records.reduce((rows: any[], tx: any) => {
            const lineItem = tx.items?.find((line: any) => {
                const lineItemId = typeof line?.item === "object"
                    ? line.item?._id || line.item?.id
                    : line?.item;
                return lineItemId === itemId;
            });

            if (!lineItem) {
                return rows;
            }

            const normalizedStatus = String(tx.status || "").toLowerCase();
            if (statusFilter !== "All" && normalizedStatus !== statusFilter.toLowerCase()) {
                return rows;
            }

            const entityObject = tx[config.entityObjectField];
            const entityName =
                getFirstAvailableValue(tx, config.entityNameFields) ||
                entityObject?.displayName ||
                entityObject?.companyName ||
                [entityObject?.firstName, entityObject?.lastName].filter(Boolean).join(" ").trim() ||
                "N/A";

            const quantity = Number(
                lineItem.quantity ?? lineItem.quantityAdjusted ?? lineItem.qty ?? 0,
            ) || 0;
            const price = Number(
                lineItem.unitPrice ?? lineItem.rate ?? lineItem.price ?? lineItem.costPrice ?? lineItem.sellingPrice ?? 0,
            ) || 0;
            const amount = Number(tx.total ?? lineItem.amount ?? quantity * price) || 0;
            const reference =
                getFirstAvailableValue(tx, config.referenceFields) ||
                tx.referenceNumber ||
                tx.reference ||
                tx._id ||
                tx.id ||
                "N/A";

            rows.push({
                id: tx._id || tx.id || `${config.typeLabel}-${reference}`,
                date: tx.date || tx.createdAt,
                type: config.typeLabel,
                reference,
                entity: entityName,
                quantity,
                price,
                amount,
                status: tx.status || "draft",
            });

            return rows;
        }, []);
    };

    const getTransactionNumberLabel = () => {
        switch (txTypeFilter) {
            case "Quotes":
                return "QUOTE NUMBER";
            case "Invoices":
                return "INVOICE NUMBER";
            case "Credit Notes":
                return "CREDIT NOTE NUMBER";
            case "Recurring Invoices":
                return "PROFILE NAME";
            case "Sales Receipts":
                return "SALES RECEIPT NUMBER";
            case "Bills":
                return "BILL NUMBER";
            case "Vendor Credits":
                return "VENDOR CREDIT NUMBER";
            default:
                return "REFERENCE";
        }
    };

    const getTransactionEntityLabel = () => (
        vendorTransactionTypes.has(txTypeFilter) ? "VENDOR NAME" : "CUSTOMER NAME"
    );

    const getTransactionQuantityLabel = () => (
        vendorTransactionTypes.has(txTypeFilter) ? "QUANTITY PURCHASED" : "QUANTITY SOLD"
    );

    const fetchTransactions = async () => {
        setIsLoadingTransactions(true);
        try {
            const selectedTypes = txTypeFilter === "All"
                ? transactionTypeOptions
                : [txTypeFilter];

            const transactionResults = await Promise.all(
                selectedTypes.map(async (type) => {
                    const config = transactionConfigs[type];
                    if (!config) {
                        return [];
                    }

                    try {
                        const response = await apiRequest(config.endpoint);
                        const records = Array.isArray(response?.data) ? response.data : [];
                        return buildTransactionRows(records, config);
                    } catch (error) {
                        console.warn(`Failed to fetch ${type} transactions:`, error);
                        return [];
                    }
                }),
            );

            const allTransactions = transactionResults
                .flat()
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            setTransactions(allTransactions);
        } catch (error) {
            console.error("Error fetching transactions:", error);
            toast.error("Failed to load transactions");
        } finally {
            setIsLoadingTransactions(false);
        }
    };

    const getStatusesForType = () => {
        switch (txTypeFilter) {
            case "Quotes":
                return ["All", "Draft", "Sent", "Client Viewed", "Accepted", "Invoiced", "Declined", "Expired"];
            case "Invoices":
                return ["All", "Draft", "Sent", "Viewed", "Partially Paid", "Paid", "Void", "Overdue"];
            case "Bills":
                return ["All", "Draft", "Open", "Overdue", "Paid", "Partially Paid", "Void"];
            default:
                return ["All", "Draft", "Sent", "Paid", "Void"];
        }
    };


    const handleClone = () => {
        const clonedData = {
            ...item,
            name: item.name,
            sku: item.sku
        };

        // Remove sensitive/unique identifiers
        const fieldsToRemove = ['_id', 'id', '__v', 'createdAt', 'updatedAt'];
        fieldsToRemove.forEach(field => delete (clonedData as any)[field]);

        onClone(clonedData);
        setMoreDropdownOpen(false);
    };

    const handleToggleActive = async () => {
        setIsActionLoading(true);
        try {
            const isCurrentlyInactive = item.active === false || item.isActive === false || item.status === "Inactive";
            const targetState = isCurrentlyInactive; // If it was inactive, we want it to be active (true)
            const newStatus = isCurrentlyInactive ? "Active" : "Inactive";

            await onUpdate({
                active: targetState,
                isActive: targetState,
                status: newStatus
            });
            setMoreDropdownOpen(false);
        } catch (error) {
            console.error("Action failed:", error);
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = async () => {
                const base64 = reader.result as string;
                const newImages = [base64, ...(item.images || [])];
                await onUpdate({ images: newImages });
            };
            reader.readAsDataURL(file);
        }
        if (e.target) {
            e.target.value = "";
        }
    };

    return (
        <div className="flex flex-col h-full bg-white relative">
            {/* Top Navigation / Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                    <h1 className="text-2xl font-bold text-slate-800 truncate">{item.name}</h1>
                    {(item.active === false || item.isActive === false || item.status === "Inactive") ? (
                        <span className="shrink-0 px-2 py-0.5 rounded bg-[#b1b1b1] text-white text-[10px] font-bold uppercase tracking-wider">
                            INACTIVE
                        </span>
                    ) : (
                        <span className="shrink-0 px-2 py-0.5 rounded bg-[#166534] text-white text-[10px] font-bold uppercase tracking-wider">
                            ACTIVE
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    {canEdit && (
                        <button onClick={onEdit} className="p-1.5 border border-gray-200 rounded-md hover:bg-gray-50 text-slate-500 transition-colors" title="Edit">
                            <Pencil size={18} />
                        </button>
                    )}

                    {(canCreate || canEdit || canDelete) && (
                        <div className="relative" ref={moreDropdownRef}>
                            <button
                                onClick={() => setMoreDropdownOpen(!moreDropdownOpen)}
                                className="p-1.5 border border-gray-200 rounded hover:bg-gray-50 transition-colors bg-white shadow-sm"
                                title="More"
                            >
                                <MoreVertical size={18} className="text-gray-500" />
                            </button>
                            {moreDropdownOpen && (
                                <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                                    <div className="p-0">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleClone();
                                                setMoreDropdownOpen(false);
                                            }}
                                            className="block w-full px-4 py-3 text-sm text-center text-white bg-[#156372] cursor-pointer hover:brightness-110 transition-all font-semibold shadow-sm"
                                        >
                                            Clone
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                void handleToggleActive();
                                            }}
                                            className="block w-full px-4 py-3 text-sm text-center text-gray-700 bg-transparent border-none cursor-pointer hover:bg-gray-50 transition-colors font-medium border-t border-gray-100"
                                        >
                                            {(item.active === false || item.isActive === false || item.status === "Inactive") ? "Mark as Active" : "Mark as Inactive"}
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDelete(item.id || item._id || "");
                                                setMoreDropdownOpen(false);
                                            }}
                                            className="block w-full px-4 py-3 text-sm text-center text-gray-700 bg-transparent border-none cursor-pointer hover:bg-gray-50 transition-colors font-medium border-t border-gray-100"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <button onClick={onBack} className="p-1 text-slate-400 hover:text-slate-600 ml-1 transition-colors">
                        <X size={24} strokeWidth={1} />
                    </button>
                </div>
            </div>

            {/* Tabs Bar - Scrollable on mobile */}
            <div className="flex items-center gap-4 sm:gap-8 px-6 border-b border-gray-100 overflow-x-auto no-scrollbar">
                {["Overview", "Locations", "Transactions", "History"].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab.toLowerCase())}
                        className={`py-3 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all ${activeTab === tab.toLowerCase() ? "border-[#1b5e6a] text-[#1b5e6a]" : "border-transparent text-slate-500 hover:text-slate-700"}`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
                {activeTab === "overview" && (
                    <div className="max-w-6xl mx-auto">
                        {!item.trackInventory ? (
                            // Simplified Layout for Non-tracked Items
                            <>
                                <div className="flex flex-col md:flex-row gap-8 md:gap-12 mb-8">
                                    {/* Top Fields */}
                                    <div className="flex-1 space-y-4">
                                        <div className="grid grid-cols-2 max-w-lg">
                                            <FieldLabel>Item Type</FieldLabel>
                                            <FieldValue>{item.type === "Goods" ? "Sales and Purchase Items" : "Services"}</FieldValue>
                                        </div>
                                        <div className="grid grid-cols-2 max-w-lg">
                                            <FieldLabel>SKU</FieldLabel>
                                            <FieldValue>{item.sku}</FieldValue>
                                        </div>
                                        <div className="grid grid-cols-2 max-w-lg">
                                            <FieldLabel>Unit</FieldLabel>
                                            <FieldValue>{item.unit}</FieldValue>
                                        </div>
                                        <div className="grid grid-cols-2 max-w-lg">
                                            <FieldLabel>Created Source</FieldLabel>
                                            <FieldValue>User</FieldValue>
                                        </div>
                                    </div>
                                    {/* Image Dropzone Box */}
                                    <div className="w-full md:w-72">
                                        <div
                                            className="border-2 border-dashed border-gray-200 rounded-lg p-8 flex flex-col items-center justify-center bg-gray-50/50 text-center cursor-pointer group hover:bg-white transition-colors relative h-48 overflow-hidden"
                                            onClick={() => canEdit && fileInputRef.current?.click()}
                                        >
                                            {item.images && item.images.length > 0 ? (
                                                <img
                                                    src={item.images[0]}
                                                    alt={item.name}
                                                    className="absolute inset-0 w-full h-full object-cover"
                                                />
                                            ) : (
                                                <>
                                                    <ImageIcon className="h-10 w-10 text-slate-300 mb-2 group-hover:text-teal-600 transition-colors" />
                                                    <div className="text-[11px] text-slate-400 font-medium">
                                                        Drag image(s) here or <br />
                                                        <span className="font-semibold" style={{ color: '#1b5e6a' }}>Browse Images</span>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="max-w-lg">
                                    <SectionTitle>Purchase Information</SectionTitle>
                                    <div className="grid grid-cols-2 space-y-4">
                                        <FieldLabel>Cost Price</FieldLabel>
                                        <FieldValue>{fmtMoney(item.costPrice || 0, currencySymbol)}</FieldValue>
                                        <FieldLabel>Purchase Account</FieldLabel>
                                        <FieldValue>{item.purchaseAccount}</FieldValue>
                                        {item.purchaseDescription && (
                                            <>
                                                <FieldLabel>Description</FieldLabel>
                                                <FieldValue className="italic text-slate-500">{item.purchaseDescription}</FieldValue>
                                            </>
                                        )}
                                    </div>

                                    <SectionTitle>Sales Information</SectionTitle>
                                    <div className="grid grid-cols-2 space-y-4">
                                        <FieldLabel>Selling Price</FieldLabel>
                                        <FieldValue>{fmtMoney(item.sellingPrice || 0, currencySymbol)}</FieldValue>
                                        <FieldLabel>Sales Account</FieldLabel>
                                        <FieldValue>{item.salesAccount}</FieldValue>
                                        {item.salesDescription && (
                                            <>
                                                <FieldLabel>Description</FieldLabel>
                                                <FieldValue className="italic text-slate-500">{item.salesDescription}</FieldValue>
                                            </>
                                        )}
                                    </div>

                                    <SectionTitle>Reporting Tags</SectionTitle>
                                    {item.tags && item.tags.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {item.tags.map((tag: any, i: number) => (
                                                <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold uppercase rounded border border-gray-200">
                                                    {tag.groupName}: {tag.name}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-sm text-slate-400">No reporting tag has been associated with this item.</div>
                                    )}
                                </div>
                            </>
                        ) : (
                            // Existing Detailed Layout for Tracked Items
                            <div className="flex flex-col md:flex-row gap-8 md:gap-12">
                                {/* Left Info Column (70%) */}
                                <div className="flex-1">
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 max-w-lg">
                                            <FieldLabel>Item Type</FieldLabel>
                                            <FieldValue>{item.type === "Goods" ? "Inventory Items" : "Services"}</FieldValue>
                                        </div>
                                        <div className="grid grid-cols-2 max-w-lg">
                                            <FieldLabel>SKU</FieldLabel>
                                            <FieldValue>{item.sku}</FieldValue>
                                        </div>
                                        <div className="grid grid-cols-2 max-w-lg">
                                            <FieldLabel>Unit</FieldLabel>
                                            <FieldValue>{item.unit}</FieldValue>
                                        </div>
                                        <div className="grid grid-cols-2 max-w-lg">
                                            <FieldLabel>Created Source</FieldLabel>
                                            <FieldValue>User</FieldValue>
                                        </div>
                                        <div className="grid grid-cols-2 max-w-lg">
                                            <FieldLabel>Inventory Account</FieldLabel>
                                            <FieldValue>{item.inventoryAccount || "Inventory Asset"}</FieldValue>
                                        </div>
                                        <div className="grid grid-cols-2 max-w-lg">
                                            <FieldLabel>Inventory Valuation Method</FieldLabel>
                                            <FieldValue>{item.inventoryValuationMethod || "FIFO (First In First Out)"}</FieldValue>
                                        </div>

                                        <SectionTitle>Purchase Information</SectionTitle>
                                        <div className="grid grid-cols-2 max-w-lg space-y-4">
                                            <FieldLabel>Cost Price</FieldLabel>
                                            <FieldValue>{fmtMoney(item.costPrice || 0, currencySymbol)}</FieldValue>
                                            <FieldLabel>Purchase Account</FieldLabel>
                                            <FieldValue>{item.purchaseAccount}</FieldValue>
                                            <FieldLabel>Description</FieldLabel>
                                            <FieldValue className="italic text-slate-500">{item.purchaseDescription}</FieldValue>
                                            <FieldLabel>Preferred Vendor</FieldLabel>
                                            <FieldValue className="text-blue-600">{item.preferredVendor}</FieldValue>
                                        </div>

                                        <SectionTitle>Sales Information</SectionTitle>
                                        <div className="grid grid-cols-2 max-w-lg space-y-4">
                                            <FieldLabel>Selling Price</FieldLabel>
                                            <FieldValue>{fmtMoney(item.sellingPrice || 0, currencySymbol)}</FieldValue>
                                            <FieldLabel>Sales Account</FieldLabel>
                                            <FieldValue>{item.salesAccount}</FieldValue>
                                            <FieldLabel>Description</FieldLabel>
                                            <FieldValue className="italic text-slate-500">{item.salesDescription}</FieldValue>
                                        </div>

                                        {item.tags && item.tags.length > 0 && (
                                            <>
                                                <SectionTitle>Reporting Tags</SectionTitle>
                                                <div className="flex flex-wrap gap-2">
                                                    {item.tags.map((tag: any, i: number) => (
                                                        <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold uppercase rounded border border-gray-200">
                                                            {tag.groupName}: {tag.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Right Status Column (30%) */}
                                <div className="w-full md:w-72 flex flex-col gap-6">
                                    {/* Image Dropzone Box */}
                                    <div
                                        className="border-2 border-dashed border-gray-200 rounded-lg p-8 flex flex-col items-center justify-center bg-gray-50/50 text-center cursor-pointer group hover:bg-white transition-colors relative h-48 overflow-hidden"
                                        onClick={() => canEdit && fileInputRef.current?.click()}
                                    >
                                        {item.images && item.images.length > 0 ? (
                                            <img
                                                src={item.images[0]}
                                                alt={item.name}
                                                className="absolute inset-0 w-full h-full object-cover"
                                            />
                                        ) : (
                                            <>
                                                <ImageIcon className="h-10 w-10 text-slate-300 mb-2 group-hover:text-blue-400 transition-colors" />
                                                <div className="text-[11px] text-slate-400 font-medium">
                                                    Drag image(s) here or <br />
                                                    <span className="text-blue-500 font-semibold">Browse Images</span>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    {/* Status Cards Container */}
                                    <div className="bg-[#fcfdfe] border border-gray-100 rounded-md overflow-hidden">
                                        <StatusCard
                                            label="Opening Stock"
                                            value={parseFloat(String(item.openingStock || 0)).toFixed(2)}
                                            onEdit={canEdit ? () => setShowOpeningStockModal(true) : undefined}
                                        />
                                        <StatusCard
                                            label="Stock on Hand"
                                            value={resolvedStockOnHand.toFixed(2)}
                                        />
                                        <StatusCard
                                            label="Committed Stock"
                                            value={committedStock.toFixed(2)}
                                        />
                                        <StatusCard
                                            label="Available for Sale"
                                            value={availableForSale.toFixed(2)}
                                        />

                                        {/* Mini metrics row */}
                                        <div className="flex border-b border-gray-100">
                                            <div className="flex-1 p-4 border-r border-gray-100 last:border-r-0">
                                                <div className="text-xl font-bold flex items-baseline gap-1.5">
                                                    0 <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Qty</span>
                                                </div>
                                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">To be Invoiced</div>
                                            </div>
                                            <div className="flex-1 p-4 border-r border-gray-100 last:border-r-0">
                                                <div className="text-xl font-bold flex items-baseline gap-1.5">
                                                    0 <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Qty</span>
                                                </div>
                                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">To be Billed</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Reorder Point Section */}
                                    <div className="mt-6">
                                        <h3 className="text-sm font-semibold text-slate-900 mb-3">Reorder Point</h3>
                                        {!reorderNotificationEnabled ? (
                                            <div className="bg-orange-50 border border-orange-200 rounded-md p-4">
                                                <p className="text-sm text-slate-700">
                                                    You have to enable reorder notification before setting reorder point for items.{' '}
                                                    <button
                                                        onClick={() => navigate('/settings/items')}
                                                        className="text-blue-600 hover:text-blue-700 font-medium hover:underline"
                                                    >
                                                        Click here
                                                    </button>
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="bg-[#fcfdfe] border border-gray-100 rounded-md overflow-hidden">
                                                <StatusCard
                                                    label="Reorder Point"
                                                    value={parseFloat(String(item.reorderPoint || 0)).toFixed(2)}
                                                    onEdit={canEdit ? () => setShowReorderPointModal(true) : undefined}
                                                    icon={<Pencil size={12} className="text-blue-500" />}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === "transactions" && (
                    <div className="flex flex-col gap-4">
                        {/* Filter Bar */}
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="relative" ref={typeDropdownRef}>
                                <button
                                    onClick={() => setShowTypeDropdown(!showTypeDropdown)}
                                    className="px-3 py-1.5 border border-gray-200 rounded text-sm font-medium text-slate-600 bg-gray-50/50 hover:bg-white flex items-center gap-2 transition-colors"
                                >
                                    <span className="text-slate-400 font-normal">Filter By:</span> {txTypeFilter} <ChevronDown size={14} className="text-slate-400" />
                                </button>
                                {showTypeDropdown && (
                                    <div className="absolute left-0 mt-1 w-56 bg-white border border-gray-200 rounded shadow-xl z-[60] py-1 antialiased">
                                        {transactionTypeOptions.map(type => (
                                            <button
                                                key={type}
                                                onClick={() => { setTxTypeFilter(type); setStatusFilter("All"); setShowTypeDropdown(false); }}
                                                className={`w-full text-left px-4 py-2 text-sm hover:bg-blue-600 hover:text-white transition-colors ${txTypeFilter === type ? "bg-blue-600 text-white" : "text-slate-600"}`}
                                            >
                                                {type}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="relative" ref={statusDropdownRef}>
                                <button
                                    onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                                    className="px-3 py-1.5 border border-gray-200 rounded text-sm font-medium text-slate-600 bg-gray-50/50 hover:bg-white flex items-center gap-2 transition-colors"
                                >
                                    <span className="text-slate-400 font-normal">Status:</span> {statusFilter} <ChevronDown size={14} className="text-slate-400" />
                                </button>
                                {showStatusDropdown && (
                                    <div className="absolute left-0 mt-1 w-48 bg-white border border-gray-200 rounded shadow-xl z-[60] py-1 antialiased">
                                        {getStatusesForType().map(status => (
                                            <button
                                                key={status}
                                                onClick={() => { setStatusFilter(status); setShowStatusDropdown(false); }}
                                                className={`w-full text-left px-4 py-2 text-sm hover:bg-blue-600 hover:text-white transition-colors ${statusFilter === status ? "bg-blue-600 text-white" : "text-slate-600"}`}
                                            >
                                                {status}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Transactions Table */}
                        <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-x-auto min-h-[400px]">
                            {isLoadingTransactions ? (
                                <div className="flex items-center justify-center h-64">
                                    <RefreshCw className="animate-spin text-blue-500" size={32} />
                                </div>
                            ) : transactions.length > 0 ? (
                                <table className="w-full text-left border-collapse min-w-[700px]">
                                    <thead className="bg-[#fcfdfe] border-b border-gray-100">
                                        <tr>
                                            <th className="px-6 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                <div className="flex items-center gap-1 cursor-pointer hover:text-slate-600 uppercase">
                                                    Date <ArrowUpDown size={10} />
                                                </div>
                                            </th>
                                            <th className="px-6 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">{getTransactionNumberLabel()}</th>
                                            <th className="px-6 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">{getTransactionEntityLabel()}</th>
                                            <th className="px-6 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">{getTransactionQuantityLabel()}</th>
                                            <th className="px-6 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">PRICE</th>
                                            <th className="px-6 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">TOTAL</th>
                                            <th className="px-6 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">STATUS</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {transactions.map((tx) => (
                                            <tr key={tx.id} className="hover:bg-blue-50/20 transition-colors group border-b border-gray-50 last:border-0">
                                                <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">
                                                    {new Date(tx.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </td>
                                                <td className="px-6 py-4 text-sm font-medium text-blue-600 cursor-pointer hover:underline">{tx.reference}</td>
                                                <td className="px-6 py-4 text-sm text-slate-900">{tx.entity}</td>
                                                <td className="px-6 py-4 text-sm text-slate-600 text-right">{parseFloat(tx.quantity).toFixed(2)}</td>
                                                <td className="px-6 py-4 text-sm text-slate-600 text-right">{fmtMoney(tx.price, currencySymbol)}</td>
                                                <td className="px-6 py-4 text-sm font-bold text-slate-900 text-right">
                                                    {fmtMoney(tx.amount, currencySymbol)}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`text-[13px] font-medium ${['paid', 'accepted', 'invoiced', 'adjusted'].includes(tx.status?.toLowerCase()) ? 'text-green-600' :
                                                        ['draft'].includes(tx.status?.toLowerCase()) ? 'text-slate-400' :
                                                            ['sent', 'open'].includes(tx.status?.toLowerCase()) ? 'text-blue-500' :
                                                                'text-orange-500'
                                                        }`}>
                                                        {tx.status?.charAt(0).toUpperCase() + tx.status?.slice(1)}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-64 text-center">
                                    <div className="bg-gray-50 p-4 rounded-full mb-4">
                                        <RefreshCw className="text-slate-200" size={32} />
                                    </div>
                                    <h4 className="text-sm font-semibold text-slate-900 mb-1">No transactions found</h4>
                                    <p className="text-xs text-slate-400">There are no {txTypeFilter.toLowerCase()} found matching your filter.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === "locations" && (
                    <div className="max-w-6xl mx-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-slate-900">Stock Locations</h2>
                            <div className="inline-flex rounded-md overflow-hidden border border-blue-500 bg-white">
                                <button
                                    type="button"
                                    onClick={() => setStockViewMode("accounting")}
                                className={`px-4 py-1.5 text-sm transition-colors ${stockViewMode === "accounting" ? "text-white" : "bg-white hover:bg-blue-50"}`}
                                style={stockViewMode === "accounting" ? { backgroundColor: accentColor } : { color: accentColor }}
                                >
                                    Accounting Stock
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setStockViewMode("physical")}
                                    className={`px-4 py-1.5 text-sm transition-colors ${stockViewMode === "physical" ? "text-white" : "bg-white hover:bg-blue-50"}`}
                                    style={stockViewMode === "physical" ? { backgroundColor: accentColor } : { color: accentColor }}
                                >
                                    Physical Stock
                                </button>
                            </div>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                            {isLoadingLocations ? (
                                <div className="p-8 text-center text-slate-500">Loading locations...</div>
                            ) : (
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                                        <tr>
                                            <th className="text-left px-4 py-3">Location Name</th>
                                            <th className="text-center px-4 py-3" colSpan={3}>
                                              {stockViewMode === "accounting" ? "Accounting Stock" : "Physical Stock"}
                                            </th>
                                        </tr>
                                        <tr className="border-t border-gray-200">
                                            <th className="text-left px-4 py-2"></th>
                                            <th className="text-right px-4 py-2">Stock On Hand</th>
                                            <th className="text-right px-4 py-2">Committed Stock</th>
                                            <th className="text-right px-4 py-2">Available for Sale</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(locations.length ? locations : [{ name: item.locationName || "Head Office" }]).map((loc: any, idx: number) => (
                                            <tr key={loc._id || loc.id || idx} className="border-t border-gray-100">
                                                <td className="px-4 py-3 text-slate-900">{loc.name || loc.locationName || "Head Office"}</td>
                                                <td className="px-4 py-3 text-right">{resolvedStockOnHand.toFixed(2)}</td>
                                                <td className="px-4 py-3 text-right">{committedStock.toFixed(2)}</td>
                                                <td className="px-4 py-3 text-right">{availableForSale.toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === "history" && (
                    <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden p-8">
                        <div className="relative border-l-2 border-slate-100 pl-8 ml-4 space-y-12">
                            <div className="relative">
                                <div className="absolute -left-[41px] top-1 bg-blue-600 rounded-full w-4 h-4 border-4 border-white"></div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold text-slate-900 mb-1">Item Created</span>
                                    <span className="text-xs text-slate-500 mb-2">Item was added to the inventory system.</span>
                                    <div className="bg-slate-50 rounded-md p-3 text-[11px] text-slate-600 font-mono inline-block w-fit">
                                        {item.createdAt ? new Date(item.createdAt).toLocaleString() : "Initial Record"}
                                    </div>
                                </div>
                            </div>
                            {item.updatedAt && item.updatedAt !== item.createdAt && (
                                <div className="relative">
                                    <div className="absolute -left-[41px] top-1 bg-slate-400 rounded-full w-4 h-4 border-4 border-white"></div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-slate-900 mb-1">Last System Update</span>
                                        <span className="text-xs text-slate-500 mb-2">Detailed property modifications.</span>
                                        <div className="bg-slate-50 rounded-md p-3 text-[11px] text-slate-600 font-mono inline-block w-fit">
                                            {new Date(item.updatedAt).toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div className="relative">
                                <div className="absolute -left-[41px] top-1 bg-slate-200 rounded-full w-4 h-4 border-4 border-white"></div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold text-slate-900 mb-1">Inventory Tracking Enabled</span>
                                    <span className="text-xs text-slate-500">Tracking started with opening stock: {item.openingStock || 0}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {showLockModal && <LockItemModal onClose={() => setShowLockModal(false)} onLock={async (c, r) => { await onUpdate({ ...item, locked: true, lockConfig: c, lockReason: r }); setShowLockModal(false); }} />}
            {showOpeningStockModal && <OpeningStockModal item={item} onClose={() => setShowOpeningStockModal(false)} onSave={async (d) => { await onUpdate({ ...item, ...d }); setShowOpeningStockModal(false); }} />}
            {showReorderPointModal && <ReorderPointModal currentValue={parseFloat(String(item.reorderPoint || 0))} onClose={() => setShowReorderPointModal(false)} onSave={async (v) => { await onUpdate({ ...item, reorderPoint: v }); setShowReorderPointModal(false); }} />}

            <input
                ref={fileInputRef}
                type="file"
                hidden
                accept="image/*"
                onChange={handleImageUpload}
            />
        </div>
    );
}
