/**
 * Reports Engine
 * Generates report datasets from transactions.
 */

import mongoose from "mongoose";
import BankAccount from "../models/BankAccount.js";
import BankTransaction from "../models/BankTransaction.js";
import Bill from "../models/Bill.js";
import CreditNote from "../models/CreditNote.js";
import Customer from "../models/Customer.js";
import Expense from "../models/Expense.js";
import InventoryAdjustment from "../models/InventoryAdjustment.js";
import Invoice from "../models/Invoice.js";
import Item from "../models/Item.js";
import PaymentMade from "../models/PaymentMade.js";
import PaymentReceived from "../models/PaymentReceived.js";
import Project from "../models/Project.js";
import PurchaseOrder from "../models/PurchaseOrder.js";
import Quote from "../models/Quote.js";
import Refund from "../models/Refund.js";
import SalesReceipt from "../models/SalesReceipt.js";
import TimeEntry from "../models/TimeEntry.js";
import User from "../models/User.js";
import Vendor from "../models/Vendor.js";
import VendorCredit from "../models/VendorCredit.js";
import WorkflowLog from "../models/WorkflowLog.js";
import { getSystemReportByKey } from "./reportsCatalog.js";

export interface ReportRunOptions {
  organizationId: string;
  reportKey: string;
  dateRange?: string;
  startDate?: string | Date;
  endDate?: string | Date;
  reportBasis?: "accrual" | "cash";
  groupBy?: string;
  reportBy?: string;
  ratioName?: string;
}

export interface ReportRunResult {
  reportKey: string;
  reportName: string;
  periodLabel: string;
  reportBasis: "accrual" | "cash";
  columns: string[];
  rows: Array<Record<string, any>>;
  summary?: Record<string, any>;
  chart?: {
    type: "line" | "bar" | "pie";
    labels: string[];
    datasets: Array<{ label: string; data: number[] }>;
  };
  notes?: string[];
  generatedAt: string;
}

interface DateRangeResult {
  startDate: Date;
  endDate: Date;
  label: string;
}

const toNumber = (value: any): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const round2 = (value: number): number => {
  return Math.round((toNumber(value) + Number.EPSILON) * 100) / 100;
};

const startOfDay = (date: Date): Date => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfDay = (date: Date): Date => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

const formatDate = (date: Date): string => date.toISOString().slice(0, 10);
const safeName = (value: any, fallback: string): string => {
  const text = String(value || "").trim();
  return text || fallback;
};

const toObjectId = (value: string): mongoose.Types.ObjectId => new mongoose.Types.ObjectId(value);

const shouldIncludeInvoice = (status?: string): boolean => {
  const normalized = String(status || "").toLowerCase();
  return normalized !== "draft" && normalized !== "void";
};

const shouldIncludeBill = (status?: string): boolean => {
  const normalized = String(status || "").toLowerCase();
  return normalized !== "draft" && normalized !== "void" && normalized !== "cancelled";
};

const shouldIncludeCreditNote = (status?: string): boolean => {
  const normalized = String(status || "").toLowerCase();
  return normalized !== "draft" && normalized !== "void";
};

const shouldIncludeVendorCredit = (status?: string): boolean => {
  const normalized = String(status || "").toLowerCase();
  return normalized !== "draft" && normalized !== "void" && normalized !== "cancelled";
};

const getOutstandingBalance = (doc: any): number => {
  const total = toNumber(doc.total);
  const paid = toNumber(doc.paidAmount);
  if (doc.balance === undefined || doc.balance === null) {
    return Math.max(0, round2(total - paid));
  }
  return Math.max(0, round2(toNumber(doc.balance)));
};

const calcAgeDays = (baseDate: Date): number => {
  const today = startOfDay(new Date());
  const target = startOfDay(new Date(baseDate));
  const diff = today.getTime() - target.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  return days < 0 ? 0 : days;
};

const computeAgingBucket = (age: number): string => {
  if (age <= 0) return "Current";
  if (age <= 15) return "1-15";
  if (age <= 30) return "16-30";
  if (age <= 45) return "31-45";
  return "45+";
};

const getDateRange = (options: ReportRunOptions): DateRangeResult => {
  const today = new Date();
  const preset = String(options.dateRange || "this_month").toLowerCase();

  if (options.startDate && options.endDate) {
    const startDate = startOfDay(new Date(options.startDate));
    const endDate = endOfDay(new Date(options.endDate));
    return { startDate, endDate, label: `${startDate.toLocaleDateString("en-GB")} - ${endDate.toLocaleDateString("en-GB")}` };
  }

  const monthStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
  const monthEnd = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0);

  switch (preset) {
    case "today":
      return { startDate: startOfDay(today), endDate: endOfDay(today), label: "Today" };
    case "this_week": {
      const day = today.getDay();
      const startDate = startOfDay(new Date(today.getFullYear(), today.getMonth(), today.getDate() - day));
      const endDate = endOfDay(new Date(today.getFullYear(), today.getMonth(), today.getDate() + (6 - day)));
      return { startDate, endDate, label: "This Week" };
    }
    case "this_year":
      return {
        startDate: startOfDay(new Date(today.getFullYear(), 0, 1)),
        endDate: endOfDay(new Date(today.getFullYear(), 11, 31)),
        label: "This Year",
      };
    case "previous_month": {
      const prev = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      return { startDate: startOfDay(monthStart(prev)), endDate: endOfDay(monthEnd(prev)), label: "Previous Month" };
    }
    case "previous_year":
      return {
        startDate: startOfDay(new Date(today.getFullYear() - 1, 0, 1)),
        endDate: endOfDay(new Date(today.getFullYear() - 1, 11, 31)),
        label: "Previous Year",
      };
    default:
      return { startDate: startOfDay(monthStart(today)), endDate: endOfDay(monthEnd(today)), label: "This Month" };
  }
};

const buildDateQuery = (field: string, range: DateRangeResult): any => ({
  [field]: { $gte: range.startDate, $lte: range.endDate },
});

const permissionNote = (): string[] => [
  "Draft transactions are excluded from this report.",
  "Numbers are generated from posted transactions available in Taban Books.",
];

const loadCustomerNameMap = async (organizationId: string): Promise<Map<string, string>> => {
  const customers = await Customer.find({ organization: toObjectId(organizationId) }).select("_id displayName name companyName").lean();
  const map = new Map<string, string>();
  customers.forEach((c: any) => map.set(String(c._id), safeName(c.displayName || c.name || c.companyName, "Customer")));
  return map;
};

const loadVendorNameMap = async (organizationId: string): Promise<Map<string, string>> => {
  const vendors = await Vendor.find({ organization: toObjectId(organizationId) }).select("_id displayName name companyName").lean();
  const map = new Map<string, string>();
  vendors.forEach((v: any) => map.set(String(v._id), safeName(v.displayName || v.name || v.companyName, "Vendor")));
  return map;
};

const baseResult = (
  options: ReportRunOptions,
  range: DateRangeResult,
  reportName: string,
  columns: string[],
  rows: Array<Record<string, any>>,
  summary: Record<string, any> = {},
  chart?: ReportRunResult["chart"],
  notes: string[] = permissionNote()
): ReportRunResult => ({
  reportKey: options.reportKey,
  reportName,
  periodLabel: range.label,
  reportBasis: (options.reportBasis || "accrual") as "accrual" | "cash",
  columns,
  rows,
  summary,
  chart,
  notes,
  generatedAt: new Date().toISOString(),
});

const fallbackResult = (options: ReportRunOptions, range: DateRangeResult, reportName: string): ReportRunResult => {
  return baseResult(
    options,
    range,
    reportName,
    ["message"],
    [{ message: "Dataset generation for this report is not implemented yet." }],
    {},
    undefined,
    ["This report can still be scheduled/shared/exported from Taban Reports."]
  );
};

