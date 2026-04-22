import { useState, useRef, useEffect, useCallback } from 'react';
import { accountsAPI } from '../services/api';
import { filterActiveRecords } from '../utils/activeFilters';

export interface Account {
    id: string;
    name: string;
    accountCode: string;
    accountType: string;
    description?: string;
    isActive?: boolean;
}

interface UseAccountSelectProps {
    onSelect?: (account: Account) => void;
    initialValue?: string;
    type?: string; // Optional filter by single account type (legacy/backend support)
    allowedTypes?: string[]; // Optional filter by multiple account types (frontend filtering)
}

export const useAccountSelect = ({ onSelect, initialValue = '', type, allowedTypes }: UseAccountSelectProps = {}) => {
    const [searchTerm, setSearchTerm] = useState(initialValue);
    const [isOpen, setIsOpen] = useState(false);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<NodeJS.Timeout | null>(null);

    const fetchAccounts = useCallback(async (query: string = '') => {
        setLoading(true);
        try {
            const params: any = { search: query, limit: 1000 }; // Fetch more to allow frontend filtering
            if (type) params.type = type;

            const response = await accountsAPI.getAll(params);

            if (response && response.data) {
                let fetchedAccounts = filterActiveRecords(response.data).map((acc: any) => ({
                    id: acc._id || acc.id,
                    name: acc.accountName || acc.name,
                    accountCode: acc.accountCode,
                    accountType: acc.accountType,
                    description: acc.description,
                    isActive: acc.isActive
                }));

                // Filter by allowedTypes if provided
                if (allowedTypes && allowedTypes.length > 0) {
                    fetchedAccounts = fetchedAccounts.filter((acc: Account) =>
                        allowedTypes.includes(acc.accountType)
                    );
                }

                setAccounts(fetchedAccounts);
            }
        } catch (error) {
            console.error('Error fetching accounts:', error);
            setAccounts([]);
        } finally {
            setLoading(false);
        }
    }, [type, allowedTypes]); // We include allowedTypes here. Ensure parent passes a stable reference or memoizes it.

    // Initial load when dropdown opens
    useEffect(() => {
        if (isOpen && accounts.length === 0) {
            fetchAccounts();
        }
    }, [isOpen, fetchAccounts, accounts.length]);

    // Handle search input change with debounce
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearchTerm(value);
        setIsOpen(true);

        if (debounceRef.current) clearTimeout(debounceRef.current);

        debounceRef.current = setTimeout(() => {
            fetchAccounts(value);
        }, 500);
    };

    const handleSelectAccount = (account: Account) => {
        setSearchTerm(account.name);
        setIsOpen(false);
        if (onSelect) {
            onSelect(account);
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

    // Group accounts by type for display
    const groupedAccounts = accounts.reduce((acc, account) => {
        const type = account.accountType || 'Other';
        // Capitalize and format type
        const formattedType = type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

        if (!acc[formattedType]) {
            acc[formattedType] = [];
        }
        acc[formattedType].push(account);
        return acc;
    }, {} as Record<string, Account[]>);

    return {
        searchTerm,
        setSearchTerm,
        isOpen,
        setIsOpen,
        accounts,
        filteredAccounts: accounts,
        groupedAccounts,
        loading,
        dropdownRef,
        handleSearchChange,
        handleSelectAccount,
    };
};
