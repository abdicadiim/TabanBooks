import React from "react";
import { AlertTriangle, ChevronRight } from "lucide-react";

type FinancialDocumentKind = "INC" | "CDN";

type FinancialDocumentRow = {
  account: string;
  location: string;
  debit: number;
  credit: number;
};

type FinancialDocumentDisplayProps = {
  document: any;
  baseCurrency?: string;
  journalEntry?: any;
  associatedInvoice?: any;
};

const toNumber = (value: any, fallback = 0) => {
  const numeric = typeof value === "string" ? Number(String(value).replace(/,/g, "").replace(/[^0-9.\-]/g, "")) : Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const normalizeKey = (value: any) =>
  String(value || "")
    .toLowerCase()
    .replace(/-/g, "_")
    .replace(/\s+/g, "_")
    .trim();

const formatDate = (value: any) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-GB");
};

const formatCurrency = (amount: number, currency?: string) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: String(currency || "KES").trim() || "KES",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNumber(amount, 0));

const getDocumentKind = (document: any): FinancialDocumentKind => {
  const raw = normalizeKey(
    document?.type ||
      document?.documentType ||
      document?.invoiceType ||
      document?.sourceType ||
      document?.kind ||
      ""
  );
  const number = String(document?.invoiceNumber || document?.debitNoteNumber || document?.creditNoteNumber || "").toUpperCase();

  if (raw.includes("cdn") || raw.includes("debit") || raw.includes("credit")) return "CDN";
  if (raw.includes("inc") || raw.includes("invoice")) return "INC";
  if (number.startsWith("CDN-")) return "CDN";
  return "INC";
};

const getDocumentStatus = (document: any) => {
  const raw = normalizeKey(document?.status || "");
  const total = toNumber(document?.total ?? document?.amount, 0);
  const paid = toNumber(document?.amountPaid ?? document?.paidAmount, 0);
  const balance =
    document?.balance !== undefined
      ? toNumber(document.balance, 0)
      : document?.balanceDue !== undefined
        ? toNumber(document.balanceDue, 0)
        : Math.max(0, total - paid);
  const dueDate = document?.dueDate ? new Date(document.dueDate) : null;
  const overdue = Boolean(dueDate && !Number.isNaN(dueDate.getTime()) && dueDate.getTime() < Date.now() && balance > 0);

  if (raw === "paid" || balance <= 0) return "Paid";
  if (raw.includes("partial") || (paid > 0 && balance > 0)) return "Partially Paid";
  if (raw === "draft") return "Draft";
  if (overdue || raw === "overdue") return "Overdue";
  return "Unpaid";
};

const StatusBadge: React.FC<{ status?: string }> = ({ status }) => {
  const normalized = normalizeKey(status);
  if (normalized === "overdue") {
    return <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-600">Overdue</span>;
  }
  if (normalized === "unpaid") {
    return <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-600">Unpaid</span>;
  }
  if (normalized === "paid") {
    return <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-600">Paid</span>;
  }
  return <span className="inline-flex items-center rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600">{status || "Draft"}</span>;
};

const DocumentCard: React.FC<{
  title: string;
  status?: string;
  children: React.ReactNode;
}> = ({ title, status, children }) => (
  <div className="rounded border border-[#d8dee9] bg-white shadow-sm overflow-hidden">
    <div className="flex items-center justify-between gap-3 border-b border-[#e7ebf3] px-5 py-4">
      <div className="text-[18px] font-semibold text-slate-900">{title}</div>
      {status ? <StatusBadge status={status} /> : null}
    </div>
    <div className="px-5 py-4">{children}</div>
  </div>
);

