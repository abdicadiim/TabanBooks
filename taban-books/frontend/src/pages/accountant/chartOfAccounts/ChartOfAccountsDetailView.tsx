import React from "react";
import { Loader2, Pencil, Plus, Trash2, X, Paperclip, MoreHorizontal, ChevronRight } from "lucide-react";
import type { ChartOfAccountsAccount } from "../chartOfAccountsTypes";

const DEBIT_BALANCE_TYPES = [
  "Asset", "Other Asset", "Other Current Asset", "Cash", "Bank", "Fixed Asset",
  "Accounts Receivable", "Stock", "Payment Clearing Account", "Input Tax",
  "Intangible Asset", "Non Current Asset", "Deferred Tax Asset", "Expense",
  "Cost Of Goods Sold", "Other Expense",
];

interface ChartOfAccountsDetailViewProps {
  accountTransactions: any[];
  accounts: ChartOfAccountsAccount[];
  baseCurrency: any;
  isTransactionsLoading: boolean;
  onClose: () => void;
  onDelete: (account: ChartOfAccountsAccount) => void;
  onEdit: (account: ChartOfAccountsAccount) => void;
  onNewAccount: () => void;
  onOpenTransactionReport?: () => void;
  onSelectAccount: (account: ChartOfAccountsAccount) => void;
  selectedAccount: ChartOfAccountsAccount;
  transactionTotals: { credit: number; debit: number };
}

const formatTransactionSourceType = (value: unknown): string => {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "Journal";
  const map: Record<string, string> = {
    invoice: "Invoice Payment",
    bill: "Bill Payment",
    payment_made: "Payments Made",
    payment_received: "Payments Received",
    manual_journal: "Journal",
    journal: "Journal",
  };
  return map[raw] || raw.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
};

