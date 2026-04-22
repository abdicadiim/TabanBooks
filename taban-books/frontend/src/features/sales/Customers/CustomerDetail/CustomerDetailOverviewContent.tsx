import React from "react";
import { AlertTriangle, ChevronDown } from "lucide-react";
import CustomerDetailOverviewActivity from "./CustomerDetailOverviewActivity";

type CustomerDetailOverviewContentProps = {
  customer: any;
  id?: string;
  availableCurrencies: any[];
  formatCurrency: (amount: any, currency?: string) => string;
  linkedVendor: any;
  navigate: (to: string, options?: any) => void;
  formatDateForDisplay: (date: string | Date) => string;
  incomeTimePeriodRef: React.RefObject<HTMLDivElement | null>;
  incomeTimePeriod: string;
  isIncomeTimePeriodDropdownOpen: boolean;
  setIsIncomeTimePeriodDropdownOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIncomeTimePeriod: React.Dispatch<React.SetStateAction<string>>;
  invoices: any[];
  payments: any[];
  accountingBasis: string;
  expenses: any[];
  recurringExpenses: any[];
  bills: any[];
  quotes: any[];
  creditNotes: any[];
  salesReceipts: any[];
  recurringInvoices: any[];
};

const getCreditLimitText = (customer: any, formatCurrency: (amount: any, currency?: string) => string) => {
  const raw = customer?.creditLimit ?? customer?.credit_limit ?? customer?.creditlimit ?? customer?.creditLimitAmount ?? "";
  const asString = String(raw ?? "").trim();
  if (!asString || asString.toLowerCase() === "unlimited") return "Unlimited";
  const value = Number(asString);
  if (!Number.isFinite(value)) return asString;
  return formatCurrency(value, customer?.currency || "USD");
};

