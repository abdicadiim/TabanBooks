import React, { useState, useEffect, useRef } from "react";
import { useCurrency } from "../../hooks/useCurrency";
import { ChevronDown } from "lucide-react";

const WATCHLIST = [
  {
    label: "Revenue",
    value: "0.00",
    delta: "+0%",
    tone: "text-teal-700"
  },
  {
    label: "Expenses",
    value: "0.00",
    delta: "+0%",
    tone: "text-amber-700"
  },
];

export default function AccountWatchlistCard() {
  const { formatMoney } = useCurrency();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState("Accrual");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  const options = ["Accrual", "Cash"];

  return (
    <section className="rounded-2xl border border-gray-200 bg-white py-4 px-4 w-full shadow-sm">
      <header className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold m-0 text-slate-900">Account Watchlist</h2>
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="text-[12px] text-slate-700 cursor-pointer inline-flex items-center gap-1.5 hover:text-slate-900"
          >
            {selectedOption}
            <ChevronDown size={14} className={`transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} style={{ color: "#156372" }} />
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[120px] z-[100] overflow-hidden">
              {options.map((option) => (
                <button
                  key={option}
                  onClick={() => {
                    setSelectedOption(option);
                    setIsDropdownOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 text-[13px] font-medium transition-colors ${selectedOption === option
                    ? "text-white"
                    : "bg-white text-slate-900 hover:bg-gray-50"
                    }`}
                  style={selectedOption === option ? { background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" } : {}}
                >
                  {option}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {WATCHLIST.map((item) => (
          <div
            key={item.label}
            className="rounded-lg border border-gray-100 bg-white px-4 py-3"
          >
            <div className="text-[12px] text-slate-600 mb-1">{item.label}</div>
            <div className="text-lg font-semibold text-slate-900 mb-1">{formatMoney(item.value)}</div>
            <div className={`text-[11px] ${item.tone}`}>{item.delta}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