const generateProfitAndLoss = async (options: ReportRunOptions, range: DateRangeResult, reportName: string) => {
  const orgId = toObjectId(options.organizationId);
  const [invoices, salesReceipts, creditNotes, bills, expenses] = await Promise.all([
    Invoice.find({ organization: orgId, ...buildDateQuery("date", range) }).lean(),
    SalesReceipt.find({ organization: orgId, ...buildDateQuery("date", range) }).lean(),
    CreditNote.find({ organization: orgId, ...buildDateQuery("date", range) }).lean(),
    Bill.find({ organization: orgId, ...buildDateQuery("date", range) }).lean(),
    Expense.find({ organization: orgId, ...buildDateQuery("date", range) }).lean(),
  ]);

  const normalizeAsIncome = (value: number): number => Math.abs(toNumber(value));
  const normalizeAsCost = (value: number): number => Math.abs(toNumber(value));

  const operatingIncome =
    invoices
      .filter((x: any) => shouldIncludeInvoice(x.status))
      .reduce((s: number, x: any) => s + normalizeAsIncome(x.subtotal || x.total), 0) +
    salesReceipts.reduce((s: number, x: any) => s + normalizeAsIncome(x.subtotal || x.total), 0);

  const salesReturns = creditNotes
    .filter((x: any) => shouldIncludeCreditNote(x.status))
    .reduce((s: number, x: any) => s + normalizeAsCost(x.total), 0);

  const cogs = bills
    .filter((x: any) => shouldIncludeBill(x.status))
    .reduce((s: number, x: any) => s + normalizeAsCost(x.subtotal || x.total), 0);
  const operatingExpense = expenses.reduce((s: number, x: any) => s + normalizeAsCost(x.sub_total || x.total || x.amount), 0);

  const netIncome = operatingIncome - salesReturns;
  const grossProfit = netIncome - cogs;
  const netProfit = grossProfit - operatingExpense;

  const rows = [
    { section: "Operating Income", account: "Sales", amount: round2(operatingIncome) },
    { section: "Operating Income", account: "Sales Returns (Credit Notes)", amount: round2(-salesReturns) },
    { section: "Operating Income", account: "Net Operating Income", amount: round2(netIncome), isTotal: true },
    { section: "Cost of Goods Sold", account: "Cost of Goods Sold", amount: round2(cogs) },
    { section: "Gross Profit", account: "Gross Profit", amount: round2(grossProfit), isTotal: true },
    { section: "Operating Expense", account: "Operating Expense", amount: round2(operatingExpense) },
    { section: "Net Profit/Loss", account: "Net Profit/Loss", amount: round2(netProfit), isTotal: true, isFinal: true },
  ];

  return baseResult(
    options,
    range,
    reportName,
    ["section", "account", "amount"],
    rows,
    {
      operatingIncome: round2(netIncome),
      costOfGoodsSold: round2(cogs),
      operatingExpense: round2(operatingExpense),
      netProfit: round2(netProfit),
    },
    {
      type: "bar",
      labels: ["Income", "COGS", "Expense", "Net Profit"],
      datasets: [{ label: "Amount", data: [round2(netIncome), round2(cogs), round2(operatingExpense), round2(netProfit)] }],
    }
  );
};

const generateCashFlow = async (options: ReportRunOptions, range: DateRangeResult, reportName: string) => {
  const orgId = toObjectId(options.organizationId);
  const [paymentsReceived, paymentsMade, expenses, refunds, bankAccounts] = await Promise.all([
    PaymentReceived.find({ organization: orgId, ...buildDateQuery("date", range) }).lean(),
    PaymentMade.find({ organization: orgId, ...buildDateQuery("date", range) }).lean(),
    Expense.find({ organization: orgId, ...buildDateQuery("date", range) }).lean(),
    Refund.find({ organization: orgId, ...buildDateQuery("refundDate", range) }).lean(),
    BankAccount.find({ organization: orgId }).lean(),
  ]);

  const cashIn = paymentsReceived
    .filter((x: any) => String(x.status || "").toLowerCase() !== "draft")
    .reduce((s: number, x: any) => s + toNumber(x.amount), 0);
  const cashOut =
    paymentsMade.reduce((s: number, x: any) => s + toNumber(x.amount), 0) +
    expenses.reduce((s: number, x: any) => s + toNumber(x.total || x.amount), 0) +
    refunds.reduce((s: number, x: any) => s + toNumber(x.amount), 0);

  const netChange = cashIn - cashOut;
  const currentCash = bankAccounts.reduce((s: number, x: any) => s + toNumber(x.balance), 0);
  const beginning = currentCash - netChange;
  const ending = beginning + netChange;

  return baseResult(
    options,
    range,
    reportName,
    ["section", "account", "amount"],
    [
      { section: "Beginning Cash Balance", account: "Beginning Cash Balance", amount: round2(beginning) },
      { section: "Operating Activities", account: "Payments Received", amount: round2(cashIn) },
      { section: "Operating Activities", account: "Payments Made + Expenses + Refunds", amount: round2(-cashOut) },
      { section: "Net Change in Cash", account: "Net Change in Cash", amount: round2(netChange), isTotal: true },
      { section: "Ending Cash Balance", account: "Ending Cash Balance", amount: round2(ending), isTotal: true },
    ],
    {
      totalMoneyIn: round2(cashIn),
      totalMoneyOut: round2(cashOut),
      netChange: round2(netChange),
      endingCashBalance: round2(ending),
    },
    {
      type: "line",
      labels: ["Beginning", "In", "Out", "Ending"],
      datasets: [{ label: "Cash", data: [round2(beginning), round2(cashIn), round2(-cashOut), round2(ending)] }],
    }
  );
};

const generateBalanceSheet = async (options: ReportRunOptions, range: DateRangeResult, reportName: string) => {
  const orgId = toObjectId(options.organizationId);
  const [bankAccounts, invoices, bills, items] = await Promise.all([
    BankAccount.find({ organization: orgId }).lean(),
    Invoice.find({ organization: orgId, ...buildDateQuery("date", range) }).lean(),
    Bill.find({ organization: orgId, ...buildDateQuery("date", range) }).lean(),
    Item.find({ organization: orgId }).lean(),
  ]);

  const cash = bankAccounts.reduce((s: number, x: any) => s + toNumber(x.balance), 0);
  const receivables = invoices.filter((x: any) => shouldIncludeInvoice(x.status)).reduce((s: number, x: any) => s + getOutstandingBalance(x), 0);
  const inventory = items.reduce((s: number, x: any) => s + toNumber(x.stockQuantity) * toNumber(x.costPrice), 0);
  const assets = cash + receivables + inventory;

  const payables = bills.filter((x: any) => shouldIncludeBill(x.status)).reduce((s: number, x: any) => s + getOutstandingBalance(x), 0);
  const liabilities = payables;
  const equity = assets - liabilities;

  return baseResult(
    options,
    range,
    reportName,
    ["section", "account", "amount"],
    [
      { section: "Assets", account: "Cash and Cash Equivalents", amount: round2(cash) },
      { section: "Assets", account: "Accounts Receivable", amount: round2(receivables) },
      { section: "Assets", account: "Inventory Asset", amount: round2(inventory) },
      { section: "Assets", account: "Total Assets", amount: round2(assets), isTotal: true },
      { section: "Liabilities", account: "Accounts Payable", amount: round2(payables) },
      { section: "Liabilities", account: "Total Liabilities", amount: round2(liabilities), isTotal: true },
      { section: "Equity", account: "Owner's Equity", amount: round2(equity) },
    ],
    {
      totalAssets: round2(assets),
      totalLiabilities: round2(liabilities),
      totalEquity: round2(equity),
    }
  );
};

const generateBusinessRatios = async (options: ReportRunOptions, range: DateRangeResult, reportName: string) => {
  const pnl = await generateProfitAndLoss(options, range, "Profit and Loss");
  const bs = await generateBalanceSheet(options, range, "Balance Sheet");

  const income = toNumber(pnl.summary?.operatingIncome);
  const cogs = toNumber(pnl.summary?.costOfGoodsSold);
  const expense = toNumber(pnl.summary?.operatingExpense);
  const netProfit = toNumber(pnl.summary?.netProfit);
  const assets = toNumber(bs.summary?.totalAssets);
  const liabilities = toNumber(bs.summary?.totalLiabilities);
  const equity = toNumber(bs.summary?.totalEquity);

  const rows = [
    { ratio: "Current Ratio", value: liabilities ? round2(assets / liabilities) : 0, unit: "x" },
    { ratio: "Gross Profit Ratio", value: income ? round2(((income - cogs) / income) * 100) : 0, unit: "%" },
    { ratio: "Debt Ratio", value: assets ? round2((liabilities / assets) * 100) : 0, unit: "%" },
    { ratio: "Net Profit Ratio", value: income ? round2((netProfit / income) * 100) : 0, unit: "%" },
    { ratio: "Debt To Equity Ratio", value: equity ? round2(liabilities / equity) : 0, unit: "x" },
    { ratio: "Operating Cost Ratio", value: income ? round2((expense / income) * 100) : 0, unit: "%" },
  ];

  return baseResult(options, range, reportName, ["ratio", "value", "unit"], rows, {
    selectedRatio: options.ratioName || "Current Ratio",
  });
};

