import React from "react";
import { useCurrency } from "../../hooks/useCurrency";
import { Building2, CreditCard } from "lucide-react";

export default function BankCardsCard(props: { data?: any; loading?: boolean }) {
  const { formatMoney } = useCurrency();

  const bankData = props.data || { totalBalance: 0, accountCount: 0, activeAccounts: 0 };
  const totalBalance = Number(bankData.totalBalance || 0);
  const accountCount = Number(bankData.accountCount || 0);
  const activeAccounts = Number(bankData.activeAccounts || 0);
  const inactiveAccounts = Math.max(0, accountCount - activeAccounts);
  const avgBalance = accountCount > 0 ? totalBalance / accountCount : 0;

  return (
    <section className="rounded-2xl border border-[#b9d4d8] bg-white py-1.5 px-1.5 w-full shadow-sm box-border overflow-x-hidden">
      <header className="flex justify-between items-center mb-4">
        <h2 className="text-[20px] font-semibold m-0 text-slate-900">Accounts & Cards</h2>
      </header>

      <div className="rounded-xl bg-gradient-to-r from-[#12363d] via-[#16434a] to-[#12363d] text-white p-4">
        <div className="flex items-center justify-between text-[11px] text-white/80">
          <span>Total Balance</span>
          <span className="px-2 py-0.5 rounded bg-white/15">Live</span>
        </div>
        <div className="mt-2 text-[34px] font-semibold tracking-tight">{formatMoney(totalBalance)}</div>
        <div className="mt-1 text-[11px] text-white/75">{activeAccounts} active of {accountCount} linked accounts</div>
      </div>

      <div className="mt-3 space-y-2">
        <div className="rounded-lg border border-[#c8dce0] bg-[#f3f8f8] p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-white border border-[#d7e7ea] flex items-center justify-center text-[#156372]">
              <Building2 size={15} />
            </div>
            <div>
              <div className="text-[12px] text-slate-700 font-medium">Average per Account</div>
              <div className="text-[10px] text-[#668189]">Computed from linked accounts</div>
            </div>
          </div>
          <div className="text-[13px] font-semibold text-slate-800">{formatMoney(avgBalance)}</div>
        </div>

        <div className="rounded-lg border border-[#c8dce0] bg-[#f3f8f8] p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-white border border-[#d7e7ea] flex items-center justify-center text-[#156372]">
              <CreditCard size={15} />
            </div>
            <div>
              <div className="text-[12px] text-slate-700 font-medium">Inactive Accounts</div>
              <div className="text-[10px] text-[#668189]">Total linked minus active</div>
            </div>
          </div>
          <div className="text-[13px] font-semibold text-slate-800">{inactiveAccounts}</div>
        </div>
      </div>
      {props.loading ? <div className="mt-2 text-right text-[10px] font-medium text-[#6f8294]">Refreshing...</div> : null}
    </section>
  );
}
