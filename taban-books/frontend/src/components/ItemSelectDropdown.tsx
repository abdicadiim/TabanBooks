import React from 'react';
import { Plus, Image as ImageIcon, Search } from 'lucide-react';
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
    const {
        searchTerm,
        setSearchTerm,
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

    // Sync searchTerm with external value if needed (optional, depends on UX)
    // For now, we rely on the hook's internal state for input, but initialize with value

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

            {isOpen && (
                <div className="absolute left-0 top-full mt-1 w-[400px] bg-white border border-gray-200 rounded-md shadow-lg z-[9999]">
                    {/* Header/Add New */}
                    <div className="bg-blue-600 text-white p-2 hidden"> {/* Hidden header based on design, optional */}
                        <span className="font-semibold">Items</span>
                    </div>

                    <div className="max-h-60 overflow-y-auto">
                        {loading ? (
                            <div className="p-4 text-center text-gray-500 text-sm">Loading...</div>
                        ) : items.length > 0 ? (
                            items.map((item) => (
                                <div
                                    key={item.id}
                                    onClick={() => handleSelectItem(item)}
                                    className="px-4 py-3 hover:bg-blue-600 hover:text-white cursor-pointer border-b border-gray-100 last:border-0 group"
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-gray-900 group-hover:text-white mb-0.5 truncate">
                                                {item.name}
                                            </div>
                                            <div className="text-xs text-gray-500 group-hover:text-blue-100 flex items-center gap-2">
                                                <span>SKU: {item.sku || 'N/A'}</span>
                                                <span className="w-1 h-1 rounded-full bg-gray-300 group-hover:bg-blue-200"></span>
                                                <span>Purchase Rate: AED {item.purchaseRate?.toFixed(2) || '0.00'}</span>
                                            </div>
                                        </div>
                                        {item.trackInventory && (
                                            <div className="text-right ml-4 flex-shrink-0">
                                                <div className="text-[10px] uppercase font-bold text-gray-400 group-hover:text-blue-100 mb-0.5">
                                                    Stock on Hand
                                                </div>
                                                <div className={`text-sm font-semibold ${item.stockOnHand && item.stockOnHand > 0 ? 'text-green-600' : 'text-red-500'} group-hover:text-white`}>
                                                    {item.stockOnHand?.toFixed(2) || '0.00'} {item.unit || ''}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-4 text-center text-gray-500 text-sm">
                                No items found.
                            </div>
                        )}
                    </div>

                    {/* Footer - Add New Item */}
                    <div className="border-t border-gray-200 p-2">
                        <button className="flex items-center text-blue-500 hover:text-blue-700 text-sm font-medium w-full px-2 py-1 rounded hover:bg-blue-50">
                            <Plus size={16} className="mr-2" />
                            Add New Item
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