const generateMovementOfEquity = async (options: ReportRunOptions, range: DateRangeResult, reportName: string) => {
  const pnl = await generateProfitAndLoss(options, range, "Profit and Loss");
  const netProfit = toNumber(pnl.summary?.netProfit);
  const rows = [
    { account: "Opening Balance", amount: 0 },
    { account: "Current Year Earnings", amount: round2(netProfit) },
    { account: "Net Changes in Equity", amount: round2(netProfit), isTotal: true },
    { account: "Closing Balance", amount: round2(netProfit), isTotal: true },
  ];
  return baseResult(options, range, reportName, ["account", "amount"], rows, { closingBalance: round2(netProfit) });
};

const generateSalesByCustomer = async (options: ReportRunOptions, range: DateRangeResult, reportName: string) => {
  const orgId = toObjectId(options.organizationId);
  const customerNames = await loadCustomerNameMap(options.organizationId);
  const [invoices, receipts] = await Promise.all([
    Invoice.find({ organization: orgId, ...buildDateQuery("date", range) }).lean(),
    SalesReceipt.find({ organization: orgId, ...buildDateQuery("date", range) }).lean(),
  ]);

  const map = new Map<string, any>();
  const ensure = (customerId: string) => {
    if (!map.has(customerId)) {
      map.set(customerId, { customerName: customerNames.get(customerId) || "Customer", invoiceCount: 0, sales: 0, salesWithTax: 0 });
    }
    return map.get(customerId);
  };

  invoices.forEach((invoice: any) => {
    if (!shouldIncludeInvoice(invoice.status)) return;
    const row = ensure(String(invoice.customer));
    row.invoiceCount += 1;
    row.sales += toNumber(invoice.subtotal || invoice.total);
    row.salesWithTax += toNumber(invoice.total);
  });

  receipts.forEach((receipt: any) => {
    const row = ensure(String(receipt.customer));
    row.invoiceCount += 1;
    row.sales += toNumber(receipt.subtotal || receipt.total);
    row.salesWithTax += toNumber(receipt.total);
  });

  const rows = Array.from(map.values()).map((r: any) => ({
    customerName: r.customerName,
    invoiceCount: r.invoiceCount,
    sales: round2(r.sales),
    salesWithTax: round2(r.salesWithTax),
  }));

  return baseResult(options, range, reportName, ["customerName", "invoiceCount", "sales", "salesWithTax"], rows);
};

const generateSalesByItem = async (options: ReportRunOptions, range: DateRangeResult, reportName: string) => {
  const [invoices, receipts] = await Promise.all([
    Invoice.find({ organization: toObjectId(options.organizationId), ...buildDateQuery("date", range) }).lean(),
    SalesReceipt.find({ organization: toObjectId(options.organizationId), ...buildDateQuery("date", range) }).lean(),
  ]);
  const map = new Map<string, any>();

  const pushSaleLine = (line: any) => {
    const key = line.item ? String(line.item) : safeName(line.name, "Item");
    if (!map.has(key)) map.set(key, { itemName: safeName(line.name, "Item"), quantitySold: 0, amount: 0 });
    const row = map.get(key);
    row.quantitySold += toNumber(line.quantity);
    row.amount += toNumber(line.total || (toNumber(line.quantity) * toNumber(line.unitPrice)));
  };

  invoices.forEach((invoice: any) => {
    if (!shouldIncludeInvoice(invoice.status)) return;
    (invoice.items || []).forEach((line: any) => {
      pushSaleLine(line);
    });
  });

  receipts.forEach((receipt: any) => {
    (receipt.items || []).forEach((line: any) => {
      pushSaleLine(line);
    });
  });

  const rows = Array.from(map.values()).map((r: any) => ({
    itemName: r.itemName,
    quantitySold: round2(r.quantitySold),
    amount: round2(r.amount),
    averagePrice: r.quantitySold ? round2(r.amount / r.quantitySold) : 0,
  }));

  return baseResult(options, range, reportName, ["itemName", "quantitySold", "amount", "averagePrice"], rows);
};

const generatePurchasesByItem = async (options: ReportRunOptions, range: DateRangeResult, reportName: string) => {
  const [bills, vendorCredits] = await Promise.all([
    Bill.find({ organization: toObjectId(options.organizationId), ...buildDateQuery("date", range) }).lean(),
    VendorCredit.find({ organization: toObjectId(options.organizationId), ...buildDateQuery("date", range) }).lean(),
  ]);

  const map = new Map<string, any>();
  const ensure = (line: any) => {
    const key = line.item ? String(line.item) : safeName(line.name, "Item");
    if (!map.has(key)) map.set(key, { itemName: safeName(line.name, "Item"), quantityPurchased: 0, amount: 0 });
    return map.get(key);
  };

  bills.forEach((bill: any) => {
    if (!shouldIncludeBill(bill.status)) return;
    (bill.items || []).forEach((line: any) => {
      const row = ensure(line);
      row.quantityPurchased += toNumber(line.quantity);
      row.amount += toNumber(line.total || (toNumber(line.quantity) * toNumber(line.unitPrice)));
    });
  });

  vendorCredits.forEach((credit: any) => {
    if (!shouldIncludeVendorCredit(credit.status)) return;
    (credit.items || []).forEach((line: any) => {
      const row = ensure(line);
      row.quantityPurchased -= toNumber(line.quantity);
      row.amount -= toNumber(line.total || (toNumber(line.quantity) * toNumber(line.unitPrice)));
    });
  });

  const rows = Array.from(map.values()).map((r: any) => ({
    itemName: r.itemName,
    quantityPurchased: round2(r.quantityPurchased),
    amount: round2(r.amount),
    averagePrice: r.quantityPurchased ? round2(r.amount / r.quantityPurchased) : 0,
  }));

  return baseResult(options, range, reportName, ["itemName", "quantityPurchased", "amount", "averagePrice"], rows);
};

const generateSalesSummary = async (options: ReportRunOptions, range: DateRangeResult, reportName: string) => {
  const orgId = toObjectId(options.organizationId);
  const [invoices, receipts, creditNotes] = await Promise.all([
    Invoice.find({ organization: orgId, ...buildDateQuery("date", range) }).lean(),
    SalesReceipt.find({ organization: orgId, ...buildDateQuery("date", range) }).lean(),
    CreditNote.find({ organization: orgId, ...buildDateQuery("date", range) }).lean(),
  ]);

  const map = new Map<string, any>();
  const ensure = (key: string) => {
    if (!map.has(key)) map.set(key, { date: key, invoiceCount: 0, totalSales: 0, totalSalesWithTax: 0, totalTaxAmount: 0 });
    return map.get(key);
  };

  invoices.forEach((x: any) => {
    if (!shouldIncludeInvoice(x.status)) return;
    const row = ensure(formatDate(new Date(x.date)));
    row.invoiceCount += 1;
    row.totalSales += toNumber(x.subtotal || x.total);
    row.totalSalesWithTax += toNumber(x.total);
    row.totalTaxAmount += toNumber(x.tax);
  });

  receipts.forEach((x: any) => {
    const row = ensure(formatDate(new Date(x.date)));
    row.invoiceCount += 1;
    row.totalSales += toNumber(x.subtotal || x.total);
    row.totalSalesWithTax += toNumber(x.total);
    row.totalTaxAmount += toNumber(x.tax);
  });

  creditNotes.forEach((x: any) => {
    if (!shouldIncludeCreditNote(x.status)) return;
    const row = ensure(formatDate(new Date(x.date)));
    row.totalSales -= toNumber(x.subtotal || x.total);
    row.totalSalesWithTax -= toNumber(x.total);
    row.totalTaxAmount -= toNumber(x.tax);
  });

  return baseResult(
    options,
    range,
    reportName,
    ["date", "invoiceCount", "totalSales", "totalSalesWithTax", "totalTaxAmount"],
    Array.from(map.values()).map((r: any) => ({
      date: r.date,
      invoiceCount: r.invoiceCount,
      totalSales: round2(r.totalSales),
      totalSalesWithTax: round2(r.totalSalesWithTax),
      totalTaxAmount: round2(r.totalTaxAmount),
    }))
  );
};

