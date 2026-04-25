import { Image as ImageIcon, Settings } from "lucide-react";

import type { Adjustment, Item, JournalLine } from "./types";
import {
  DEFAULT_ADJUSTMENT_ACCOUNT,
  calculateJournalTotals,
  formatDate,
  formatDateTime,
  getAdjustmentReference,
  getItemDisplay,
  renderSafeValue,
  toNumber,
} from "./utils";

type AdjustmentDocumentContentProps = {
  adjustment: Adjustment;
  itemRows: Item[];
  baseCurrency: string;
  showPdfView: boolean;
  journalLines: JournalLine[] | null;
  onOpenPdfTemplate: () => void;
};

type JournalSectionProps = {
  adjustment: Adjustment;
  baseCurrency: string;
  journalLines: JournalLine[] | null;
  draftMessage: string;
  allowDraftPreview?: boolean;
  titleClassName?: string;
};

function JournalTable({ journalLines }: { journalLines: JournalLine[] }) {
  const totals = calculateJournalTotals(journalLines);

  return (
    <table className="w-full border-collapse text-sm shadow-sm">
      <thead>
        <tr className="bg-gray-100 border-b-2 border-gray-300">
          <th className="p-4 text-left font-bold text-xs uppercase tracking-wide text-gray-700">
            ACCOUNT
          </th>
          <th className="p-4 text-right font-bold text-xs uppercase tracking-wide text-gray-700">
            DEBIT
          </th>
          <th className="p-4 text-right font-bold text-xs uppercase tracking-wide text-gray-700">
            CREDIT
          </th>
        </tr>
      </thead>
      <tbody>
        {journalLines.map((line, index) => {
          const debit = toNumber(line.debit);
          const credit = toNumber(line.credit);

          return (
            <tr
              key={`${line.accountName || line.account || "line"}-${index}`}
              className="border-b border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <td className="p-4 font-medium text-gray-900">{line.accountName || line.account}</td>
              <td className="p-4 text-right font-semibold text-gray-900">
                {debit > 0 ? debit.toFixed(2) : "0.00"}
              </td>
              <td className="p-4 text-right font-semibold text-gray-900">
                {credit > 0 ? credit.toFixed(2) : "0.00"}
              </td>
            </tr>
          );
        })}
        <tr className="bg-gray-100 font-bold border-t-2 border-gray-300">
          <td className="p-4 text-gray-900">TOTAL</td>
          <td className="p-4 text-right text-gray-900">{totals.debit.toFixed(2)}</td>
          <td className="p-4 text-right text-gray-900">{totals.credit.toFixed(2)}</td>
        </tr>
      </tbody>
    </table>
  );
}

function JournalSection({
  adjustment,
  baseCurrency,
  journalLines,
  draftMessage,
  allowDraftPreview = false,
  titleClassName = "text-sm font-bold text-gray-900 mb-4",
}: JournalSectionProps) {
  const isDraft = adjustment.status === "DRAFT";

  if (isDraft && !allowDraftPreview) {
    return <div className="p-6 text-center text-gray-500 text-sm">{draftMessage}</div>;
  }

  return (
    <>
      <div className="text-xs text-gray-600 mb-5 flex items-center gap-2">
        <span>Amount is displayed in your base currency</span>
        <span className="bg-green-500 text-white px-3 py-1 rounded-full text-[11px] font-semibold shadow-sm">
          {baseCurrency}
        </span>
      </div>
      <div className={titleClassName}>Inventory Adjustment By {adjustment.type}</div>
      {journalLines?.length ? (
        <JournalTable journalLines={journalLines} />
      ) : (
        <div className="p-6 text-center text-gray-500 text-sm">
          {isDraft ? draftMessage : "No journal entry found for this adjustment."}
        </div>
      )}
    </>
  );
}

