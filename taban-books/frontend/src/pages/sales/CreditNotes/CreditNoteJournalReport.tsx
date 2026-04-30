import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { getCreditNoteById, getCreditNotes } from "../salesModel";

type JournalRow = {
  rowKey: string;
  creditNoteId: string;
  creditNoteNumber: string;
  customerName: string;
  date: string;
  account: string;
  location: string;
  debit: number;
  credit: number;
};

const toNumber = (value: any) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const formatDate = (value: any) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric"
  }).format(date);
};

const formatCurrency = (value: number, currency = "USD") =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(value || 0));

const getNoteCustomerName = (note: any) =>
  String(
    note?.customerName ||
    note?.customer?.displayName ||
    note?.customer?.companyName ||
    note?.customer?.name ||
    note?.customer ||
    "-"
  ).trim();

const getNoteNumber = (note: any) =>
  String(note?.creditNoteNumber || note?.number || note?.documentNumber || note?.id || "").trim() || "-";

const deriveJournalRows = (note: any): JournalRow[] => {
  const journalEntry = note?.journalEntry || null;
  const journalSource = Array.isArray(journalEntry?.lines)
    ? journalEntry.lines
    : Array.isArray(journalEntry?.entries)
      ? journalEntry.entries
      : [];

  const noteNumber = getNoteNumber(note);
  const date = String(note?.creditNoteDate || note?.date || note?.createdAt || "").trim();
  const customerName = getNoteCustomerName(note);
  const location = String(note?.warehouseLocation || note?.locationName || note?.location || "Head Office").trim();

  const derivedRows: JournalRow[] = [];
  const items = Array.isArray(note?.items) ? note.items : [];

  if (items.length > 0) {
    const groupedAccounts = new Map<string, number>();
    let totalTax = 0;

    for (const item of items) {
      const quantity = toNumber(item?.quantity);
      const unitPrice = toNumber(item?.unitPrice ?? item?.rate);
      const lineAmount = toNumber(item?.total ?? item?.amount ?? quantity * unitPrice);
      const accountLabel = String(item?.account || "Sales Returns").trim() || "Sales Returns";

      if (lineAmount > 0) {
        groupedAccounts.set(accountLabel, (groupedAccounts.get(accountLabel) || 0) + lineAmount);
      }
      totalTax += toNumber(item?.taxAmount);
    }

    groupedAccounts.forEach((debit, account) => {
      derivedRows.push({
        rowKey: `${noteNumber}-${account}`,
        creditNoteId: String(note?.id || note?._id || "").trim(),
        creditNoteNumber: noteNumber,
        customerName,
        date,
        account,
        location,
        debit: Number(debit.toFixed(2)),
        credit: 0
      });
    });

    if (totalTax > 0) {
      derivedRows.push({
        rowKey: `${noteNumber}-tax`,
        creditNoteId: String(note?.id || note?._id || "").trim(),
        creditNoteNumber: noteNumber,
        customerName,
        date,
        account: "Sales Tax Payable",
        location,
        debit: Number(totalTax.toFixed(2)),
        credit: 0
      });
    }

    const totalCredit = toNumber(note?.total ?? note?.amount);
    if (totalCredit > 0) {
      derivedRows.push({
        rowKey: `${noteNumber}-ar`,
        creditNoteId: String(note?.id || note?._id || "").trim(),
        creditNoteNumber: noteNumber,
        customerName,
        date,
        account: String(note?.accountsReceivable || "Accounts Receivable").trim(),
        location,
        debit: 0,
        credit: Number(totalCredit.toFixed(2))
      });
    }

    return derivedRows.filter((row) => row.debit > 0 || row.credit > 0);
  }

  return journalSource
    .map((line: any, index: number) => {
      const debit = toNumber(line?.debit ?? line?.debitAmount ?? 0);
      const credit = toNumber(line?.credit ?? line?.creditAmount ?? 0);
      return {
        rowKey: `${noteNumber}-${index}`,
        creditNoteId: String(note?.id || note?._id || "").trim(),
        creditNoteNumber: noteNumber,
        customerName,
        date,
        account: String(line?.accountName || line?.account?.name || line?.account || line?.description || "Account").trim(),
        location: String(line?.locationName || line?.location || line?.locationId || location).trim(),
        debit,
        credit
      };
    })
    .filter((row: JournalRow) => row.debit > 0 || row.credit > 0);
};