const generateInventorySummary = async (options: ReportRunOptions, range: DateRangeResult, reportName: string) => {
  const orgId = toObjectId(options.organizationId);
  const [items, purchaseOrders, bills, invoices] = await Promise.all([
    Item.find({ organization: orgId, isActive: { $ne: false } }).lean(),
    PurchaseOrder.find({ organization: orgId, ...buildDateQuery("date", range) }).lean(),
    Bill.find({ organization: orgId, ...buildDateQuery("date", range) }).lean(),
    Invoice.find({ organization: orgId, ...buildDateQuery("date", range) }).lean(),
  ]);

  const map = new Map<string, any>();
  items.forEach((item: any) => {
    map.set(String(item._id), {
      itemName: safeName(item.name, "Item"),
      sku: safeName(item.sku, "-"),
      quantityOrdered: 0,
      committedStock: 0,
      stockOnHand: toNumber(item.stockQuantity),
    });
  });

  const ensure = (itemId: any, itemName: string) => {
    const key = itemId ? String(itemId) : `name:${itemName}`;
    if (!map.has(key)) {
      map.set(key, { itemName: safeName(itemName, "Item"), sku: "-", quantityOrdered: 0, committedStock: 0, stockOnHand: 0 });
    }
    return map.get(key);
  };

  purchaseOrders.forEach((po: any) => {
    const status = String(po.status || "").toLowerCase();
    if (status === "draft" || status === "cancelled" || status === "void") return;
    (po.items || []).forEach((line: any) => (ensure(line.item, line.name).quantityOrdered += toNumber(line.quantity)));
  });

  bills.forEach((bill: any) => {
    if (!shouldIncludeBill(bill.status)) return;
    // Per requested logic, quantity ordered includes bills and purchase orders.
    (bill.items || []).forEach((line: any) => (ensure(line.item, line.name).quantityOrdered += toNumber(line.quantity)));
  });

  invoices.forEach((inv: any) => {
    // Used as committed stock proxy where Sales Orders/Delivery Challans are unavailable.
    if (!["sent", "overdue", "partially paid", "viewed"].includes(String(inv.status || "").toLowerCase())) return;
    (inv.items || []).forEach((line: any) => (ensure(line.item, line.name).committedStock += toNumber(line.quantity)));
  });

  const rows = Array.from(map.values()).map((r: any) => ({
    itemName: r.itemName,
    sku: r.sku,
    quantityOrdered: round2(r.quantityOrdered),
    committedStock: round2(r.committedStock),
    stockOnHand: round2(r.stockOnHand),
  }));

  return baseResult(options, range, reportName, ["itemName", "sku", "quantityOrdered", "committedStock", "stockOnHand"], rows);
};

const generateInventoryValuation = async (options: ReportRunOptions, range: DateRangeResult, reportName: string) => {
  const items = await Item.find({ organization: toObjectId(options.organizationId) }).lean();
  const rows = items.map((item: any) => ({
    itemName: safeName(item.name, "Item"),
    sku: safeName(item.sku, "-"),
    stockOnHand: round2(toNumber(item.stockQuantity)),
    unitCost: round2(toNumber(item.costPrice)),
    inventoryAssetValue: round2(toNumber(item.stockQuantity) * toNumber(item.costPrice)),
  }));
  return baseResult(options, range, reportName, ["itemName", "sku", "stockOnHand", "unitCost", "inventoryAssetValue"], rows);
};

const generateFifoCostLotTracking = async (options: ReportRunOptions, range: DateRangeResult, reportName: string) => {
  const orgId = toObjectId(options.organizationId);
  const [bills, invoices, receipts] = await Promise.all([
    Bill.find({ organization: orgId, date: { $lte: range.endDate } }).sort({ date: 1 }).lean(),
    Invoice.find({ organization: orgId, date: { $lte: range.endDate } }).sort({ date: 1 }).lean(),
    SalesReceipt.find({ organization: orgId, date: { $lte: range.endDate } }).sort({ date: 1 }).lean(),
  ]);

  type Lot = { qty: number; rate: number; date: Date; source: string };
  const fifoByItem = new Map<string, Lot[]>();
  const rows: Array<Record<string, any>> = [];

  const ensureLots = (itemKey: string): Lot[] => {
    if (!fifoByItem.has(itemKey)) fifoByItem.set(itemKey, []);
    return fifoByItem.get(itemKey)!;
  };

  const addPurchaseLot = (line: any, docDate: Date, source: string, includeRow: boolean) => {
    const qty = Math.max(0, toNumber(line.quantity));
    if (qty <= 0) return;
    const rate = toNumber(line.unitPrice);
    const itemKey = line.item ? String(line.item) : safeName(line.name, "Item");
    ensureLots(itemKey).push({ qty, rate, date: docDate, source });

    if (includeRow) {
      rows.push({
        itemName: safeName(line.name, "Item"),
        batchSource: source,
        productInDate: formatDate(docDate),
        productInQty: round2(qty),
        productInRate: round2(rate),
        productInAmount: round2(qty * rate),
        productOutDate: "-",
        productOutQty: 0,
        productOutRate: 0,
        productOutAmount: 0,
        fifoCost: 0,
        profitOrLoss: 0,
      });
    }
  };

  const consumeSaleLots = (line: any, docDate: Date, source: string, includeRow: boolean) => {
    let qtyToConsume = Math.max(0, toNumber(line.quantity));
    if (qtyToConsume <= 0) return;

    const saleRate = toNumber(line.unitPrice);
    const itemKey = line.item ? String(line.item) : safeName(line.name, "Item");
    const itemName = safeName(line.name, "Item");
    const lots = ensureLots(itemKey);

    while (qtyToConsume > 0) {
      const lot = lots[0];
      const takeQty = lot ? Math.min(qtyToConsume, lot.qty) : qtyToConsume;
      const fifoRate = lot ? lot.rate : 0;
      const fifoCost = takeQty * fifoRate;
      const saleAmount = takeQty * saleRate;
      const pnl = saleAmount - fifoCost;

      if (includeRow) {
        rows.push({
          itemName,
          batchSource: lot ? lot.source : "Opening/Unknown Lot",
          productInDate: lot ? formatDate(new Date(lot.date)) : "-",
          productInQty: lot ? round2(lot.qty) : 0,
          productInRate: round2(fifoRate),
          productInAmount: lot ? round2(lot.qty * fifoRate) : 0,
          productOutDate: formatDate(docDate),
          productOutQty: round2(takeQty),
          productOutRate: round2(saleRate),
          productOutAmount: round2(saleAmount),
          fifoCost: round2(fifoCost),
          profitOrLoss: round2(pnl),
          productOutSource: source,
        });
      }

      qtyToConsume -= takeQty;
      if (lot) {
        lot.qty -= takeQty;
        if (lot.qty <= 0) lots.shift();
      }
    }
  };

  // Seed FIFO with purchases before report start.
  bills.forEach((bill: any) => {
    if (!shouldIncludeBill(bill.status)) return;
    const billDate = new Date(bill.date);
    if (billDate >= range.startDate) return;
    (bill.items || []).forEach((line: any) => addPurchaseLot(line, billDate, safeName(bill.billNumber, "Bill"), false));
  });

  // Build in-range events and process in date order.
  const events: Array<{ date: Date; kind: "purchase" | "sale"; source: string; lines: any[]; include: boolean }> = [];

  bills.forEach((bill: any) => {
    if (!shouldIncludeBill(bill.status)) return;
    const date = new Date(bill.date);
    if (date < range.startDate || date > range.endDate) return;
    events.push({ date, kind: "purchase", source: safeName(bill.billNumber, "Bill"), lines: bill.items || [], include: true });
  });

  invoices.forEach((invoice: any) => {
    if (!shouldIncludeInvoice(invoice.status)) return;
    const date = new Date(invoice.date);
    if (date < range.startDate || date > range.endDate) return;
    events.push({ date, kind: "sale", source: safeName(invoice.invoiceNumber, "Invoice"), lines: invoice.items || [], include: true });
  });

  receipts.forEach((receipt: any) => {
    const date = new Date(receipt.date);
    if (date < range.startDate || date > range.endDate) return;
    events.push({ date, kind: "sale", source: safeName(receipt.receiptNumber, "Sales Receipt"), lines: receipt.items || [], include: true });
  });

  events.sort((a, b) => a.date.getTime() - b.date.getTime());
  events.forEach((event) => {
    if (event.kind === "purchase") {
      event.lines.forEach((line: any) => addPurchaseLot(line, event.date, event.source, event.include));
    } else {
      event.lines.forEach((line: any) => consumeSaleLots(line, event.date, event.source, event.include));
    }
  });

  return baseResult(
    options,
    range,
    reportName,
    [
      "itemName",
      "batchSource",
      "productInDate",
      "productInQty",
      "productInRate",
      "productInAmount",
      "productOutDate",
      "productOutQty",
      "productOutRate",
      "productOutAmount",
      "fifoCost",
      "profitOrLoss",
      "productOutSource",
    ],
    rows
  );
};

