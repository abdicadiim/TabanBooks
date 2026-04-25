import React from "react";
import { useCurrency } from "../../hooks/useCurrency";
import { HandCoins, ReceiptText, TrendingUp, Wallet } from "lucide-react";

interface OverdueBreakdown {
  "1-15": number;
  "16-30": number;
  "31-45": number;
  "above-45": number;
}

interface KpiData {
  balance: number;
  current: number;
  overdue: number;
  overdueBreakdown?: OverdueBreakdown;
  count: number;
  currentCount: number;
  overdueCount: number;
}

function AmountCard({
  title,
  amount,
  tag,
  subtitleA,
  valueA,
  subtitleB,
  valueB,
  icon,
}: {
  title: string;
  amount: number;
  tag: string;
  subtitleA: string;
  valueA: number;
  subtitleB: string;
  valueB: number;
  icon: React.ReactNode;
}) {
  const { formatMoney } = useCurrency();

  return (
    <div className="rounded-xl border border-[#b9d4d8] bg-white p-4 min-h-[148px]">
      <div className="flex items-center justify-between">
        <div className="w-8 h-8 rounded-lg bg-[#e8f2f4] text-[#156372] flex items-center justify-center">{icon}</div>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${tag === "RECEIVABLE" ? "bg-[#e5f2f4] text-[#156372]" : "bg-[#ffe8e8] text-[#eb5757]"}`}>
          {tag}
        </span>
      </div>

      <div className="mt-3 text-[12px] text-[#55757c] font-medium">{title}</div>
      <div className="text-[24px] leading-none mt-1.5 font-semibold text-slate-900 tracking-tight">
        {formatMoney(amount)}
      </div>

      <div className="mt-3.5 grid grid-cols-2 gap-2 text-[10px]">
        <div className="text-[#5d7e86]">{subtitleA}</div>
        <div className="text-right font-semibold text-slate-700">{formatMoney(valueA)}</div>
        <div className="text-[#e15656]">{subtitleB}</div>
        <div className="text-right font-semibold text-[#e15656]">{formatMoney(valueB)}</div>
      </div>
    </div>
  );
}

function ValueCard({ title, value, subtitle, positive = true, icon }: { title: string; value: string; subtitle?: string; positive?: boolean; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[#b9d4d8] bg-white p-4 min-h-[148px]">
      <div className="w-8 h-8 rounded-lg bg-[#e8f2f4] text-[#156372] flex items-center justify-center">{icon}</div>
      <div className="mt-3 text-[12px] text-[#55757c] font-medium">{title}</div>
      <div className="text-[24px] leading-none mt-1.5 font-semibold text-slate-900 tracking-tight">{value}</div>
      {subtitle && (
        <div className={`mt-3.5 text-[10px] font-medium ${positive ? "text-[#4f9157]" : "text-[#d65b5b]"}`}>
          {subtitle}
        </div>
      )}
    </div>
  );
}

export default function KpiRow(props: { data: any; loading: boolean }) {
  const { formatMoney } = useCurrency();

  if (props.loading) {
    return (
      <div className="mb-1 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-[#b9d4d8] bg-white p-4 min-h-[148px] animate-pulse">
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-lg bg-[#e8f2f4]" />
              <div className="h-5 w-20 rounded-full bg-[#edf5f6]" />
            </div>
            <div className="mt-3 h-4 w-32 rounded bg-[#edf5f6]" />
            <div className="mt-3 h-9 w-36 rounded bg-[#edf5f6]" />
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="h-3 w-24 rounded bg-[#edf5f6]" />
              <div className="h-3 w-16 justify-self-end rounded bg-[#edf5f6]" />
              <div className="h-3 w-20 rounded bg-[#edf5f6]" />
              <div className="h-3 w-16 justify-self-end rounded bg-[#edf5f6]" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const defaultData: KpiData = {
    balance: 0,
    current: 0,
    overdue: 0,
    count: 0,
    currentCount: 0,
    overdueCount: 0,
  };

  const ar = props.data?.accountsReceivable || defaultData;
  const ap = props.data?.accountsPayable || defaultData;
  const operatingMargin = Number(props.data?.profitLoss?.operatingMargin || 0);
  const operatingCash = Number(props.data?.cashFlow?.operatingCashFlow || 0);

  return (
      <div className="mb-1 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
      <AmountCard
        title="Total Receivables"
        amount={ar.balance}
        tag="RECEIVABLE"
        subtitleA="Unpaid Invoices"
        valueA={ar.current}
        subtitleB="Overdue"
        valueB={ar.overdue}
        icon={<HandCoins size={16} />}
      />

      <AmountCard
        title="Total Payables"
        amount={ap.balance}
        tag="PAYABLE"
        subtitleA="Unpaid Bills"
        valueA={ap.current}
        subtitleB="Overdue"
        valueB={ap.overdue}
        icon={<ReceiptText size={16} />}
      />

      <ValueCard
        title="Net Profit Margin"
        value={`${operatingMargin.toFixed(1)}%`}
        subtitle={`${operatingMargin >= 0 ? "▲" : "▼"} ${Math.abs(operatingMargin).toFixed(1)}%`}
        positive={operatingMargin >= 0}
        icon={<TrendingUp size={16} />}
      />

      <ValueCard
        title="Operating Cash"
        value={formatMoney(operatingCash)}
        subtitle="Synced across your accounts"
        positive
        icon={<Wallet size={16} />}
      />
    </div>
  );
}