export default function CreditNoteJournalReport() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [rows, setRows] = useState<JournalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const notes = id ? [await getCreditNoteById(id)] : await getCreditNotes();
        const normalizedNotes = (Array.isArray(notes) ? notes : [notes]).filter(Boolean);
        const nextRows = normalizedNotes.flatMap((note: any) => deriveJournalRows(note));
        if (alive) {
          setRows(nextRows);
        }
      } catch (err: any) {
        if (alive) {
          setError(err?.message || "Failed to load credit note journal rows.");
          setRows([]);
        }
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      alive = false;
    };
  }, [id, refreshTick]);

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, row) => ({
          debit: acc.debit + row.debit,
          credit: acc.credit + row.credit
        }),
        { debit: 0, credit: 0 }
      ),
    [rows]
  );

  return (
    <div className="min-h-full bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <button
            type="button"
            onClick={() => setRefreshTick((value) => value + 1)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5">
            <div className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Journal
            </div>
            <div className="mt-1 text-2xl font-semibold text-slate-900">
              {id ? `Credit Note Journal` : "All Credit Note Journals"}
            </div>
            <div className="mt-2 text-sm text-slate-600">
              {id ? `Showing journal rows for credit note ${id}.` : "Showing journal rows for all credit notes."}
            </div>
          </div>

          <div className="px-6 py-4 text-sm text-slate-600">
            {loading ? "Loading journal rows..." : `${rows.length} journal rows loaded.`}
          </div>

          {error ? (
            <div className="px-6 pb-6 text-sm text-red-600">{error}</div>
          ) : null}

          <div className="overflow-x-auto">
            <table className="min-w-full border-t border-slate-100">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Credit Note#</th>
                  <th className="px-6 py-3">Customer</th>
                  <th className="px-6 py-3">Account</th>
                  <th className="px-6 py-3">Location</th>
                  <th className="px-6 py-3 text-right">Debit</th>
                  <th className="px-6 py-3 text-right">Credit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-sm">
                {rows.length > 0 ? rows.map((row) => (
                  <tr key={row.rowKey} className="hover:bg-slate-50">
                    <td className="px-6 py-3 text-slate-700">{formatDate(row.date)}</td>
                    <td className="px-6 py-3 font-medium text-slate-900">{row.creditNoteNumber}</td>
                    <td className="px-6 py-3 text-slate-700">{row.customerName}</td>
                    <td className="px-6 py-3 text-slate-700">{row.account}</td>
                    <td className="px-6 py-3 text-slate-700">{row.location}</td>
                    <td className="px-6 py-3 text-right text-slate-700">{formatCurrency(row.debit)}</td>
                    <td className="px-6 py-3 text-right text-slate-700">{formatCurrency(row.credit)}</td>
                  </tr>
                )) : (
                  !loading && (
                    <tr>
                      <td className="px-6 py-10 text-center text-slate-500" colSpan={7}>
                        No credit note journal rows found.
                      </td>
                    </tr>
                  )
                )}
              </tbody>
              <tfoot className="border-t border-slate-200 bg-slate-50 text-sm font-semibold text-slate-900">
                <tr>
                  <td className="px-6 py-3" colSpan={5}>Total</td>
                  <td className="px-6 py-3 text-right">{formatCurrency(totals.debit)}</td>
                  <td className="px-6 py-3 text-right">{formatCurrency(totals.credit)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