const generateInventoryAdjustments = async (
  options: ReportRunOptions,
  range: DateRangeResult,
  reportName: string,
  summaryMode: boolean
) => {
  const adjustments = await InventoryAdjustment.find({ organization: toObjectId(options.organizationId), ...buildDateQuery("date", range) }).lean();

  const rows = adjustments.map((a: any) => {
    const quantityAdjusted = (a.items || []).reduce((s: number, x: any) => s + toNumber(x.quantityAdjusted), 0);
    const valueAdjusted = (a.items || []).reduce((s: number, x: any) => s + toNumber(x.cost) * toNumber(x.quantityAdjusted), 0);
    return {
      referenceNumber: safeName(a.referenceNumber || a.adjustmentNumber, "-"),
      date: formatDate(new Date(a.date)),
      status: safeName(a.status, "DRAFT"),
      reason: safeName(a.reason, "-"),
      adjustmentType: safeName(a.type, "-"),
      quantityAdjusted: round2(quantityAdjusted),
      valueAdjusted: round2(valueAdjusted),
      quantityIncreased: round2(Math.max(0, quantityAdjusted)),
      quantityDecreased: round2(Math.abs(Math.min(0, quantityAdjusted))),
      valueIncreased: round2(Math.max(0, valueAdjusted)),
      valueDecreased: round2(Math.abs(Math.min(0, valueAdjusted))),
    };
  });

  const cols = summaryMode
    ? ["referenceNumber", "date", "status", "reason", "adjustmentType", "quantityIncreased", "quantityDecreased", "valueIncreased", "valueDecreased"]
    : ["referenceNumber", "date", "status", "reason", "adjustmentType", "quantityAdjusted", "valueAdjusted"];

  return baseResult(options, range, reportName, cols, rows);
};

const generateCustomerBalanceSummary = async (options: ReportRunOptions, range: DateRangeResult, reportName: string) => {
  const orgId = toObjectId(options.organizationId);
  const customerNames = await loadCustomerNameMap(options.organizationId);
  const [invoices, payments] = await Promise.all([
    Invoice.find({ organization: orgId, ...buildDateQuery("date", range) }).lean(),
    PaymentReceived.find({ organization: orgId, ...buildDateQuery("date", range) }).lean(),
  ]);

  const map = new Map<string, any>();
  const ensure = (customerId: string) => {
    if (!map.has(customerId)) {
      map.set(customerId, { customerName: customerNames.get(customerId) || "Customer", invoicedAmount: 0, amountReceived: 0, closingBalance: 0 });
    }
    return map.get(customerId);
  };

  invoices.forEach((x: any) => {
    if (!shouldIncludeInvoice(x.status)) return;
    const row = ensure(String(x.customer));
    row.invoicedAmount += toNumber(x.total);
    row.closingBalance += getOutstandingBalance(x);
  });

  payments.forEach((x: any) => {
    const row = ensure(String(x.customer));
    row.amountReceived += toNumber(x.amount);
  });

  return baseResult(
    options,
    range,
    reportName,
    ["customerName", "invoicedAmount", "amountReceived", "closingBalance"],
    Array.from(map.values()).map((r: any) => ({
      customerName: r.customerName,
      invoicedAmount: round2(r.invoicedAmount),
      amountReceived: round2(r.amountReceived),
      closingBalance: round2(r.closingBalance),
    }))
  );
};

const generateAgingDetails = async (options: ReportRunOptions, range: DateRangeResult, reportName: string) => {
  const customerNames = await loadCustomerNameMap(options.organizationId);
  const invoices = await Invoice.find({ organization: toObjectId(options.organizationId), ...buildDateQuery("date", range) }).lean();
  const ageByDueDate = String(options.reportBy || "Invoice Due Date").toLowerCase().includes("due");

  const rows = invoices
    .filter((x: any) => shouldIncludeInvoice(x.status))
    .map((x: any) => {
      const baseDate = ageByDueDate ? x.dueDate || x.date : x.date;
      const age = calcAgeDays(new Date(baseDate));
      const balance = getOutstandingBalance(x);
      return {
        date: formatDate(new Date(x.date)),
        transactionNumber: safeName(x.invoiceNumber, "-"),
        status: safeName(x.status, "sent"),
        customerName: customerNames.get(String(x.customer)) || "Customer",
        age,
        amount: round2(toNumber(x.total)),
        balanceDue: round2(balance),
        bucket: computeAgingBucket(age),
      };
    })
    .filter((x) => x.balanceDue > 0);

  return baseResult(options, range, reportName, ["date", "transactionNumber", "status", "customerName", "age", "amount", "balanceDue", "bucket"], rows);
};

const generateAgingSummary = async (options: ReportRunOptions, range: DateRangeResult, reportName: string) => {
  const details = await generateAgingDetails(options, range, "Aging Details");
  const map = new Map<string, any>();

  details.rows.forEach((row: any) => {
    if (!map.has(row.customerName)) {
      map.set(row.customerName, { customerName: row.customerName, current: 0, "1-15": 0, "16-30": 0, "31-45": 0, "45+": 0, total: 0 });
    }
    const current = map.get(row.customerName);
    current[row.bucket] += toNumber(row.balanceDue);
    current.total += toNumber(row.balanceDue);
  });

  return baseResult(
    options,
    range,
    reportName,
    ["customerName", "current", "1-15", "16-30", "31-45", "45+", "total"],
    Array.from(map.values()).map((r: any) => ({ ...r, current: round2(r.current), "1-15": round2(r["1-15"]), "16-30": round2(r["16-30"]), "31-45": round2(r["31-45"]), "45+": round2(r["45+"]), total: round2(r.total) }))
  );
};

const generateInvoiceDetails = async (options: ReportRunOptions, range: DateRangeResult, reportName: string) => {
  const customerNames = await loadCustomerNameMap(options.organizationId);
  const invoices = await Invoice.find({ organization: toObjectId(options.organizationId), ...buildDateQuery("date", range) }).lean();
  const rows = invoices.filter((x: any) => shouldIncludeInvoice(x.status)).map((x: any) => ({
    invoiceNumber: safeName(x.invoiceNumber, "-"),
    invoiceDate: formatDate(new Date(x.date)),
    dueDate: formatDate(new Date(x.dueDate || x.date)),
    status: safeName(x.status, "sent"),
    customerName: customerNames.get(String(x.customer)) || "Customer",
    amount: round2(toNumber(x.total)),
    balanceDue: round2(getOutstandingBalance(x)),
  }));
  return baseResult(options, range, reportName, ["invoiceNumber", "invoiceDate", "dueDate", "status", "customerName", "amount", "balanceDue"], rows);
};

const generateQuoteDetails = async (options: ReportRunOptions, range: DateRangeResult, reportName: string) => {
  const customerNames = await loadCustomerNameMap(options.organizationId);
  const quotes = await Quote.find({ organization: toObjectId(options.organizationId), ...buildDateQuery("date", range) }).lean();
  const rows = quotes.map((x: any) => ({
    quoteNumber: safeName(x.quoteNumber, "-"),
    quoteDate: formatDate(new Date(x.date)),
    expiryDate: x.expiryDate ? formatDate(new Date(x.expiryDate)) : "-",
    status: safeName(x.status, "draft"),
    customerName: customerNames.get(String(x.customer)) || "Customer",
    amount: round2(toNumber(x.total)),
  }));
  return baseResult(options, range, reportName, ["quoteNumber", "quoteDate", "expiryDate", "status", "customerName", "amount"], rows);
};

const generatePaymentsReceived = async (options: ReportRunOptions, range: DateRangeResult, reportName: string) => {
  const customerNames = await loadCustomerNameMap(options.organizationId);
  const payments = await PaymentReceived.find({ organization: toObjectId(options.organizationId), ...buildDateQuery("date", range) }).lean();
  const rows = payments.map((x: any) => ({
    date: formatDate(new Date(x.date)),
    paymentNumber: safeName(x.paymentNumber, "-"),
    customerName: customerNames.get(String(x.customer)) || "Customer",
    amount: round2(toNumber(x.amount)),
    status: safeName(x.status, "paid"),
    paymentMethod: safeName(x.paymentMethod, "-"),
  }));
  return baseResult(options, range, reportName, ["date", "paymentNumber", "customerName", "amount", "status", "paymentMethod"], rows, {}, undefined, permissionNote());
};

