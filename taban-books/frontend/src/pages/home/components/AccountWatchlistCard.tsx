import React, { useState } from "react";
import Dropdown from "./Dropdown";

const MODES = ["Accrual", "Cash"];

export default function AccountWatchlistCard() {
  const [mode, setMode] = useState("Accrual");
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-white border rounded-xl p-4">
      <div className="flex justify-between mb-2">
        <h3 className="font-semibold">Account Watchlist</h3>

        <Dropdown
          open={open}
          setOpen={setOpen}
          trigger={<button className="text-sm">{mode} ▾</button>}
        >
          {MODES.map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                setOpen(false);
              }}
              className={`w-full text-left px-4 py-2 text-sm ${
                m === mode ? "bg-blue-600 text-white" : "hover:bg-slate-50"
              }`}
            >
              {m}
            </button>
          ))}
        </Dropdown>
      </div>

      <div className="h-32 flex items-center justify-center text-slate-400">
        No accounts to watch
      </div>
    </div>
  );
}
