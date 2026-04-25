import { useState, useRef, useEffect, useCallback } from 'react';
import { itemsAPI } from '../services/api';
import { filterActiveRecords } from '../utils/activeFilters';

export interface Item {
    id: string;
    name: string;
    sku?: string;
    rate: number;
    purchaseRate?: number;
    salesRate?: number;
    stockOnHand?: number;
    description?: string;
    trackInventory?: boolean;
    unit?: string;
    purchaseAccount?: string;
    inventoryAccount?: string;
    taxPreference?: string;
    tax?: any;
}

const ITEM_SELECT_CACHE_KEY = "purchase-order-items-cache";

interface UseItemSelectProps {
    onSelect?: (item: Item) => void;
    initialValue?: string;
}

export const useItemSelect = ({ onSelect, initialValue = '' }: UseItemSelectProps = {}) => {
  const [searchTerm, setSearchTerm] = useState(initialValue);
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<Item[]>(() => {
    if (typeof window === "undefined") {
      return [];
    }

    try {
      const cached = window.sessionStorage.getItem(ITEM_SELECT_CACHE_KEY);
      if (!cached) return [];
      const parsed = JSON.parse(cached);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<NodeJS.Timeout | null>(null);

    const fetchItems = useCallback(async (query: string = '') => {
        setLoading(true);
        try {
            // Use search if query exists, otherwise getAll (or a default set)
            const response = query
                ? await itemsAPI.search(query)
                : await itemsAPI.getAll();

            if (response && (response.data || response.items)) {
                const activeItems = filterActiveRecords(response.data || response.items || []);
                // Normalized data mapping
                const fetchedItems = activeItems.map((item: any) => ({
                    id: item._id || item.id,
                    name: item.name,
                    sku: item.sku || '',
                    rate: item.rate || 0,
                    purchaseRate: item.purchaseRate || item.costPrice || 0, // Handle different field names
                    salesRate: item.salesRate || item.sellingPrice || 0,
                    stockOnHand: item.stockQuantity || item.stockOnHand || item.quantity || 0,
                    description: item.description || item.salesDescription || '',
                    trackInventory: item.trackInventory,
                    unit: item.unit,
                    purchaseAccount: item.purchaseAccount || item.purchase_account,
                    inventoryAccount: item.inventoryAccount || item.inventory_account,
                    taxPreference: item.taxPreference, // taxable or tax-exempt
                    tax: item.tax
                }));
                setItems(fetchedItems);
                if (!query && typeof window !== "undefined") {
                    try {
                        window.sessionStorage.setItem(ITEM_SELECT_CACHE_KEY, JSON.stringify(fetchedItems));
                    } catch {
                        // ignore cache write failures
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching items:', error);
            setItems([]);
        } finally {
            setLoading(false);
        }
    }, []);

    // Initial load
    useEffect(() => {
        if (!isOpen || items.length > 0) {
            return;
        }

        try {
            if (typeof window !== "undefined") {
                const cached = window.sessionStorage.getItem(ITEM_SELECT_CACHE_KEY);
                if (cached) {
                    const parsed = JSON.parse(cached);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        setItems(parsed);
                        return;
                    }
                }
            }
        } catch {
            // fall through to fetch
        }

        fetchItems();
    }, [isOpen, fetchItems, items.length]);

    // Handle search input change with debounce
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearchTerm(value);
        setIsOpen(true);

        if (debounceRef.current) clearTimeout(debounceRef.current);

        debounceRef.current = setTimeout(() => {
            fetchItems(value);
        }, 500); // 500ms debounce
    };

    const handleSelectItem = (item: Item) => {
        setSearchTerm(item.name); // Set input to item name
        setIsOpen(false);
        if (onSelect) {
            onSelect(item);
        }
    };

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return {
        searchTerm,
        setSearchTerm,
        isOpen,
        setIsOpen,
        items,
        loading,
        dropdownRef,
        handleSearchChange,
        handleSelectItem,
    };
};