const generateTimeToGetPaid = async (options: ReportRunOptions, range: DateRangeResult, reportName: string) => {
  const [invoices, payments] = await Promise.all([
    Invoice.find({ organization: toObjectId(options.organizationId) }).select("_id date").lean(),
    PaymentReceived.find({ organization: toObjectId(options.organizationId), ...buildDateQuery("date", range) }).lean(),
  ]);

  const invoiceMap = new Map<string, Date>();
  invoices.forEach((x: any) => invoiceMap.set(String(x._id), new Date(x.date)));

  const buckets: any = {
    "0-15 days": { bucket: "0-15 days", invoiceCount: 0, amount: 0 },
    "16-30 days": { bucket: "16-30 days", invoiceCount: 0, amount: 0 },
    "31-45 days": { bucket: "31-45 days", invoiceCount: 0, amount: 0 },
    "Above 45 days": { bucket: "Above 45 days", invoiceCount: 0, amount: 0 },
  };

  payments.forEach((p: any) => {
    (p.allocations || []).forEach((a: any) => {
      const invoiceDate = invoiceMap.get(String(a.invoice));
      if (!invoiceDate) return;
      const paidDate = new Date(p.date);
      const days = Math.floor((startOfDay(paidDate).getTime() - startOfDay(invoiceDate).getTime()) / (1000 * 60 * 60 * 24));
      const amount = toNumber(a.amount);
      if (days <= 15) {
        buckets["0-15 days"].invoiceCount += 1;
        buckets["0-15 days"].amount += amount;
      } else if (days <= 30) {
        buckets["16-30 days"].invoiceCount += 1;
        buckets["16-30 days"].amount += amount;
      } else if (days <= 45) {
        buckets["31-45 days"].invoiceCount += 1;
        buckets["31-45 days"].amount += amount;
      } else {
        buckets["Above 45 days"].invoiceCount += 1;
        buckets["Above 45 days"].amount += amount;
      }
    });
  });

  return baseResult(options, range, reportName, ["bucket", "invoiceCount", "amount"], Object.values(buckets).map((x: any) => ({ ...x, amount: round2(x.amount) })));
};

const generateCreditNoteDetails = async (options: ReportRunOptions, range: DateRangeResult, reportName: string) => {
  const customerNames = await loadCustomerNameMap(options.organizationId);
  const notes = await CreditNote.find({ organization: toObjectId(options.organizationId), ...buildDateQuery("date", range) }).lean();
  const rows = notes.filter((x: any) => shouldIncludeCreditNote(x.status)).map((x: any) => ({
    creditNoteNumber: safeName(x.creditNoteNumber, "-"),
    date: formatDate(new Date(x.date)),
    customerName: customerNames.get(String(x.customer)) || "Customer",
    status: safeName(x.status, "open"),
    creditNoteAmount: round2(toNumber(x.total)),
    balanceAmount: round2(toNumber(x.balance)),
  }));
  return baseResult(options, range, reportName, ["creditNoteNumber", "date", "customerName", "status", "creditNoteAmount", "balanceAmount"], rows);
};

const generateRefundHistory = async (options: ReportRunOptions, range: DateRangeResult, reportName: string) => {
  const customerNames = await loadCustomerNameMap(options.organizationId);
  const refunds = await Refund.find({ organization: toObjectId(options.organizationId), ...buildDateQuery("refundDate", range) }).lean();
  const rows = refunds.map((x: any) => ({
    refundNumber: safeName(x.refundNumber, "-"),
    refundDate: formatDate(new Date(x.refundDate)),
    customerName: customerNames.get(String(x.customer)) || "Customer",
    amount: round2(toNumber(x.amount)),
    paymentMethod: safeName(x.paymentMethod, "-"),
    referenceNumber: safeName(x.referenceNumber, "-"),
  }));
  return baseResult(options, range, reportName, ["refundNumber", "refundDate", "customerName", "amount", "paymentMethod", "referenceNumber"], rows);
};

const generateVendorBalanceSummary = async (options: ReportRunOptions, range: DateRangeResult, reportName: string) => {
  const orgId = toObjectId(options.organizationId);
  const vendorNames = await loadVendorNameMap(options.organizationId);
  const [bills, payments] = await Promise.all([
    Bill.find({ organization: orgId, ...buildDateQuery("date", range) }).lean(),
    PaymentMade.find({ organization: orgId, ...buildDateQuery("date", range) }).lean(),
  ]);

  const map = new Map<string, any>();
  const ensure = (vendorId: string) => {
    if (!map.has(vendorId)) map.set(vendorId, { vendorName: vendorNames.get(vendorId) || "Vendor", billedAmount: 0, amountPaid: 0, closingBalance: 0 });
    return map.get(vendorId);
  };

  bills.forEach((x: any) => {
    if (!shouldIncludeBill(x.status)) return;
    const row = ensure(String(x.vendor));
    row.billedAmount += toNumber(x.total);
    row.closingBalance += getOutstandingBalance(x);
  });

  payments.forEach((x: any) => {
    const row = ensure(String(x.vendor));
    row.amountPaid += toNumber(x.amount);
  });

  return baseResult(
    options,
    range,
    reportName,
    ["vendorName", "billedAmount", "amountPaid", "closingBalance"],
    Array.from(map.values()).map((r: any) => ({
      vendorName: r.vendorName,
      billedAmount: round2(r.billedAmount),
      amountPaid: round2(r.amountPaid),
      closingBalance: round2(r.closingBalance),
    }))
  );
};

const generateAPAgingDetails = async (options: ReportRunOptions, range: DateRangeResult, reportName: string) => {
  const vendorNames = await loadVendorNameMap(options.organizationId);
  const bills = await Bill.find({ organization: toObjectId(options.organizationId), ...buildDateQuery("date", range) }).lean();
  const rows = bills.filter((x: any) => shouldIncludeBill(x.status)).map((x: any) => {
    const age = calcAgeDays(new Date(x.dueDate || x.date));
    const balance = getOutstandingBalance(x);
    return {
      date: formatDate(new Date(x.date)),
      transactionNumber: safeName(x.billNumber, "-"),
      status: safeName(x.status, "open"),
      vendorName: vendorNames.get(String(x.vendor)) || "Vendor",
      age,
      amount: round2(toNumber(x.total)),
      balanceDue: round2(balance),
      bucket: computeAgingBucket(age),
    };
  }).filter((x) => x.balanceDue > 0);

  return baseResult(options, range, reportName, ["date", "transactionNumber", "status", "vendorName", "age", "amount", "balanceDue", "bucket"], rows);
};

const generateAPAgingSummary = async (options: ReportRunOptions, range: DateRangeResult, reportName: string) => {
  const details = await generateAPAgingDetails(options, range, "AP Aging Details");
  const map = new Map<string, any>();
  details.rows.forEach((row: any) => {
    if (!map.has(row.vendorName)) map.set(row.vendorName, { vendorName: row.vendorName, current: 0, "1-15": 0, "16-30": 0, "31-45": 0, "45+": 0, total: 0 });
    const current = map.get(row.vendorName);
    current[row.bucket] += toNumber(row.balanceDue);
    current.total += toNumber(row.balanceDue);
  });

  return baseResult(
    options,
    range,
    reportName,
    ["vendorName", "current", "1-15", "16-30", "31-45", "45+", "total"],
    Array.from(map.values()).map((r: any) => ({ ...r, current: round2(r.current), "1-15": round2(r["1-15"]), "16-30": round2(r["16-30"]), "31-45": round2(r["31-45"]), "45+": round2(r["45+"]), total: round2(r.total) }))
  );
};

const generateVendorCreditDetails = async (options: ReportRunOptions, range: DateRangeResult, reportName: string) => {
  const vendorNames = await loadVendorNameMap(options.organizationId);
  const credits = await VendorCredit.find({ organization: toObjectId(options.organizationId), ...buildDateQuery("date", range) }).lean();
  const rows = credits.filter((x: any) => shouldIncludeVendorCredit(x.status)).map((x: any) => ({
    vendorCreditNumber: safeName(x.vendorCreditNumber, "-"),
    date: formatDate(new Date(x.date)),
    vendorName: vendorNames.get(String(x.vendor)) || safeName(x.vendorName, "Vendor"),
    status: safeName(x.status, "open"),
    total: round2(toNumber(x.total)),
    balance: round2(toNumber(x.balance)),
  }));
  return baseResult(options, range, reportName, ["vendorCreditNumber", "date", "vendorName", "status", "total", "balance"], rows);
};

const generatePaymentsMade = async (options: ReportRunOptions, range: DateRangeResult, reportName: string) => {
  const vendorNames = await loadVendorNameMap(options.organizationId);
  const payments = await PaymentMade.find({ organization: toObjectId(options.organizationId), ...buildDateQuery("date", range) }).lean();
  const rows = payments.map((x: any) => ({
    date: formatDate(new Date(x.date)),
    paymentNumber: safeName(x.paymentNumber, "-"),
    vendorName: vendorNames.get(String(x.vendor)) || "Vendor",
    amount: round2(toNumber(x.amount)),
    paymentMethod: safeName(x.paymentMethod, "-"),
    paymentReference: safeName(x.paymentReference, "-"),
  }));
  return baseResult(options, range, reportName, ["date", "paymentNumber", "vendorName", "amount", "paymentMethod", "paymentReference"], rows);
};

