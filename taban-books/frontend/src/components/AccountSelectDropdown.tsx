import React, { useRef, useEffect } from 'react';
import { Plus, Check, ChevronDown, ChevronRight, Search } from 'lucide-react';
import { useAccountSelect, Account } from '../hooks/useAccountSelect';

interface AccountSelectDropdownProps {
    value?: string; // Account name or ID depending on usage, currently using name to match existing text input behavior
    onSelect: (account: Account) => void;
    placeholder?: string;
    className?: string;
    allowedTypes?: string[];
}

export const AccountSelectDropdown: React.FC<AccountSelectDropdownProps> = ({
    value,
    onSelect,
    placeholder = "Select an account",
    className = "",
    allowedTypes,
}) => {
    const {
        searchTerm,
        setSearchTerm,
        isOpen,
        setIsOpen,
        groupedAccounts,
        loading,
        dropdownRef,
        handleSearchChange,
        handleSelectAccount,
    } = useAccountSelect({
        onSelect: (account) => {
            onSelect(account);
        },
        initialValue: value,
        allowedTypes
    });

    // Update search term when value prop changes (e.g. initial load)
    useEffect(() => {
        if (value && value !== searchTerm) {
            setSearchTerm(value);
        }
    }, [value]);

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            <div className="relative">
                <input
                    type="text"
                    value={searchTerm}
                    onChange={handleSearchChange}
                    onFocus={() => setIsOpen(true)}
                    placeholder={placeholder}
                    className="w-full border-none outline-none bg-transparent text-sm text-gray-900 placeholder:text-gray-400 cursor-pointer" // cursor-pointer to hint interactivity
                    autoComplete="off"
                />
                {/* Optional: Add a chevron to indicate it's a dropdown */}
                <div className="absolute right-0 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-400">
                    {/* <ChevronDown size={14} />  - hidden for now to match clean look */}
                </div>
            </div>

            {isOpen && (
                <div className="absolute left-0 top-full mt-1 w-[300px] bg-white border border-blue-500 rounded-md shadow-lg z-[9999] max-h-[400px] flex flex-col">
                    <div className="p-2 border-b border-gray-100">
                        <div className="relative">
                            <Search size={14} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                className="w-full pl-8 pr-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:border-blue-500"
                                placeholder="Search..."
                                value={searchTerm}
                                onChange={handleSearchChange}
                                autoFocus
                            />
                        </div>
                    </div>

                    <div className="overflow-y-auto flex-1">
                        {loading ? (
                            <div className="p-4 text-center text-gray-500 text-sm">Loading...</div>
                        ) : Object.keys(groupedAccounts).length > 0 ? (
                            Object.entries(groupedAccounts).map(([type, accounts]) => (
                                <div key={type} className="border-b border-gray-100 last:border-0">
                                    <div className="px-3 py-1.5 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider sticky top-0">
                                        {type}
                                    </div>
                                    {accounts.map((account) => (
                                        <div
                                            key={account.id}
                                            onClick={() => handleSelectAccount(account)}
                                            className="px-4 py-2 hover:bg-blue-50 hover:text-blue-600 cursor-pointer text-sm text-gray-700 flex justify-between items-center group"
                                        >
                                            <span>{account.name}</span>
                                            {/* Optional: Checkmark if selected */}
                                            {value === account.name && <Check size={14} className="text-blue-600" />}
                                        </div>
                                    ))}
                                </div>
                            ))
                        ) : (
                            <div className="p-4 text-center text-gray-500 text-sm">
                                No accounts found.
                            </div>
                        )}
                    </div>

                    {/* Footer - New Account */}
                    <div className="border-t border-gray-200 p-2 bg-gray-50 rounded-b-md">
                        <button className="flex items-center text-blue-500 hover:text-blue-700 text-sm font-medium w-full px-2 py-1 rounded hover:bg-blue-100 transition-colors">
                            <Plus size={16} className="mr-2" />
                            New Account
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