export default function CustomerDetailOverviewContent({
  customer,
  id,
  availableCurrencies,
  formatCurrency,
  linkedVendor,
  navigate,
  formatDateForDisplay,
  incomeTimePeriodRef,
  incomeTimePeriod,
  isIncomeTimePeriodDropdownOpen,
  setIsIncomeTimePeriodDropdownOpen,
  setIncomeTimePeriod,
  invoices,
  payments,
  accountingBasis,
  expenses,
  recurringExpenses,
  bills,
  quotes,
  creditNotes,
  salesReceipts,
  recurringInvoices,
}: CustomerDetailOverviewContentProps) {
  const customerId = String(customer?.id || customer?._id || "").trim();
  const customerName = String(customer?.name || customer?.displayName || customer?.companyName || "").trim();
  const receivablesValue = Number((customer as any)?.receivables ?? 0);
  const creditLimitRaw = (customer as any)?.creditLimit ?? (customer as any)?.credit_limit ?? (customer as any)?.creditlimit ?? (customer as any)?.creditLimitAmount ?? "";
  const creditLimitValue = Number(String(creditLimitRaw ?? "").trim());
  const showCreditLimitWarning =
    String(creditLimitRaw ?? "").trim() &&
    String(creditLimitRaw ?? "").trim().toLowerCase() !== "unlimited" &&
    Number.isFinite(creditLimitValue) &&
    Number.isFinite(receivablesValue) &&
    receivablesValue > creditLimitValue;

  const toAmount = (value: any) => {
    const next = Number(String(value ?? 0).replace(/,/g, ""));
    return Number.isFinite(next) ? next : 0;
  };

  const toDate = (value: any) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const matchesPeriod = (date: Date | null) => {
    if (!date) return false;
    const now = new Date();
    if (incomeTimePeriod === "This Fiscal Year") {
      const fiscalYearStart = new Date(now.getFullYear(), 6, 1);
      return date >= fiscalYearStart && date <= now;
    }
    if (incomeTimePeriod === "Previous Fiscal Year") {
      const previousYearStart = new Date(now.getFullYear() - 1, 6, 1);
      const previousYearEnd = new Date(now.getFullYear(), 5, 30);
      return date >= previousYearStart && date <= previousYearEnd;
    }
    if (incomeTimePeriod === "Last 12 Months") {
      const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 12, now.getDate());
      return date >= twelveMonthsAgo && date <= now;
    }
    if (incomeTimePeriod === "Last 6 Months") {
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
      return date >= sixMonthsAgo && date <= now;
    }
    return true;
  };

  const periodSeed = (() => {
    const periods: { label: string; year: number; month: number; income: number; expense: number }[] = [];
    const now = new Date();

    if (incomeTimePeriod === "Last 6 Months" || incomeTimePeriod === "Last 12 Months") {
      const count = incomeTimePeriod === "Last 6 Months" ? 6 : 12;
      for (let index = count - 1; index >= 0; index -= 1) {
        const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
        periods.push({ label: date.toLocaleString("en-US", { month: "short" }), year: date.getFullYear(), month: date.getMonth(), income: 0, expense: 0 });
      }
    } else if (incomeTimePeriod === "This Fiscal Year") {
      const startMonth = 6;
      const fiscalYearStart = now.getMonth() >= startMonth ? now.getFullYear() : now.getFullYear() - 1;
      for (let index = 0; index < 12; index += 1) {
        const date = new Date(fiscalYearStart, startMonth + index, 1);
        if (date > now) break;
        periods.push({ label: date.toLocaleString("en-US", { month: "short" }), year: date.getFullYear(), month: date.getMonth(), income: 0, expense: 0 });
      }
    } else if (incomeTimePeriod === "Previous Fiscal Year") {
      const startMonth = 6;
      const fiscalYearStart = now.getMonth() >= startMonth ? now.getFullYear() - 1 : now.getFullYear() - 2;
      for (let index = 0; index < 12; index += 1) {
        const date = new Date(fiscalYearStart, startMonth + index, 1);
        periods.push({ label: date.toLocaleString("en-US", { month: "short" }), year: date.getFullYear(), month: date.getMonth(), income: 0, expense: 0 });
      }
    }

    return periods;
  })();

  const chartData = periodSeed.map((period) => ({ ...period }));
  const accumulate = (rows: any[], key: "income" | "expense") => {
    rows.forEach((row) => {
      const rowDate = toDate(row.invoiceDate || row.date || row.createdAt || row.created_on || row.expenseDate || row.billDate || row.startDate || row.recurringInvoiceDate);
      const period = chartData.find((item) => item.year === rowDate?.getFullYear() && item.month === rowDate?.getMonth());
      if (!period || !rowDate || !matchesPeriod(rowDate)) return;
      period[key] += toAmount(row.total || row.amount || row.subtotal || row.subTotal || row.balance || 0);
    });
  };

  const filteredInvoices = invoices.filter((row) => matchesPeriod(toDate(row.invoiceDate || row.date || row.createdAt)));
  const cashFilteredInvoices =
    accountingBasis === "Cash"
      ? filteredInvoices.filter((invoice) => {
          const paidAmount = payments
            .filter((payment) => payment.invoiceId === invoice.id || payment.invoiceId === invoice._id || payment.invoiceNumber === invoice.invoiceNumber)
            .reduce((sum, payment) => sum + toAmount(payment.amountReceived || payment.amount || 0), 0);
          const invoiceTotal = toAmount(invoice.total || invoice.amount || 0);
          return paidAmount >= invoiceTotal;
        })
      : filteredInvoices;
  const filteredSalesReceipts = salesReceipts.filter((row) => matchesPeriod(toDate(row.date || row.salesReceiptDate || row.createdAt)));
  const filteredRecurringInvoices = recurringInvoices.filter((row) => matchesPeriod(toDate(row.startDate || row.recurringInvoiceDate || row.createdAt)));
  const filteredExpenses = expenses.filter((row) => matchesPeriod(toDate(row.expenseDate || row.date || row.createdAt)));
  const filteredRecurringExpenses = recurringExpenses.filter((row) => matchesPeriod(toDate(row.startDate || row.expenseDate || row.date || row.createdAt)));
  const filteredBills = bills.filter((row) => matchesPeriod(toDate(row.billDate || row.date || row.createdAt)));

  accumulate(cashFilteredInvoices, "income");
  accumulate(filteredSalesReceipts, "income");
  accumulate(filteredRecurringInvoices, "income");
  accumulate(filteredExpenses, "expense");
  accumulate(filteredRecurringExpenses, "expense");
  accumulate(filteredBills, "expense");

  const totalIncome = [...cashFilteredInvoices, ...filteredSalesReceipts, ...filteredRecurringInvoices].reduce((sum, row) => sum + toAmount(row.total || row.amount || row.subtotal || row.subTotal || row.balance || 0), 0);
  const totalExpense = [...filteredExpenses, ...filteredRecurringExpenses, ...filteredBills].reduce((sum, row) => sum + toAmount(row.total || row.amount || row.subtotal || row.subTotal || row.balance || 0), 0);

  const maxChartValue = Math.max(...chartData.flatMap((item) => [item.income, item.expense]), 1000);
  const hasChartData = chartData.some((item) => item.income > 0 || item.expense > 0);
  const chartHeight = 180;
  const chartWidth = 420;
  const plotHeight = 130;
  const groupWidth = chartData.length > 0 ? chartWidth / chartData.length : chartWidth;
  const barWidth = Math.max(8, Math.min(20, groupWidth / 3));

  return (
    <div className="flex-1 min-w-0 bg-white p-4">
      <div className="mb-4 grid grid-cols-2 gap-10">
        <div>
          <div className="px-2">
            <span className="text-sm text-gray-500">Payment due period</span>
          </div>
          <div className="px-2 pt-1">
            <div className="text-sm text-gray-900">
              {customer.paymentTerms === "due-on-receipt" ? "Due on Receipt" : customer.paymentTerms || "Due on Receipt"}
            </div>
          </div>
        </div>
        <div>
          <div className="px-2">
            <span className="text-sm text-gray-500">{customer.linkedVendorId ? "Associated with Vendor" : "Credit Limit"}</span>
          </div>
          <div className="px-2 pt-1">
            <div className={`text-sm ${customer.linkedVendorId ? "font-medium text-blue-600" : "text-gray-900"}`}>
              {customer.linkedVendorId
                ? (customer.linkedVendorName || linkedVendor?.name || "N/A")
                : getCreditLimitText(customer, formatCurrency)}
            </div>
          </div>
        </div>
      </div>

      <div className="mb-4 border-y border-gray-200 bg-white">
        <div className="px-2 py-3">
          <span className="text-lg font-medium text-gray-900">Receivables</span>
        </div>
        <div className="overflow-hidden border-t border-gray-100">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">CURRENCY</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500">OUTSTANDING RECEIVABLES</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500">UNUSED CREDITS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="px-4 py-3 font-medium text-gray-900">
                  {`${customer.currency || "USD"}- ${
                    availableCurrencies.find((currency) => currency?.code === (customer.currency || "USD"))?.currencyName ||
                    availableCurrencies.find((currency) => currency?.code === (customer.currency || "USD"))?.name ||
                    "Armenian Dram"
                  }`}
                </td>
                <td className="px-4 py-3 text-right text-gray-900">{formatCurrency(customer.receivables || 0, customer.currency || "USD")}</td>
                <td className="px-4 py-3 text-right font-medium text-blue-600">{formatCurrency(customer.unusedCredits || 0, customer.currency || "USD")}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {showCreditLimitWarning && (
        <div className="mb-4 flex items-center gap-2 bg-white px-4 py-3 text-sm text-orange-600">
          <AlertTriangle size={16} className="text-orange-500" />
          <span>Credit limit is being exceeded by {formatCurrency(receivablesValue - creditLimitValue, customer.currency || "USD")}</span>
        </div>
      )}

      <div className="mb-6 border-y border-gray-200 bg-white">
        <div className="flex items-start justify-between px-2 py-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-semibold text-gray-900">Income and Expense</span>
            <span className="text-xs text-gray-500">This chart is displayed in the organization's base currency.</span>
          </div>
          <div className="relative" ref={incomeTimePeriodRef}>
            <button
              onClick={() => setIsIncomeTimePeriodDropdownOpen((previous) => !previous)}
              className="cursor-pointer border-none bg-transparent text-sm text-blue-600 hover:text-blue-700"
            >
              <span className="flex items-center gap-1">
                {incomeTimePeriod}
                <ChevronDown size={14} className={`transition-transform duration-200 ${isIncomeTimePeriodDropdownOpen ? "rotate-180" : ""}`} />
              </span>
            </button>

            {isIncomeTimePeriodDropdownOpen && (
              <div className="absolute right-0 top-full z-50 mt-1 w-[200px] rounded-md border border-gray-200 bg-white py-1 shadow-lg">
                {["This Fiscal Year", "Previous Fiscal Year", "Last 12 Months", "Last 6 Months"].map((period) => (
                  <button
                    key={period}
                    onClick={() => {
                      setIncomeTimePeriod(period);
                      setIsIncomeTimePeriodDropdownOpen(false);
                    }}
                    className={`w-full cursor-pointer px-4 py-2 text-left text-sm transition-colors ${incomeTimePeriod === period ? "bg-blue-500 text-white" : "text-gray-700 hover:bg-gray-50"}`}
                  >
                    {period}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="px-2 pb-4">
          <div className="relative mb-4 h-56 overflow-hidden rounded-md p-4">
            <div className="relative h-full w-full">
              <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
                {[0, 1, 2, 3, 4].map((item) => (
                  <div key={item} className="h-0 w-full border-t border-gray-200"></div>
                ))}
              </div>
              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="h-full w-full overflow-visible">
                {chartData.map((item, index) => {
                  const groupX = index * groupWidth;
                  const incomeHeight = (item.income / maxChartValue) * plotHeight;
                  const expenseHeight = (item.expense / maxChartValue) * plotHeight;
                  const baseY = chartHeight - 24;
                  return (
                    <g key={`${item.year}-${item.month}-${item.label}`}>
                      <rect
                        x={groupX + groupWidth / 2 - barWidth - 3}
                        y={baseY - incomeHeight}
                        width={barWidth}
                        height={incomeHeight}
                        rx="4"
                        fill="#3b82f6"
                        opacity={item.income > 0 ? 0.9 : 0.15}
                      />
                      <rect
                        x={groupX + groupWidth / 2 + 3}
                        y={baseY - expenseHeight}
                        width={barWidth}
                        height={expenseHeight}
                        rx="4"
                        fill="#f43f5e"
                        opacity={item.expense > 0 ? 0.9 : 0.15}
                      />
                      <text
                        x={groupX + groupWidth / 2}
                        y={chartHeight - 6}
                        textAnchor="middle"
                        className="fill-gray-400"
                        fontSize="10"
                      >
                        {item.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
              {!hasChartData && (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-400">
                  No income or expense data for this period.
                </div>
              )}
            </div>
          </div>
          <div className="border-t border-gray-200 pt-4 text-lg font-medium text-gray-900">
            Income ({incomeTimePeriod}) - {formatCurrency(totalIncome, customer.currency?.substring(0, 3) || "USD")}
          </div>
          <div className="mt-1 text-sm text-gray-600">
            Expense ({incomeTimePeriod}) - {formatCurrency(totalExpense, customer.currency?.substring(0, 3) || "USD")}
          </div>
        </div>
      </div>

      <CustomerDetailOverviewActivity
        customer={customer}
        id={id}
        invoices={invoices}
        payments={payments}
        creditNotes={creditNotes}
        quotes={quotes}
        salesReceipts={salesReceipts}
        recurringInvoices={recurringInvoices}
        customerSubscriptions={[]}
        formatCurrency={formatCurrency}
      />
    </div>
  );
}