const generatePurchaseOrderDetails = async (options: ReportRunOptions, range: DateRangeResult, reportName: string) => {
  const vendorNames = await loadVendorNameMap(options.organizationId);
  const orders = await PurchaseOrder.find({ organization: toObjectId(options.organizationId), ...buildDateQuery("date", range) }).lean();
  const rows = orders.map((x: any) => ({
    purchaseOrderNumber: safeName(x.purchaseOrderNumber, "-"),
    date: formatDate(new Date(x.date)),
    expectedDate: x.expectedDate ? formatDate(new Date(x.expectedDate)) : "-",
    status: safeName(x.status, "open"),
    vendorName: vendorNames.get(String(x.vendor)) || safeName(x.vendorName, "Vendor"),
    total: round2(toNumber(x.total)),
  }));
  return baseResult(options, range, reportName, ["purchaseOrderNumber", "date", "expectedDate", "status", "vendorName", "total"], rows);
};

const generatePurchaseOrdersByVendor = async (options: ReportRunOptions, range: DateRangeResult, reportName: string) => {
  const details = await generatePurchaseOrderDetails(options, range, "Purchase Order Details");
  const map = new Map<string, any>();
  details.rows.forEach((x: any) => {
    if (!map.has(x.vendorName)) map.set(x.vendorName, { vendorName: x.vendorName, purchaseOrderCount: 0, amount: 0 });
    const row = map.get(x.vendorName);
    row.purchaseOrderCount += 1;
    row.amount += toNumber(x.total);
  });
  return baseResult(options, range, reportName, ["vendorName", "purchaseOrderCount", "amount"], Array.from(map.values()).map((x: any) => ({ ...x, amount: round2(x.amount) })));
};

const generateTimesheetDetails = async (options: ReportRunOptions, range: DateRangeResult, reportName: string) => {
  const orgId = toObjectId(options.organizationId);
  const [entries, projects, users, customers] = await Promise.all([
    TimeEntry.find({ organization: orgId, ...buildDateQuery("date", range) }).lean(),
    Project.find({ organization: orgId }).lean(),
    User.find({ organization: orgId }).select("_id name").lean(),
    Customer.find({ organization: orgId }).select("_id displayName name").lean(),
  ]);

  const projectMap = new Map<string, any>();
  projects.forEach((x: any) => projectMap.set(String(x._id), x));
  const userMap = new Map<string, any>();
  users.forEach((x: any) => userMap.set(String(x._id), x));
  const customerMap = new Map<string, string>();
  customers.forEach((x: any) => customerMap.set(String(x._id), safeName(x.displayName || x.name, "Customer")));

  const rows = entries.map((x: any) => {
    const project = projectMap.get(String(x.project));
    const user = userMap.get(String(x.user));
    const customerName = project?.customer ? customerMap.get(String(project.customer)) || "Customer" : "-";
    const loggedHours = toNumber(x.hours) + toNumber(x.minutes) / 60;
    return {
      date: formatDate(new Date(x.date)),
      customerName,
      projectName: safeName(project?.name, "Project"),
      task: safeName(x.task, "-"),
      staff: safeName(user?.name, "Staff"),
      notes: safeName(x.description, "-"),
      loggedHours: round2(loggedHours),
      status: x.billable ? "Billable" : "Non-Billable",
      billingAmount: round2(loggedHours * toNumber(x.billingRate)),
    };
  });

  return baseResult(options, range, reportName, ["date", "customerName", "projectName", "task", "staff", "notes", "loggedHours", "status", "billingAmount"], rows);
};

const generateTimesheetProfitability = async (options: ReportRunOptions, range: DateRangeResult, reportName: string) => {
  const details = await generateTimesheetDetails(options, range, "Timesheet Details");
  const map = new Map<string, any>();
  details.rows.forEach((x: any) => {
    if (!map.has(x.projectName)) map.set(x.projectName, { projectName: x.projectName, loggedHours: 0, billingAmount: 0 });
    const row = map.get(x.projectName);
    row.loggedHours += toNumber(x.loggedHours);
    row.billingAmount += toNumber(x.billingAmount);
  });
  const rows = Array.from(map.values()).map((x: any) => {
    const totalCost = round2(x.loggedHours * 10);
    return { projectName: x.projectName, loggedHours: round2(x.loggedHours), billingAmount: round2(x.billingAmount), totalCost, profit: round2(x.billingAmount - totalCost) };
  });
  return baseResult(options, range, reportName, ["projectName", "loggedHours", "billingAmount", "totalCost", "profit"], rows);
};

const generateProjectSummary = async (options: ReportRunOptions, range: DateRangeResult, reportName: string) => {
  const orgId = toObjectId(options.organizationId);
  const [projects, entries, customers] = await Promise.all([
    Project.find({ organization: orgId }).lean(),
    TimeEntry.find({ organization: orgId, ...buildDateQuery("date", range) }).lean(),
    Customer.find({ organization: orgId }).select("_id displayName name").lean(),
  ]);

  const customerMap = new Map<string, string>();
  customers.forEach((x: any) => customerMap.set(String(x._id), safeName(x.displayName || x.name, "Customer")));

  const hoursByProject = new Map<string, number>();
  entries.forEach((x: any) => {
    const key = String(x.project);
    const current = toNumber(hoursByProject.get(key));
    hoursByProject.set(key, current + toNumber(x.hours) + toNumber(x.minutes) / 60);
  });

  const rows = projects.map((x: any) => {
    const loggedHours = toNumber(hoursByProject.get(String(x._id)));
    const revenue = loggedHours * toNumber(x.billingRate);
    const budget = toNumber(x.budget);
    return {
      projectName: safeName(x.name, "Project"),
      customerName: x.customer ? customerMap.get(String(x.customer)) || "Customer" : "-",
      status: safeName(x.status, "active"),
      loggedHours: round2(loggedHours),
      budgetAmount: round2(budget),
      actualRevenue: round2(revenue),
      performance: budget ? round2((revenue / budget) * 100) : 0,
    };
  });

  return baseResult(options, range, reportName, ["projectName", "customerName", "status", "loggedHours", "budgetAmount", "actualRevenue", "performance"], rows);
};

const generateActivityLogs = async (options: ReportRunOptions, range: DateRangeResult, reportName: string) => {
  const rows = (await WorkflowLog.find({ organization: toObjectId(options.organizationId), ...buildDateQuery("executedAt", range) }).sort({ executedAt: -1 }).limit(1000).lean()).map((x: any) => ({
    executedAt: formatDate(new Date(x.executedAt)),
    entityType: safeName(x.entityType, "-"),
    entityId: safeName(x.entityId, "-"),
    status: safeName(x.status, "pending"),
    actionsCount: Array.isArray(x.actionsExecuted) ? x.actionsExecuted.length : 0,
    error: safeName(x.error, "-"),
  }));
  return baseResult(options, range, reportName, ["executedAt", "entityType", "entityId", "status", "actionsCount", "error"], rows);
};

const generateAccountTransactions = async (options: ReportRunOptions, range: DateRangeResult, reportName: string) => {
  const invoiceDetails = await generateInvoiceDetails({ ...options, reportKey: "invoice_details" }, range, "Invoice Details");
  const paymentsReceived = await generatePaymentsReceived({ ...options, reportKey: "payments_received" }, range, "Payments Received");
  const paymentsMade = await generatePaymentsMade({ ...options, reportKey: "payments_made" }, range, "Payments Made");
  const bankTransactions = await BankTransaction.find({
    organization: toObjectId(options.organizationId),
    ...buildDateQuery("date", range),
    status: { $ne: "excluded" },
  }).lean();

  const bankRows = bankTransactions.map((x: any) => {
    const transactionType = safeName(String(x.transactionType || "").replace(/_/g, " "), "Bank Transaction")
      .replace(/\b\w/g, (char) => char.toUpperCase());
    const account =
      safeName(x.accountName, "") ||
      safeName(x.toAccountName, "") ||
      safeName(x.fromAccountName, "") ||
      "Cash/Bank";
    const amount = round2(toNumber(x.amount));
    const isCredit = String(x.debitOrCredit || "").toLowerCase() === "credit";

    return {
      date: formatDate(new Date(x.date)),
      transactionType,
      referenceNumber: safeName(x.referenceNumber, "-"),
      account,
      debit: isCredit ? amount : 0,
      credit: isCredit ? 0 : amount,
      balance: 0,
    };
  });

  const rows = [
    ...invoiceDetails.rows.map((x: any) => ({
      date: x.invoiceDate,
      transactionType: "Invoice",
      referenceNumber: x.invoiceNumber,
      account: "Accounts Receivable",
      debit: round2(toNumber(x.amount)),
      credit: 0,
      balance: round2(toNumber(x.balanceDue)),
    })),
    ...paymentsReceived.rows.map((x: any) => ({
      date: x.date,
      transactionType: "Payment Received",
      referenceNumber: x.paymentNumber,
      account: "Cash/Bank",
      debit: round2(toNumber(x.amount)),
      credit: 0,
      balance: 0,
    })),
    ...paymentsMade.rows.map((x: any) => ({
      date: x.date,
      transactionType: "Payment Made",
      referenceNumber: x.paymentNumber,
      account: "Accounts Payable",
      debit: 0,
      credit: round2(toNumber(x.amount)),
      balance: 0,
    })),
    ...bankRows,
  ].sort((a, b) => String(a.date).localeCompare(String(b.date)));

  return baseResult(options, range, reportName, ["date", "transactionType", "referenceNumber", "account", "debit", "credit", "balance"], rows);
};