const InvoiceTable: React.FC<{
  rows: FinancialDocumentRow[];
  currency?: string;
}> = ({ rows, currency }) => {
  const totals = rows.reduce(
    (acc, row) => ({
      debit: acc.debit + toNumber(row.debit),
      credit: acc.credit + toNumber(row.credit),
    }),
    { debit: 0, credit: 0 }
  );

  return (
    <div className="rounded border border-[#d8dee9] bg-white">
      <div className="px-5 py-4">
        <div className="mb-3 text-[16px] font-semibold text-slate-900">Invoice</div>
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-[#e7ebf3] bg-[#f8fafc] text-[13px] text-[#64748b]">
              <th className="px-2 py-2 text-left font-medium">ACCOUNT</th>
              <th className="px-2 py-2 text-left font-medium">LOCATION</th>
              <th className="px-2 py-2 text-right font-medium">DEBIT</th>
              <th className="px-2 py-2 text-right font-medium">CREDIT</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row.account}-${index}`} className="border-b border-[#edf1f7] last:border-b-0">
                <td className="px-2 py-2 text-[13px] text-blue-600">{row.account}</td>
                <td className="px-2 py-2 text-[13px] text-slate-900">{row.location}</td>
                <td className="px-2 py-2 text-[13px] text-slate-900 text-right">{formatCurrency(row.debit, currency)}</td>
                <td className="px-2 py-2 text-[13px] text-slate-900 text-right">{formatCurrency(row.credit, currency)}</td>
              </tr>
            ))}
            <tr className="border-t border-[#dfe6f0] font-semibold">
              <td className="px-2 py-2 text-[13px]" />
              <td className="px-2 py-2 text-[13px]" />
              <td className="px-2 py-2 text-[13px] text-right text-slate-900">{formatCurrency(totals.debit, currency)}</td>
              <td className="px-2 py-2 text-[13px] text-right text-slate-900">{formatCurrency(totals.credit, currency)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

const JournalTable: React.FC<{
  title: string;
  rows: FinancialDocumentRow[];
  currency?: string;
}> = ({ title, rows, currency }) => {
  const totals = rows.reduce(
    (acc, row) => ({
      debit: acc.debit + toNumber(row.debit),
      credit: acc.credit + toNumber(row.credit),
    }),
    { debit: 0, credit: 0 }
  );

  return (
    <div className="rounded border border-[#d8dee9] bg-white shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-[#e7ebf3]">
        <div className="text-[18px] font-semibold text-slate-900">{title}</div>
      </div>
      <div className="px-5 py-4">
        <div className="text-[12px] text-slate-500 mb-3">
          Amount is displayed in your base currency{" "}
          <span className="inline-flex items-center rounded bg-lime-700 px-1.5 py-0.5 text-[11px] font-semibold text-white">
            {String(currency || "KES").trim() || "KES"}
          </span>
        </div>
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-[#e7ebf3] bg-[#f8fafc] text-[13px] text-[#64748b]">
              <th className="px-2 py-2 text-left font-medium">ACCOUNT</th>
              <th className="px-2 py-2 text-left font-medium">LOCATION</th>
              <th className="px-2 py-2 text-right font-medium">DEBIT</th>
              <th className="px-2 py-2 text-right font-medium">CREDIT</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row.account}-${index}`} className="border-b border-[#edf1f7] last:border-b-0">
                <td className="px-2 py-2 text-[13px] text-blue-600">{row.account}</td>
                <td className="px-2 py-2 text-[13px] text-slate-900">{row.location}</td>
                <td className="px-2 py-2 text-[13px] text-slate-900 text-right">{formatCurrency(row.debit, currency)}</td>
                <td className="px-2 py-2 text-[13px] text-slate-900 text-right">{formatCurrency(row.credit, currency)}</td>
              </tr>
            ))}
            <tr className="border-t border-[#dfe6f0] font-semibold">
              <td className="px-2 py-2 text-[13px]" />
              <td className="px-2 py-2 text-[13px]" />
              <td className="px-2 py-2 text-[13px] text-right text-slate-900">{formatCurrency(totals.debit, currency)}</td>
              <td className="px-2 py-2 text-[13px] text-right text-slate-900">{formatCurrency(totals.credit, currency)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

const buildInvoiceJournalRows = (document: any, journalEntry: any, currency?: string): FinancialDocumentRow[] => {
  const location = String(document?.location || document?.selectedLocation || "Head Office").trim() || "Head Office";
  const lineItems = Array.isArray(document?.items)
    ? document.items
    : Array.isArray(document?.lineItems)
      ? document.lineItems
      : Array.isArray(document?.invoiceItems)
        ? document.invoiceItems
        : [];

  const normalizedJournalRows = Array.isArray(journalEntry?.lines)
    ? journalEntry.lines
    : Array.isArray(journalEntry?.entries)
      ? journalEntry.entries
      : [];

  const sourceItems = [...lineItems];
  const estimatedCOGS = sourceItems.reduce((sum: number, item: any) => {
    const qty = toNumber(item?.quantity ?? item?.qty);
    const nestedItem = item?.item && typeof item.item === "object" ? item.item : null;
    const nestedProduct = item?.product && typeof item.product === "object" ? item.product : null;
    const costPerUnit =
      toNumber(item?.costPrice) ||
      toNumber(item?.unitCost) ||
      toNumber(item?.purchasePrice) ||
      toNumber(item?.inventoryCost) ||
      toNumber(item?.averageCost) ||
      toNumber(item?.avgCost) ||
      toNumber(item?.cost) ||
      toNumber(item?.catalogCost) ||
      toNumber(item?.costPerUnit) ||
      toNumber(nestedItem?.costPrice) ||
      toNumber(nestedItem?.unitCost) ||
      toNumber(nestedItem?.purchasePrice) ||
      toNumber(nestedItem?.inventoryCost) ||
      toNumber(nestedItem?.averageCost) ||
      toNumber(nestedItem?.avgCost) ||
      toNumber(nestedItem?.cost) ||
      toNumber(nestedItem?.catalogCost) ||
      toNumber(nestedItem?.costPerUnit) ||
      toNumber(nestedProduct?.costPrice) ||
      toNumber(nestedProduct?.unitCost) ||
      toNumber(nestedProduct?.purchasePrice) ||
      toNumber(nestedProduct?.inventoryCost) ||
      toNumber(nestedProduct?.averageCost) ||
      toNumber(nestedProduct?.avgCost) ||
      toNumber(nestedProduct?.cost) ||
      toNumber(nestedProduct?.catalogCost) ||
      toNumber(nestedProduct?.costPerUnit);
    const directCost =
      toNumber(item?.costAmount) ||
      toNumber(item?.cogs) ||
      toNumber(item?.cogsAmount) ||
      toNumber(item?.totalCost) ||
      toNumber(item?.inventoryValue) ||
      toNumber(nestedItem?.costAmount) ||
      toNumber(nestedItem?.cogs) ||
      toNumber(nestedItem?.cogsAmount) ||
      toNumber(nestedItem?.totalCost) ||
      toNumber(nestedItem?.inventoryValue) ||
      toNumber(nestedProduct?.costAmount) ||
      toNumber(nestedProduct?.cogs) ||
      toNumber(nestedProduct?.cogsAmount) ||
      toNumber(nestedProduct?.totalCost) ||
      toNumber(nestedProduct?.inventoryValue);
    const lineCost = costPerUnit > 0 ? qty * costPerUnit : directCost;
    return sum + (lineCost > 0 ? lineCost : 0);
  }, 0);

  if (normalizedJournalRows.length > 0) {
    const rows = normalizedJournalRows
      .map((row: any) => {
        const account = String(row?.accountName || row?.account || row?.name || "Account").trim();
        const rowLocation = String(row?.locationName || row?.location || location).trim() || location;
        return {
          account,
          location: rowLocation,
          debit: toNumber(row?.debit),
          credit: toNumber(row?.credit),
        };
      })
      .filter((row) => row.debit > 0 || row.credit > 0);

    const hasInventoryRows = rows.some((row) => {
      const accountName = String(row?.account || "").toLowerCase();
      return accountName.includes("cost of goods sold") || accountName.includes("inventory asset");
    });
    if (!hasInventoryRows && estimatedCOGS > 0) {
      rows.push(
        { account: "Inventory Asset", location, debit: 0, credit: estimatedCOGS },
        { account: "Cost of Goods Sold", location, debit: estimatedCOGS, credit: 0 },
      );
    }
    return rows;
  }

  const subtotal = lineItems.reduce((sum: number, item: any) => {
    const qty = toNumber(item?.quantity ?? item?.qty);
    const rate = toNumber(item?.unitPrice ?? item?.rate);
    const amount = toNumber(item?.total ?? item?.amount);
    return sum + (amount > 0 ? amount : qty * rate);
  }, 0);

  const total = toNumber(document?.total ?? document?.amount ?? subtotal);
  return [
    { account: "Sales", location, debit: 0, credit: subtotal },
    { account: "Accounts Receivable", location, debit: total, credit: 0 },
    { account: "Inventory Asset", location, debit: 0, credit: estimatedCOGS },
    { account: "Cost of Goods Sold", location, debit: estimatedCOGS, credit: 0 },
  ];
};

const buildCreditDebitJournalRows = (document: any, journalEntry: any, associatedInvoice?: any): FinancialDocumentRow[] => {
  const location = String(document?.location || document?.selectedLocation || "Head Office").trim() || "Head Office";
  const amount = toNumber(document?.total ?? document?.amount);
  const lineItems = Array.isArray(document?.items)
    ? document.items
    : Array.isArray(document?.lineItems)
      ? document.lineItems
      : Array.isArray(document?.invoiceItems)
        ? document.invoiceItems
        : [];

  const normalizedJournalRows = Array.isArray(journalEntry?.lines)
    ? journalEntry.lines
    : Array.isArray(journalEntry?.entries)
      ? journalEntry.entries
      : [];

  const sourceItems = [...lineItems];
  const associatedItems = Array.isArray(associatedInvoice?.items)
    ? associatedInvoice.items
    : Array.isArray(document?.associatedInvoice?.items)
      ? document.associatedInvoice.items
      : Array.isArray(document?.invoice?.items)
        ? document.invoice.items
        : [];
  if (associatedItems.length > 0 && sourceItems.length === 0) {
    sourceItems.push(...associatedItems);
  }

  const fallbackAmount = amount > 0 ? amount : sourceItems.reduce((sum: number, item: any) => sum + toNumber(item?.amount ?? item?.total), 0);
  const estimatedCOGS = sourceItems.reduce((sum: number, item: any) => {
    const qty = toNumber(item?.quantity ?? item?.qty);
    const nestedItem = item?.item && typeof item.item === "object" ? item.item : null;
    const nestedProduct = item?.product && typeof item.product === "object" ? item.product : null;
    const costPerUnit =
      toNumber(item?.costPrice) ||
      toNumber(item?.unitCost) ||
      toNumber(item?.purchasePrice) ||
      toNumber(item?.inventoryCost) ||
      toNumber(item?.averageCost) ||
      toNumber(item?.avgCost) ||
      toNumber(item?.cost) ||
      toNumber(item?.catalogCost) ||
      toNumber(item?.costPerUnit) ||
      toNumber(nestedItem?.costPrice) ||
      toNumber(nestedItem?.unitCost) ||
      toNumber(nestedItem?.purchasePrice) ||
      toNumber(nestedItem?.inventoryCost) ||
      toNumber(nestedItem?.averageCost) ||
      toNumber(nestedItem?.avgCost) ||
      toNumber(nestedItem?.cost) ||
      toNumber(nestedItem?.catalogCost) ||
      toNumber(nestedItem?.costPerUnit) ||
      toNumber(nestedProduct?.costPrice) ||
      toNumber(nestedProduct?.unitCost) ||
      toNumber(nestedProduct?.purchasePrice) ||
      toNumber(nestedProduct?.inventoryCost) ||
      toNumber(nestedProduct?.averageCost) ||
      toNumber(nestedProduct?.avgCost) ||
      toNumber(nestedProduct?.cost) ||
      toNumber(nestedProduct?.catalogCost) ||
      toNumber(nestedProduct?.costPerUnit);
    const directCost =
      toNumber(item?.costAmount) ||
      toNumber(item?.cogs) ||
      toNumber(item?.cogsAmount) ||
      toNumber(item?.totalCost) ||
      toNumber(item?.inventoryValue) ||
      toNumber(nestedItem?.costAmount) ||
      toNumber(nestedItem?.cogs) ||
      toNumber(nestedItem?.cogsAmount) ||
      toNumber(nestedItem?.totalCost) ||
      toNumber(nestedItem?.inventoryValue) ||
      toNumber(nestedProduct?.costAmount) ||
      toNumber(nestedProduct?.cogs) ||
      toNumber(nestedProduct?.cogsAmount) ||
      toNumber(nestedProduct?.totalCost) ||
      toNumber(nestedProduct?.inventoryValue);
    const lineCost = costPerUnit > 0 ? qty * costPerUnit : directCost;
    return sum + (lineCost > 0 ? lineCost : 0);
  }, 0);

  if (normalizedJournalRows.length > 0) {
    const rows = normalizedJournalRows
      .map((row: any) => {
        const account = String(row?.accountName || row?.account || row?.name || "Account").trim();
        const rowLocation = String(row?.locationName || row?.location || location).trim() || location;
        return {
          account,
          location: rowLocation,
          debit: toNumber(row?.debit),
          credit: toNumber(row?.credit),
        };
      })
      .filter((row) => row.debit > 0 || row.credit > 0);

    const hasCostRows = rows.some((row) => {
      const accountName = String(row?.account || "").toLowerCase();
      return accountName.includes("cost of goods sold") || accountName.includes("inventory asset");
    });

    if (!hasCostRows && estimatedCOGS > 0) {
      rows.push(
        { account: "Cost of Goods Sold", location, debit: estimatedCOGS, credit: 0 },
        { account: "Inventory Asset", location, debit: 0, credit: estimatedCOGS }
      );
    }

    return rows;
  }
  return [
    { account: "Accounts Receivable", location, debit: fallbackAmount, credit: 0 },
    { account: "Sales", location, debit: 0, credit: fallbackAmount },
    ...(estimatedCOGS > 0
      ? [
          { account: "Cost of Goods Sold", location, debit: estimatedCOGS, credit: 0 },
          { account: "Inventory Asset", location, debit: 0, credit: estimatedCOGS },
        ]
      : []),
  ];
};

const FinancialDocumentDisplay: React.FC<FinancialDocumentDisplayProps> = ({
  document,
  baseCurrency,
  journalEntry,
  associatedInvoice,
}) => {
  const kind = getDocumentKind(document);
  const status = getDocumentStatus(document);
  const currency = String(document?.currency || baseCurrency || "KES").trim() || "KES";
  const referenceInvoice = associatedInvoice || document?.associatedInvoice || document?.invoice || null;

  if (kind === "CDN") {
    const rows = buildCreditDebitJournalRows(document, journalEntry, associatedInvoice);

    return (
      <div className="space-y-4">
        <DocumentCard title="Invoice Reference" status={status}>
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <div className="text-[12px] text-slate-500">Date</div>
              <div className="text-[14px] text-slate-900">{formatDate(referenceInvoice?.invoiceDate || referenceInvoice?.date || document?.date)}</div>
            </div>
            <div>
              <div className="text-[12px] text-slate-500">Invoice Number</div>
              <div className="text-[14px] text-slate-900">{String(referenceInvoice?.invoiceNumber || document?.associatedInvoiceNumber || document?.invoiceNumber || "-")}</div>
            </div>
            <div>
              <div className="text-[12px] text-slate-500">Invoice Amount</div>
              <div className="text-[14px] font-semibold text-slate-900">{formatCurrency(toNumber(referenceInvoice?.total ?? referenceInvoice?.amount ?? document?.associatedInvoiceAmount ?? document?.total), currency)}</div>
            </div>
          </div>
        </DocumentCard>

        <JournalTable title="Debit Note" rows={rows} currency={currency} />
      </div>
    );
  }

  const rows = buildInvoiceJournalRows(document, journalEntry, currency);

  return (
    <div className="space-y-4">
      <DocumentCard title="Invoice" status={status}>
        <div className="flex items-center gap-2 text-[12px] text-slate-500">
          <span>Amount is displayed in your base currency</span>
          <span className="inline-flex items-center rounded bg-lime-700 px-1.5 py-0.5 text-[11px] font-semibold text-white">{currency}</span>
        </div>
      </DocumentCard>
      <InvoiceTable rows={rows} currency={currency} />
    </div>
  );
};

export {
  DocumentCard,
  InvoiceTable,
  JournalTable,
  StatusBadge,
  FinancialDocumentDisplay,
  getDocumentKind as getFinancialDocumentKind,
};

export default FinancialDocumentDisplay;
