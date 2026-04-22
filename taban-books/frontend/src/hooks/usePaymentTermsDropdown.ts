import { useState, useRef, useEffect } from 'react';

export interface PaymentTerm {
    id: string;
    label: string;
    value: string;
    days?: number;
    discountDays?: number;
    discountPercentage?: number;
    isDefault?: boolean;
}

export const defaultPaymentTerms: PaymentTerm[] = [
    { id: '1', label: 'Due on Receipt', value: 'Due on Receipt', days: 0 },
    { id: '2', label: 'Net 15', value: 'Net 15', days: 15 },
    { id: '3', label: 'Net 30', value: 'Net 30', days: 30 },
    { id: '4', label: 'Net 45', value: 'Net 45', days: 45 },
    { id: '5', label: 'Net 60', value: 'Net 60', days: 60 },
    { id: '6', label: 'Due end of the month', value: 'Due end of the month' },
    { id: '7', label: 'Due end of next month', value: 'Due end of next month' },
];

interface UsePaymentTermsDropdownProps {
    initialValue?: string;
    onSelect?: (term: PaymentTerm) => void;
    customTerms?: PaymentTerm[];
}

interface UsePaymentTermsDropdownReturn {
    selectedTerm: string;
    isOpen: boolean;
    searchQuery: string;
    filteredTerms: PaymentTerm[];
    dropdownRef: React.RefObject<HTMLDivElement>;
    setSelectedTerm: (term: string) => void;
    setIsOpen: (open: boolean) => void;
    setSearchQuery: (query: string) => void;
    handleSelect: (term: PaymentTerm) => void;
    handleToggle: () => void;
}

/**
 * Custom hook for managing payment terms dropdown
 * Provides state management and filtering logic for payment terms selection
 */
export const usePaymentTermsDropdown = ({
    initialValue = 'Due on Receipt',
    onSelect,
    customTerms,
}: UsePaymentTermsDropdownProps = {}): UsePaymentTermsDropdownReturn => {
    const [selectedTerm, setSelectedTerm] = useState<string>(initialValue);
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    const terms = customTerms || defaultPaymentTerms;

    // Filter terms based on search query
    const filteredTerms = terms.filter((term) =>
        term.label.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Handle term selection
    const handleSelect = (term: PaymentTerm) => {
        setSelectedTerm(term.value);
        setIsOpen(false);
        setSearchQuery('');
        if (onSelect) {
            onSelect(term);
        }
    };

    // Toggle dropdown
    const handleToggle = () => {
        setIsOpen(!isOpen);
        if (!isOpen) {
            setSearchQuery('');
        }
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearchQuery('');
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    return {
        selectedTerm,
        isOpen,
        searchQuery,
        filteredTerms,
        dropdownRef: dropdownRef as React.RefObject<HTMLDivElement>,
        setSelectedTerm,
        setIsOpen,
        setSearchQuery,
        handleSelect,
        handleToggle,
    };
};