const generateTrialBalance = async (options: ReportRunOptions, range: DateRangeResult, reportName: string) => {
  const tx = await generateAccountTransactions(options, range, "Account Transactions");
  const map = new Map<string, any>();
  tx.rows.forEach((x: any) => {
    if (!map.has(x.account)) map.set(x.account, { account: x.account, debit: 0, credit: 0 });
    const row = map.get(x.account);
    row.debit += toNumber(x.debit);
    row.credit += toNumber(x.credit);
  });
  const rows = Array.from(map.values()).map((x: any) => ({ account: x.account, debit: round2(x.debit), credit: round2(x.credit) }));
  return baseResult(options, range, reportName, ["account", "debit", "credit"], rows);
};

const generateAccountTypeSummary = async (options: ReportRunOptions, range: DateRangeResult, reportName: string) => {
  const trial = await generateTrialBalance(options, range, "Trial Balance");
  const assets = round2(trial.rows.filter((x: any) => String(x.account).toLowerCase().includes("cash") || String(x.account).toLowerCase().includes("receivable")).reduce((s: number, x: any) => s + toNumber(x.debit), 0));
  const liabilities = round2(trial.rows.filter((x: any) => String(x.account).toLowerCase().includes("payable")).reduce((s: number, x: any) => s + toNumber(x.credit), 0));
  const rows = [
    { accountType: "Assets", amount: assets },
    { accountType: "Liabilities", amount: liabilities },
    { accountType: "Income", amount: 0 },
    { accountType: "Expenses", amount: 0 },
  ];
  return baseResult(options, range, reportName, ["accountType", "amount"], rows);
};

const generateBudgetVsActuals = async (options: ReportRunOptions, range: DateRangeResult, reportName: string) => {
  const projects = await generateProjectSummary(options, range, "Project Summary");
  const rows = projects.rows.map((x: any) => ({
    name: x.projectName,
    budget: round2(toNumber(x.budgetAmount)),
    actual: round2(toNumber(x.actualRevenue)),
    variance: round2(toNumber(x.actualRevenue) - toNumber(x.budgetAmount)),
  }));
  return baseResult(options, range, reportName, ["name", "budget", "actual", "variance"], rows);
};

const aliasMap: Record<string, string> = {
  cash_flow_forecasting: "cash_flow_statement",
  abc_classification: "sales_by_item",
  retainer_invoice_details: "invoice_details",
  sales_order_details: "invoice_details",
  payable_summary: "vendor_balance_summary",
  payable_details: "ap_aging_details",
  purchases_by_vendor: "vendor_balance_summary",
  expense_details: "payments_made",
  expenses_by_category: "payments_made",
  expenses_by_customer: "payments_made",
  expenses_by_project: "payments_made",
  expenses_by_employee: "payments_made",
  billable_expense_details: "payments_made",
  projects_cost_summary: "project_summary",
  projects_revenue_summary: "project_summary",
  projects_performance_summary: "project_summary",
  project_details: "project_summary",
  account_transactions: "account_transactions",
  general_ledger: "account_transactions",
  trial_balance: "trial_balance",
  account_type_summary: "account_type_summary",
  budget_vs_actuals: "budget_vs_actuals",
  overseas_tax_summary: "sales_summary",
  vat_moss_report: "sales_summary",
  oss_ioss_scheme_report: "sales_summary",
  reverse_charge_summary: "sales_summary",
  sales_reverse_charge_summary: "sales_summary",
  fec_report: "account_transactions",
  realized_gain_or_loss: "account_type_summary",
  unrealized_gain_or_loss: "account_type_summary",
};

export const runSystemReport = async (options: ReportRunOptions): Promise<ReportRunResult> => {
  const report = getSystemReportByKey(options.reportKey);
  const reportName = report?.name || options.reportKey;
  const range = getDateRange(options);

  switch (options.reportKey) {
    case "profit_and_loss":
      return generateProfitAndLoss(options, range, reportName);
    case "cash_flow_statement":
      return generateCashFlow(options, range, reportName);
    case "balance_sheet":
      return generateBalanceSheet(options, range, reportName);
    case "business_performance_ratio":
      return generateBusinessRatios(options, range, reportName);
    case "movement_of_equity":
      return generateMovementOfEquity(options, range, reportName);
    case "sales_by_customer":
      return generateSalesByCustomer(options, range, reportName);
    case "sales_by_item":
      return generateSalesByItem(options, range, reportName);
    case "purchases_by_item":
      return generatePurchasesByItem(options, range, reportName);
    case "sales_by_sales_person":
      return generateSalesByCustomer(options, range, reportName);
    case "sales_summary":
      return generateSalesSummary(options, range, reportName);
    case "inventory_summary":
      return generateInventorySummary(options, range, reportName);
    case "inventory_valuation_summary":
      return generateInventoryValuation(options, range, reportName);
    case "fifo_cost_lot_tracking":
      return generateFifoCostLotTracking(options, range, reportName);
    case "inventory_adjustment_summary":
      return generateInventoryAdjustments(options, range, reportName, true);
    case "inventory_adjustment_details":
      return generateInventoryAdjustments(options, range, reportName, false);
    case "customer_balance_summary":
      return generateCustomerBalanceSummary(options, range, reportName);
    case "aging_summary":
      return generateAgingSummary(options, range, reportName);
    case "aging_details":
      return generateAgingDetails(options, range, reportName);
    case "invoice_details":
      return generateInvoiceDetails(options, range, reportName);
    case "quote_details":
      return generateQuoteDetails(options, range, reportName);
    case "payments_received":
      return generatePaymentsReceived(options, range, reportName);
    case "time_to_get_paid":
      return generateTimeToGetPaid(options, range, reportName);
    case "credit_note_details":
      return generateCreditNoteDetails(options, range, reportName);
    case "refund_history":
      return generateRefundHistory(options, range, reportName);
    case "vendor_balance_summary":
      return generateVendorBalanceSummary(options, range, reportName);
    case "ap_aging_summary":
      return generateAPAgingSummary(options, range, reportName);
    case "ap_aging_details":
      return generateAPAgingDetails(options, range, reportName);
    case "vendor_credit_details":
      return generateVendorCreditDetails(options, range, reportName);
    case "payments_made":
      return generatePaymentsMade(options, range, reportName);
    case "purchase_order_details":
      return generatePurchaseOrderDetails(options, range, reportName);
    case "purchase_orders_by_vendor":
      return generatePurchaseOrdersByVendor(options, range, reportName);
    case "timesheet_details":
      return generateTimesheetDetails(options, range, reportName);
    case "timesheet_profitability_summary":
      return generateTimesheetProfitability(options, range, reportName);
    case "project_summary":
      return generateProjectSummary(options, range, reportName);
    case "activity_logs":
      return generateActivityLogs(options, range, reportName);
    case "account_transactions":
      return generateAccountTransactions(options, range, reportName);
    case "general_ledger":
      return generateAccountTransactions(options, range, reportName);
    case "trial_balance":
      return generateTrialBalance(options, range, reportName);
    case "account_type_summary":
      return generateAccountTypeSummary(options, range, reportName);
    case "budget_vs_actuals":
      return generateBudgetVsActuals(options, range, reportName);
    default: {
      const alias = aliasMap[options.reportKey];
      if (alias) {
        return runSystemReport({ ...options, reportKey: alias });
      }
      return fallbackResult(options, range, reportName);
    }
  }
};

export default { runSystemReport };
