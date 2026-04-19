import React, { useState } from "react";
import Dropdown from "./Dropdown";

const PERIODS = [
  "This Fiscal Year",
  "Previous Fiscal Year",
  "Last 12 Months",
  "Last 6 Months",
];

export default function IncomeExpenseCard() {
  const [period, setPeriod] = useState(PERIODS[0]);
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-white border rounded-xl p-4">
      <div className="flex justify-between mb-2">
        <h3 className="font-semibold">Income and Expense</h3>

        <Dropdown
          open={open}
          setOpen={setOpen}
          trigger={<button className="text-sm">{period} ▾</button>}
        >
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => {
                setPeriod(p);
                setOpen(false);
              }}
              className={`w-full text-left px-4 py-2 text-sm ${
                p === period ? "bg-blue-600 text-white" : "hover:bg-slate-50"
              }`}
            >
              {p}
            </button>
          ))}
        </Dropdown>
      </div>

      <div className="h-40 flex items-center justify-center text-slate-400">
        Chart Area
      </div>
    </div>
  );
}