const formatMoney = (value: number) =>
  value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function ChartOfAccountsDetailView({
  accountTransactions,
  accounts = [],
  baseCurrency,
  isTransactionsLoading,
  onClose,
  onDelete,
  onEdit,
  onNewAccount,
  onOpenTransactionReport,
  onSelectAccount,
  selectedAccount,
  transactionTotals,
}: ChartOfAccountsDetailViewProps) {
  const currencyLabel = baseCurrency?.code || "KES";
  const isDebitType = DEBIT_BALANCE_TYPES.includes(selectedAccount.type || "");
  const balance = isDebitType
    ? transactionTotals.debit - transactionTotals.credit
    : transactionTotals.credit - transactionTotals.debit;
  const balanceSuffix = balance >= 0 ? (isDebitType ? "Dr" : "Cr") : (isDebitType ? "Cr" : "Dr");

  return (
    <div className="flex w-full h-full bg-white overflow-hidden font-sans">
      {/* Left Sidebar List */}
      <aside className="w-[280px] flex-shrink-0 border-r border-gray-100 flex flex-col bg-white h-full relative z-10">
        <div className="p-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0 bg-white">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">All Accounts</span>
            <ChevronRight size={12} className="text-slate-400 rotate-90" />
          </div>
          <div className="flex items-center gap-1.5">
            <button 
              onClick={onNewAccount} 
              className="p-1.5 bg-[#156372] text-white rounded-[10px] hover:bg-[#0d4d59] transition-all shadow-sm active:scale-95 flex items-center justify-center"
            >
              <Plus size={14} strokeWidth={3} />
            </button>
            <button className="p-1.5 border border-gray-200 rounded text-slate-400 hover:text-slate-600 transition-colors bg-white">
              <MoreHorizontal size={12} />
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar-thin bg-white">
          {accounts.map((acc) => {
            const isSelected = (acc.id || acc._id) === (selectedAccount.id || selectedAccount._id);
            return (
              <button
                key={acc.id || acc._id}
                onClick={() => onSelectAccount(acc)}
                className={`w-full px-3 py-3 text-left border-b border-gray-50 transition-all relative flex items-start gap-2.5 group ${isSelected ? 'bg-slate-50 border-l-[3px] border-l-[#156372]' : 'hover:bg-slate-50 border-l-[3px] border-l-transparent'}`}
              >
                <div className={`mt-0.5 w-4 h-4 border rounded-[4px] transition-all flex-shrink-0 flex items-center justify-center ${isSelected ? 'border-[#156372] bg-[#156372]' : 'border-gray-300 bg-white'}`}>
                  {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full shadow-sm" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className={`text-[12px] font-semibold leading-tight truncate ${isSelected ? 'text-[#156372]' : 'text-slate-700'}`}>{acc.name}</span>
                    {!acc.isActive && (
                      <span className="text-[7px] font-bold text-slate-400 uppercase tracking-tighter flex-shrink-0">INACTIVE</span>
                    )}
                  </div>
                  <div className="text-[9px] font-medium text-slate-400 uppercase tracking-widest mt-0.5 truncate">{acc.type}</div>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Right Detail Pane */}
      <main className="flex-1 flex flex-col overflow-hidden h-full bg-white">
        {/* Header */}
        <header className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-white flex-shrink-0 z-10">
          <div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-0.5">{selectedAccount.type}</div>
            <h1 className="text-[18px] font-bold text-slate-900 tracking-tight leading-tight">{selectedAccount.name}</h1>
          </div>
          <div className="flex items-center gap-3">
             <button className="p-1.5 border border-gray-200 rounded text-slate-400 hover:text-slate-600 transition-all shadow-sm bg-slate-50/30"><Paperclip size={16} /></button>
             <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all">
               <X size={20} />
             </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto py-6 px-6 w-full scroll-smooth bg-white">
          {/* Actions */}
          <div className="flex items-center gap-3 mb-6">
            <button 
              onClick={() => onEdit(selectedAccount)}
              className="flex items-center gap-1.5 px-3 py-1 border border-gray-200 rounded bg-white text-[12px] font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm ring-1 ring-black/[0.01]"
            >
              <Pencil size={12} className="text-slate-400" />
              Edit
            </button>
          </div>

          {/* Balance Section */}
          <div className="mb-8">
             <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Closing Balance</div>
             <div className="flex items-baseline gap-2">
                <span className="text-[28px] font-bold text-[#4f46e5] tracking-tight">{currencyLabel}{formatMoney(Math.abs(balance))}</span>
                <span className="text-[16px] font-semibold text-[#4f46e5]/60">({balanceSuffix})</span>
             </div>
          </div>

          {/* Description */}
          {selectedAccount.description && (
            <div className="mb-8">
               <p className="text-[13px] text-slate-500 leading-relaxed italic">
                 Description : {selectedAccount.description}
               </p>
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-dashed border-gray-200 w-full mb-8" />

          {/* Transactions Table */}
          <section className="bg-transparent p-0">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[16px] font-bold text-slate-800 tracking-tight">Recent Transactions</h3>
              <div className="flex border border-gray-200 rounded bg-white overflow-hidden p-0.5">
                <button className="px-4 py-1 text-[10px] font-bold text-slate-500 hover:text-slate-700">FCY</button>
                <button className="px-4 py-1 text-[10px] font-bold bg-[#e0f2fe] text-[#0369a1] rounded-[2px] shadow-sm">BCY</button>
              </div>
            </div>

            {isTransactionsLoading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="animate-spin text-blue-600" size={32} />
                <span className="text-[12px] text-slate-400 font-medium">Loading...</span>
              </div>
            ) : accountTransactions.length === 0 ? (
              <div className="text-center py-16 bg-slate-50/20 rounded-xl border border-dashed border-gray-200">
                <p className="text-slate-400 text-xs font-medium italic">No recent transactions found.</p>
              </div>
            ) : (
              <div className="overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="pb-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Date</th>
                      <th className="pb-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Transaction Details</th>
                      <th className="pb-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Type</th>
                      <th className="pb-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest text-right">Debit</th>
                      <th className="pb-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest text-right">Credit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {accountTransactions.slice(0, 5).map((tx, idx) => {
                      const line = tx.lines?.find((l: any) => String(l.account) === String(selectedAccount.id || selectedAccount._id) || l.accountName === selectedAccount.name);
                      return (
                        <tr key={tx.id || idx} className="group hover:bg-slate-50/30 transition-colors">
                          <td className="py-4 text-[13px] text-slate-600">{new Date(tx.date).toLocaleDateString("en-GB")}</td>
                          <td className="py-4 text-[13px] font-bold text-slate-800 uppercase tracking-tight truncate max-w-[300px]">{tx.description || tx.reference || "TRANSACTION"}</td>
                          <td className="py-4 text-[13px] text-slate-600 font-medium">{formatTransactionSourceType(tx.sourceType || tx.type)}</td>
                          <td className="py-4 text-[13px] text-slate-900 text-right font-bold tracking-tight">
                            {line?.debit ? `${currencyLabel}${formatMoney(line.debit)}` : ""}
                          </td>
                          <td className="py-4 text-[13px] text-slate-900 text-right font-bold tracking-tight">
                            {line?.credit ? `${currencyLabel}${formatMoney(line.credit)}` : ""}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <button 
                  onClick={onOpenTransactionReport}
                  className="mt-6 text-[13px] font-bold text-blue-600 hover:text-blue-700 hover:underline transition-all underline-offset-4"
                >
                  Show more details
                </button>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
