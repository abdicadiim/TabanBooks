import React from "react";
import { useCurrency } from "../../hooks/useCurrency";
import { HandCoins, ReceiptText, TrendingUp, Wallet } from "lucide-react";
import { useAnimatedNumber } from "./useAnimatedNumber";

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
  countA,
  subtitleB,
  valueB,
  countB,
  icon,
}: {
  title: string;
  amount: number;
  tag: string;
  subtitleA: string;
  valueA: number;
  countA: number;
  subtitleB: string;
  valueB: number;
  countB: number;
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
        <div className="flex items-center gap-1 text-[#5d7e86]">
          <span>{subtitleA}</span>
          <span className="rounded-full bg-[#edf5f6] px-1.5 py-0.5 text-[9px] font-semibold text-[#156372]">
            {countA}
          </span>
        </div>
        <div className="text-right font-semibold text-slate-700">{formatMoney(valueA)}</div>
        <div className="flex items-center gap-1 text-[#e15656]">
          <span>{subtitleB}</span>
          <span className="rounded-full bg-[#fff1f1] px-1.5 py-0.5 text-[9px] font-semibold text-[#e15656]">
            {countB}
          </span>
        </div>
        <div className="text-right font-semibold text-[#e15656]">{formatMoney(valueB)}</div>
      </div>
    </div>
  );
}

function ValueCard({
  title,
  value,
  subtitle,
  positive = true,
  icon,
}: {
  title: string;
  value: string;
  subtitle?: string;
  positive?: boolean;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[#b9d4d8] bg-white p-4 min-h-[148px]">
      <div className="w-8 h-8 rounded-lg bg-[#e8f2f4] text-[#156372] flex items-center justify-center">{icon}</div>
      <div className="mt-3 text-[12px] text-[#55757c] font-medium">{title}</div>
      <div className="text-[24px] leading-none mt-1.5 font-semibold text-slate-900 tracking-tight">{value}</div>
      {subtitle ? (
        <div className={`mt-3.5 text-[10px] font-medium ${positive ? "text-[#4f9157]" : "text-[#d65b5b]"}`}>
          {subtitle}
        </div>
      ) : null}
    </div>
  );
}

export default function KpiRow(props: { data: any; loading: boolean }) {
  const { formatMoney } = useCurrency();

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

  const animatedArBalance = useAnimatedNumber(ar.balance, { duration: 1100, decimals: 2 });
  const animatedArCurrent = useAnimatedNumber(ar.current, { duration: 1100, decimals: 2 });
  const animatedArOverdue = useAnimatedNumber(ar.overdue, { duration: 1100, decimals: 2 });
  const animatedArCurrentCount = useAnimatedNumber(ar.currentCount, { duration: 950 });
  const animatedArOverdueCount = useAnimatedNumber(ar.overdueCount, { duration: 950 });
  const animatedApBalance = useAnimatedNumber(ap.balance, { duration: 1100, decimals: 2 });
  const animatedApCurrent = useAnimatedNumber(ap.current, { duration: 1100, decimals: 2 });
  const animatedApOverdue = useAnimatedNumber(ap.overdue, { duration: 1100, decimals: 2 });
  const animatedApCurrentCount = useAnimatedNumber(ap.currentCount, { duration: 950 });
  const animatedApOverdueCount = useAnimatedNumber(ap.overdueCount, { duration: 950 });
  const animatedOperatingMargin = useAnimatedNumber(operatingMargin, { duration: 1000, decimals: 1 });
  const animatedOperatingCash = useAnimatedNumber(operatingCash, { duration: 1100, decimals: 2 });

  return (
    <div className="mb-1 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
      <AmountCard
        title="Total Receivables"
        amount={animatedArBalance}
        tag="RECEIVABLE"
        subtitleA="Unpaid Invoices"
        valueA={animatedArCurrent}
        countA={Math.round(animatedArCurrentCount)}
        subtitleB="Overdue"
        valueB={animatedArOverdue}
        countB={Math.round(animatedArOverdueCount)}
        icon={<HandCoins size={16} />}
      />

      <AmountCard
        title="Total Payables"
        amount={animatedApBalance}
        tag="PAYABLE"
        subtitleA="Unpaid Bills"
        valueA={animatedApCurrent}
        countA={Math.round(animatedApCurrentCount)}
        subtitleB="Overdue"
        valueB={animatedApOverdue}
        countB={Math.round(animatedApOverdueCount)}
        icon={<ReceiptText size={16} />}
      />

      <ValueCard
        title="Net Profit Margin"
        value={`${animatedOperatingMargin.toFixed(1)}%`}
        subtitle={`${operatingMargin >= 0 ? "▲" : "▼"} ${Math.abs(animatedOperatingMargin).toFixed(1)}%`}
        positive={operatingMargin >= 0}
        icon={<TrendingUp size={16} />}
      />

      <ValueCard
        title="Operating Cash"
        value={formatMoney(animatedOperatingCash)}
        subtitle="Synced across your accounts"
        positive
        icon={<Wallet size={16} />}
      />
    </div>
  );
}