export function AdjustmentDocumentContent({
  adjustment,
  itemRows,
  baseCurrency,
  showPdfView,
  journalLines,
  onOpenPdfTemplate,
}: AdjustmentDocumentContentProps) {
  return (
    <div className={`flex-1 min-h-0 overflow-y-auto ${showPdfView ? "bg-gray-50 p-4 md:p-10" : "bg-white p-6"}`}>
      <div
        data-print-content
        className={`bg-white relative mx-auto shadow-lg transition-all duration-300 ${showPdfView ? "mb-10" : "p-2 max-w-4xl"}`}
        style={
          showPdfView
            ? {
                width: "210mm",
                minHeight: "297mm",
                padding: "40px",
                boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
              }
            : undefined
        }
      >
        {showPdfView && (
          <button
            data-html2canvas-ignore
            onClick={onOpenPdfTemplate}
            className="absolute top-6 right-6 px-3 py-1.5 text-sm font-medium text-white border-none rounded-md cursor-pointer flex items-center gap-1.5 z-10 shadow-md hover:opacity-90 transition-opacity"
            style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
          >
            <Settings size={16} strokeWidth={2} />
            PDF Template
          </button>
        )}

        {adjustment.status === "ADJUSTED" && (
          <div
            className="absolute top-5 -left-10 text-white py-2 px-10 -rotate-45 origin-center text-xs font-semibold z-10 shadow-md"
            style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
          >
            Adjusted
          </div>
        )}

        {showPdfView ? (
          <>
            <h1 className="text-[28px] font-bold text-black m-0 mb-8 text-center">INVENTORY ADJUSTMENT</h1>

            <div className="mb-8">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Date</div>
                  <div className="text-sm text-gray-900 font-medium">{formatDate(adjustment.date)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Ref#</div>
                  <div className="text-sm text-gray-900 font-medium">{getAdjustmentReference(adjustment)}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Reason</div>
                  <div className="text-sm text-gray-900 font-medium">{renderSafeValue(adjustment.reason)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Account</div>
                  <div className="text-sm text-gray-900 font-medium">
                    {renderSafeValue(adjustment.account, DEFAULT_ADJUSTMENT_ACCOUNT)}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Adjustment Type</div>
                  <div className="text-sm text-gray-900 font-medium">{adjustment.type}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Created By</div>
                  <div className="text-sm text-gray-900 font-medium">
                    {renderSafeValue(adjustment.createdBy, "System")}
                  </div>
                </div>
              </div>
            </div>

            {itemRows.length > 0 && (
              <div className="mb-8">
                <table className="w-full border-collapse text-sm shadow-sm">
                  <thead>
                    <tr className="bg-gray-800 text-white">
                      <th className="p-4 text-left font-semibold text-xs uppercase tracking-wide">#</th>
                      <th className="p-4 text-left font-semibold text-xs uppercase tracking-wide">
                        Item & Description
                      </th>
                      <th className="p-4 text-right font-semibold text-xs uppercase tracking-wide">
                        Quantity Adjusted
                      </th>
                      <th className="p-4 text-right font-semibold text-xs uppercase tracking-wide">Cost Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemRows.map((item, index) => {
                      const details = getItemDisplay(item);

                      return (
                        <tr
                          key={`${details.itemName}-${index}`}
                          className="border-b border-gray-200 hover:bg-gray-50 transition-colors"
                        >
                          <td className="p-4 text-gray-600 font-medium">{index + 1}</td>
                          <td className="p-4">
                            <div>
                              <div className="text-sm font-semibold text-gray-900 mb-1">{details.itemName}</div>
                              {details.itemSku && <div className="text-xs text-gray-500 mt-0.5">SKU: {details.itemSku}</div>}
                            </div>
                          </td>
                          <td className="p-4 text-right text-gray-700 font-medium">
                            {Math.abs(details.quantityAdjusted).toFixed(2)} {details.itemUnit}
                          </td>
                          <td className="p-4 text-right text-gray-900 font-semibold">
                            {baseCurrency}
                            {details.rate.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="mb-8">
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                  <span className="text-sm text-gray-500 min-w-[150px]">Date</span>
                  <span className="text-sm text-gray-900 font-medium">{formatDate(adjustment.date)}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                  <span className="text-sm text-gray-500 min-w-[150px]">Reason</span>
                  <span className="text-sm text-gray-900 font-medium">{renderSafeValue(adjustment.reason)}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                  <span className="text-sm text-gray-500 min-w-[150px]">Status</span>
                  <span className="text-xs font-medium text-gray-700 bg-gray-100 px-3 py-1 rounded">
                    {adjustment.status}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                  <span className="text-sm text-gray-500 min-w-[150px]">Account</span>
                  <span className="text-sm text-gray-900 font-medium">
                    {renderSafeValue(adjustment.account, DEFAULT_ADJUSTMENT_ACCOUNT)}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                  <span className="text-sm text-gray-500 min-w-[150px]">Adjustment Type</span>
                  <span className="text-sm text-gray-900 font-medium">{adjustment.type}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                  <span className="text-sm text-gray-500 min-w-[150px]">Reference Number</span>
                  <span className="text-sm text-gray-900 font-medium">{getAdjustmentReference(adjustment)}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                  <span className="text-sm text-gray-500 min-w-[150px]">Adjusted By</span>
                  <span className="text-sm text-gray-900 font-medium">
                    {renderSafeValue(adjustment.createdBy, "System")}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-3">
                  <span className="text-sm text-gray-500 min-w-[150px]">Created Time</span>
                  <span className="text-sm text-gray-900 font-medium">
                    {formatDateTime(adjustment.createdTime || adjustment.createdAt || adjustment.date)}
                  </span>
                </div>
              </div>
            </div>

            {itemRows.length > 0 && (
              <div className="mb-8">
                <h3 className="text-base font-semibold text-gray-900 mb-4">Adjusted Items</h3>
                <table className="w-full border-collapse text-sm border border-gray-200 rounded-md overflow-hidden">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="p-3 text-left font-semibold text-xs uppercase text-gray-700">Item Details</th>
                      <th className="p-3 text-right font-semibold text-xs uppercase text-gray-700">
                        Quantity Adjusted
                      </th>
                      <th className="p-3 text-right font-semibold text-xs uppercase text-gray-700">Cost Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemRows.map((item, index) => {
                      const details = getItemDisplay(item);

                      return (
                        <tr
                          key={`${details.itemName}-${index}`}
                          className={index < itemRows.length - 1 ? "border-b border-gray-200" : ""}
                        >
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-gray-100 border border-gray-200 rounded flex items-center justify-center text-gray-400 shrink-0">
                                <ImageIcon size={16} />
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900 mb-0.5">{details.itemName}</div>
                                <div className="text-xs text-gray-500">SKU: {details.itemSku || "no"}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-right">
                            {Math.abs(details.quantityAdjusted).toFixed(0)} {details.itemUnit}
                          </td>
                          <td className="p-3 text-right">${details.rate.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-8">
              <div className="flex border-b border-gray-200 mb-4">
                <div className="px-4 py-2 text-sm font-medium border-b-2 cursor-pointer" style={{ color: "#156372", borderColor: "#156372" }}>
                  Journal
                </div>
              </div>
              <div className="py-4">
                <JournalSection
                  adjustment={adjustment}
                  baseCurrency={baseCurrency}
                  journalLines={journalLines}
                  draftMessage="Journal entries will not be available for in the Draft state."
                />
              </div>
            </div>
          </>
        )}
      </div>

      {showPdfView && (
        <div className="mx-auto mb-20 px-4" style={{ width: "210mm" }}>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-bold mb-4 pb-2 border-b-2" style={{ color: "#156372", borderColor: "#156372" }}>
              Journal
            </h3>
            <JournalSection
              adjustment={adjustment}
              baseCurrency={baseCurrency}
              journalLines={journalLines}
              draftMessage="Journal entries will be created when the adjustment is converted to Adjusted status."
              allowDraftPreview
            />
          </div>
        </div>
      )}
    </div>
  );
}
