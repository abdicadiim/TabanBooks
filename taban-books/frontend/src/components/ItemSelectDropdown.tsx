import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus } from 'lucide-react';
import { useItemSelect, Item } from '../hooks/useItemSelect';

interface ItemSelectDropdownProps {
    value: string;
    onSelect: (item: Item) => void;
    placeholder?: string;
    className?: string;
}

export const ItemSelectDropdown: React.FC<ItemSelectDropdownProps> = ({
    value,
    onSelect,
    placeholder = "Type or click to select an item.",
    className = "",
}) => {
    const menuRef = useRef<HTMLDivElement>(null);
    const [menuStyle, setMenuStyle] = useState<{ left: number; top: number; width: number } | null>(null);
    const {
        searchTerm,
        isOpen,
        setIsOpen,
        items,
        loading,
        dropdownRef,
        handleSearchChange,
        handleSelectItem,
    } = useItemSelect({
        onSelect: (item) => {
            // Update local search term to match selected item
            onSelect(item);
        },
        initialValue: value
    });

    useEffect(() => {
        if (!isOpen || !dropdownRef.current) return;

        const updateMenuPosition = () => {
            if (!dropdownRef.current) return;
            const rect = dropdownRef.current.getBoundingClientRect();
            setMenuStyle({
                left: rect.left,
                top: rect.bottom + 6,
                width: Math.max(rect.width, 420),
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
    }, [isOpen, dropdownRef]);

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            <input
                type="text"
                value={searchTerm}
                onChange={handleSearchChange}
                onFocus={() => setIsOpen(true)}
                placeholder={placeholder}
                className="w-full border-none outline-none bg-transparent text-sm text-gray-900 placeholder:text-gray-400"
            />

            {isOpen && menuStyle && typeof document !== "undefined" ? createPortal(
                <div
                    ref={menuRef}
                    className="fixed z-[13000] overflow-hidden rounded-md border border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.18)]"
                    style={{
                        left: menuStyle.left,
                        top: menuStyle.top,
                        width: menuStyle.width,
                    }}
                    onMouseDown={(event) => {
                        event.stopPropagation();
                    }}
                >
                    <div className="max-h-60 overflow-y-auto">
                        {loading ? (
                            <div className="p-4 text-center text-gray-500 text-sm">Loading...</div>
                        ) : items.length > 0 ? (
                            items.map((item) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => handleSelectItem(item)}
                                    className="w-full border-b border-slate-100 px-4 py-3 text-left last:border-b-0 hover:bg-[#f3f8ff]"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="min-w-0 flex-1">
                                            <div className="truncate font-medium text-slate-900">
                                                {item.name}
                                            </div>
                                            <div className="mt-1 text-xs text-slate-500">
                                                <span>SKU: {item.sku || 'N/A'}</span>
                                                <span className="mx-1.5 inline-block h-1 w-1 rounded-full bg-slate-300 align-middle" />
                                                <span>Purchase Rate: KES {item.purchaseRate?.toFixed(2) || '0.00'}</span>
                                            </div>
                                        </div>
                                        {item.trackInventory && (
                                            <div className="flex-shrink-0 text-right">
                                                <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                                    Stock on Hand
                                                </div>
                                                <div className={`text-sm font-semibold ${item.stockOnHand && item.stockOnHand > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                                                    {item.stockOnHand?.toFixed(2) || '0.00'} {item.unit || ''}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </button>
                            ))
                        ) : (
                            <div className="p-4 text-center text-gray-500 text-sm">
                                No items found.
                            </div>
                        )}
                    </div>

                    <div className="border-t border-slate-100 p-2">
                        <button className="flex w-full items-center rounded px-2 py-1 text-left text-sm font-medium text-[#156372] hover:bg-slate-50">
                            <Plus size={16} className="mr-2" />
                            Add New Item
                        </button>
                    </div>
                </div>,
                document.body
            ) : null}
        </div>
    );
};
