import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search, Plus } from "lucide-react";
import { useAccountSelect, Account } from "../hooks/useAccountSelect";

interface AccountSelectDropdownProps {
  value?: string;
  onSelect: (account: Account) => void;
  placeholder?: string;
  className?: string;
  allowedTypes?: string[];
  preload?: boolean;
  initialAccounts?: Account[];
}

export const AccountSelectDropdown: React.FC<AccountSelectDropdownProps> = ({
  value,
  onSelect,
  placeholder = "Select an account",
  className = "",
  allowedTypes,
  preload = false,
  initialAccounts = [],
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const [menuStyle, setMenuStyle] = useState<{ left: number; top: number; width: number } | null>(null);
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
    allowedTypes,
    preload,
    initialAccounts,
  });

  useEffect(() => {
    if (!isOpen || !dropdownRef.current) return;

    const updateMenuPosition = () => {
      if (!dropdownRef.current) return;
      const rect = dropdownRef.current.getBoundingClientRect();
      setMenuStyle({
        left: rect.left,
        top: rect.bottom + 6,
        width: Math.max(rect.width, 300),
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

  const groups = useMemo(() => Object.entries(groupedAccounts), [groupedAccounts]);

  const toggleDropdown = () => {
    setIsOpen((prev) => {
      const next = !prev;
      if (next) {
        setSearchTerm("");
      }
      return next;
    });
  };

  const displayValue = value?.trim() || "";

  return (
    <div className={`relative w-full ${className}`} ref={dropdownRef}>
      <button
        type="button"
        ref={triggerRef}
        onClick={toggleDropdown}
        className="flex h-11 w-full items-center justify-between gap-2 rounded-md border border-transparent bg-transparent px-0 text-left text-sm text-slate-600 outline-none"
      >
        <span className={displayValue ? "text-slate-700" : "text-slate-400"}>
          {displayValue || placeholder}
        </span>
        <span className="flex h-6 w-6 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600">
          <ChevronDown size={14} className="shrink-0" />
        </span>
      </button>

      {isOpen && menuStyle && typeof document !== "undefined" ? createPortal(
        <div
          ref={menuRef}
          className="fixed z-[13000] overflow-hidden rounded-lg bg-white shadow-[0_16px_36px_rgba(15,23,42,0.14)]"
          style={{
            left: menuStyle.left,
            top: menuStyle.top,
            width: menuStyle.width,
          }}
          onMouseDown={(event) => {
            event.stopPropagation();
          }}
        >
          <div className="border-b border-slate-200 bg-white px-3 py-2.5">
            <div className="flex items-center gap-2 rounded-md border border-blue-400 bg-white px-2.5 py-2 focus-within:border-blue-500">
              <Search size={14} className="shrink-0 text-slate-400" />
              <input
                type="text"
                className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                placeholder="Search..."
                value={searchTerm}
                onChange={handleSearchChange}
                autoFocus
              />
            </div>
          </div>

          <div className="max-h-[260px] overflow-y-auto bg-white">
            {loading ? (
              <div className="px-4 py-4 text-sm text-slate-500">Loading...</div>
            ) : groups.length > 0 ? (
              groups.map(([group, accounts]) => (
                <div key={group} className="border-b border-slate-100 last:border-b-0">
                  <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    {group}
                  </div>
                  {accounts.map((account) => {
                    const isSelected = displayValue === account.name;
                    return (
                      <button
                        key={account.id}
                        type="button"
                        onClick={() => handleSelectAccount(account)}
                        className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                          isSelected ? "bg-[#3B82F6] text-white" : "text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <span className="truncate">{account.name}</span>
                        {isSelected && <Check size={15} className="shrink-0 text-white" />}
                      </button>
                    );
                  })}
                </div>
              ))
            ) : (
              <div className="px-4 py-4 text-sm text-slate-500">
                No accounts found.
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 bg-white px-3 py-2.5">
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-md px-1 py-1 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50"
            >
              <Plus size={16} />
              New Account
            </button>
          </div>
        </div>,
        document.body
      ) : null}
    </div>
  );
};
