import React from "react";
import { useCurrency } from "../../../hooks/useCurrency";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

function CurrencyTooltip({ active, payload, label, symbol }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-xl px-4 py-3 text-sm">
      <div className="text-slate-500 mb-2">{label}</div>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-6">
          <span className="text-slate-600">Opening Balance</span>
          <span className="font-semibold text-slate-800">{symbol}{d.opening ?? 0}</span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <span className="text-emerald-600">Incoming</span>
          <span className="font-semibold text-slate-800">{symbol}{d.incoming ?? 0}</span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <span className="text-rose-600">Outgoing</span>
          <span className="font-semibold text-slate-800">{symbol}{d.outgoing ?? 0}</span>
        </div>
        <div className="flex items-center justify-between gap-6 pt-1 border-t border-slate-200">
          <span style={{ color: "#156372" }}>Ending Balance</span>
          <span className="font-semibold text-slate-900">{symbol}{d.ending ?? 0}</span>
        </div>
      </div>
    </div>
  );
}

export default function CashFlowChart({ data }: any) {
  const { symbol } = useCurrency();
  return (
    <div className="h-[240px] w-full overflow-visible">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip
            content={<CurrencyTooltip symbol={symbol} />}
            wrapperStyle={{ zIndex: 9999 }}
            allowEscapeViewBox={{ x: true, y: true }}
          />
          <Area
            type="monotone"
            dataKey="ending"
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
            fillOpacity={0.12}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
