import React from 'react';
import { Search, Check, Settings } from 'lucide-react';
import { usePaymentTermsDropdown, PaymentTerm } from '../hooks/usePaymentTermsDropdown';

interface PaymentTermsDropdownProps {
    value: string;
    onChange: (value: string) => void;
    onConfigureTerms?: () => void;
    customTerms?: PaymentTerm[];
    className?: string;
    disabled?: boolean;
}

/**
 * Reusable Payment Terms Dropdown Component
 * Matches the design from the screenshot with search functionality
 */
export const PaymentTermsDropdown: React.FC<PaymentTermsDropdownProps> = ({
    value,
    onChange,
    onConfigureTerms,
    customTerms,
    className = '',
    disabled = false,
}) => {
    const {
        selectedTerm,
        isOpen,
        searchQuery,
        filteredTerms,
        dropdownRef,
        setIsOpen,
        setSearchQuery,
        setSelectedTerm,
        handleSelect,
        handleToggle,
    } = usePaymentTermsDropdown({
        initialValue: value,
        onSelect: (term) => onChange(term.value),
        customTerms,
    });

    // Update selected term when value prop changes
    React.useEffect(() => {
        if (value !== selectedTerm) {
            setSelectedTerm(value);
        }
    }, [value, selectedTerm, setSelectedTerm]);

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            {/* Main Dropdown Button */}
            <button
                type="button"
                onClick={handleToggle}
                disabled={disabled}
                className="w-full px-3 py-2 text-left bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed flex items-center justify-between"
            >
                <span className="text-sm text-gray-900">{value || 'Select payment term'}</span>
                <svg
                    className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'transform rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-80 overflow-hidden">
                    {/* Search Input */}
                    <div className="p-2 border-b border-gray-200">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search"
                                className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>

                    {/* Options List */}
                    <div className="max-h-60 overflow-y-auto">
                        {filteredTerms.length > 0 ? (
                            filteredTerms.map((term) => (
                                <button
                                    key={term.id}
                                    type="button"
                                    onClick={() => handleSelect(term)}
                                    className={`w-full px-3 py-2.5 text-left text-sm flex items-center justify-between transition-colors ${value === term.value ? 'bg-transparent text-gray-900' : 'text-gray-900 hover:bg-teal-50'
                                        }`}
                                >
                                    <span>{term.label}</span>
                                    {value === term.value && (
                                        <Check className="w-4 h-4 text-[#156372]" />
                                    )}
                                </button>
                            ))
                        ) : (
                            <div className="px-3 py-4 text-sm text-gray-500 text-center">
                                No payment terms found
                            </div>
                        )}
                    </div>

                    {/* Configure Terms Button */}
                    {onConfigureTerms && (
                        <div className="border-t border-gray-200">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsOpen(false);
                                    onConfigureTerms();
                                }}
                                className="w-full px-3 py-2.5 text-left text-sm text-blue-600 hover:bg-gray-50 flex items-center gap-2"
                            >
                                <Settings className="w-4 h-4" />
                                <span>Configure Terms</span>
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
