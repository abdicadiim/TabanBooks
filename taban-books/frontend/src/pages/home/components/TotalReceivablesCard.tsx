import React, { useState } from "react";
import { useCurrency } from "../../../hooks/useCurrency";
import Dropdown from "./Dropdown";



export default function TotalReceivablesCard() {
  const { formatMoney } = useCurrency();
  const [open, setOpen] = useState(false);

  const AGEING = [
    { label: "1–15 Days", value: formatMoney(0) },
    { label: "16–30 Days", value: formatMoney(0) },
    { label: "31–45 Days", value: formatMoney(0) },
    { label: "Above 45 Days", value: formatMoney(0) },
  ];

  return (
    <div className="bg-white border rounded-xl p-4">
      <h3 className="font-semibold mb-2">Total Receivables</h3>

      <div className="flex justify-between">
        <div>
          <div className="text-xs" style={{ color: "#156372" }}>CURRENT</div>
          <div className="font-semibold">{formatMoney(0)}</div>
        </div>

        <div>
          <div className="text-xs text-orange-600">OVERDUE</div>

          <Dropdown
            open={open}
            setOpen={setOpen}
            trigger={
              <button className="font-semibold text-orange-600">
                {formatMoney(0)} ▾
              </button>
            }
          >
            {AGEING.map((a) => (
              <div
                key={a.label}
                className="flex justify-between px-4 py-2 text-sm hover:bg-slate-50"
              >
                <span>{a.label}</span>
                <span style={{ color: "#156372" }}>{a.value}</span>
              </div>
            ))}
          </Dropdown>
        </div>
      </div>
    </div>
  );
}
