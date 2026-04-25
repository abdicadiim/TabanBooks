import React from "react";
import { ChevronDown, ChevronUp, MoreHorizontal, Search } from "lucide-react";

import type { ManualJournal } from "../manualJournalTypes";
import {
  formatManualJournalCurrency,
  formatManualJournalDate,
} from "../manualJournalListUtils";

interface ManualJournalsListTableProps {
  hasBaseRecords: boolean;
  isLoading: boolean;
  journals: ManualJournal[];
  selectedJournalIds: string[];
  sortBy: string;
  sortOrder: "asc" | "desc";
  onCreateJournal: () => void;
  onOpenJournal: (journalId: string) => void;
  onOpenSearch: () => void;
  onSelectAll: () => void;
  onSelectJournal: (journalId: string) => void;
  onToggleDateSort: () => void;
}

function ManualJournalsTableSkeleton() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, index) => (
        <tr key={index} style={{ borderBottom: "1px solid #f1f5f9", height: "56px" }}>
          <td style={{ padding: "0 16px" }}>
            <div style={{ width: "16px", height: "16px", borderRadius: "4px", backgroundColor: "#e2e8f0" }} />
          </td>
          {Array.from({ length: 8 }).map((_, cellIndex) => (
            <td key={cellIndex} style={{ padding: "0 12px" }}>
              <div
                style={{
                  height: "12px",
                  width: cellIndex === 4 ? "80%" : "60%",
                  borderRadius: "999px",
                  backgroundColor: "#e2e8f0",
                }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function ManualJournalsListTable({
  hasBaseRecords,
  isLoading,
  journals,
  selectedJournalIds,
  sortBy,
  sortOrder,
  onCreateJournal,
  onOpenJournal,
  onOpenSearch,
  onSelectAll,
  onSelectJournal,
  onToggleDateSort,
}: ManualJournalsListTableProps) {
  if (!isLoading && journals.length === 0 && !hasBaseRecords) {
    return (
      <div
        style={{
          margin: "24px",
          backgroundColor: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: "22px",
          padding: "60px 24px",
          textAlign: "center",
        }}
      >
        <h2 style={{ margin: 0, fontSize: "28px", fontWeight: 700, color: "#111827" }}>
          Start making journal entries
        </h2>
        <p
          style={{
            margin: "12px auto 0",
            maxWidth: "520px",
            fontSize: "15px",
            lineHeight: 1.8,
            color: "#64748b",
          }}
        >
          Record transfers, adjustments, and accountant-led corrections from a
          cleaner list page that keeps the important actions easy to find.
        </p>
        <button
          type="button"
          onClick={onCreateJournal}
          style={{
            marginTop: "24px",
            border: "none",
            borderRadius: "12px",
            padding: "12px 18px",
            backgroundColor: "#156372",
            color: "#ffffff",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: 700,
          }}
        >
          Create New Journal
        </button>
      </div>
    );
  }

  if (!isLoading && journals.length === 0) {
    return (
      <div
        style={{
          margin: "24px",
          backgroundColor: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: "22px",
          padding: "48px 24px",
          textAlign: "center",
        }}
      >
        <h2 style={{ margin: 0, fontSize: "22px", fontWeight: 700, color: "#111827" }}>
          No journals match the current filters
        </h2>
        <p style={{ margin: "10px 0 0", fontSize: "14px", color: "#64748b" }}>
          Try another view, period, or advanced-search combination.
        </p>
      </div>
    );
  }

  const allSelected =
    journals.length > 0 && selectedJournalIds.length === journals.length;

  return (
    <div
      style={{
        margin: "24px",
        backgroundColor: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: "22px",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
          padding: "16px 18px",
          borderBottom: "1px solid #eef2f7",
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#111827" }}>
            Journal Entries
          </h2>
          <p style={{ margin: "6px 0 0", fontSize: "13px", color: "#64748b" }}>
            Review status, references, notes, and reporting method at a glance.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenSearch}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            borderRadius: "10px",
            border: "1px solid #d1d5db",
            padding: "10px 14px",
            backgroundColor: "#ffffff",
            color: "#334155",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: 600,
          }}
        >
          <Search size={16} />
          Search
        </button>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1060px" }}>
          <thead style={{ backgroundColor: "#f8fafc" }}>
            <tr>
              <th style={{ width: "44px", padding: "14px 16px", textAlign: "left" }}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onSelectAll}
                  style={{ width: "16px", height: "16px", cursor: "pointer" }}
                />
              </th>
              <th
                style={{
                  padding: "14px 12px",
                  textAlign: "left",
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "#64748b",
                  letterSpacing: "0.08em",
                }}
              >
                <button
                  type="button"
                  onClick={onToggleDateSort}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    border: "none",
                    backgroundColor: "transparent",
                    padding: 0,
                    cursor: "pointer",
                    color: sortBy === "Date" ? "#156372" : "#64748b",
                    fontSize: "11px",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                  }}
                >
                  DATE
                  <span style={{ display: "inline-flex", flexDirection: "column", gap: "1px" }}>
                    <ChevronUp size={10} color={sortBy === "Date" && sortOrder === "asc" ? "#156372" : "#cbd5e1"} />
                    <ChevronDown size={10} color={sortBy === "Date" && sortOrder === "desc" ? "#156372" : "#cbd5e1"} />
                  </span>
                </button>
              </th>
              <th style={headerCellStyle}>JOURNAL#</th>
              <th style={headerCellStyle}>REFERENCE#</th>
              <th style={headerCellStyle}>STATUS</th>
              <th style={headerCellStyle}>NOTES</th>
              <th style={{ ...headerCellStyle, textAlign: "right" }}>AMOUNT</th>
              <th style={headerCellStyle}>CREATED BY</th>
              <th style={headerCellStyle}>REPORTING METHOD</th>
              <th style={{ ...headerCellStyle, width: "44px" }} />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <ManualJournalsTableSkeleton />
            ) : (
              journals.map((journal) => {
                const journalId = String(journal.id || journal._id);
                const selected = selectedJournalIds.includes(journalId);
                return (
                  <tr
                    key={journalId}
                    style={{
                      borderBottom: "1px solid #f1f5f9",
                      backgroundColor: selected ? "#f8fafc" : "#ffffff",
                      cursor: "pointer",
                    }}
                    onClick={() => onOpenJournal(journalId)}
                  >
                    <td style={{ padding: "14px 16px" }}>
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => onSelectJournal(journalId)}
                        onClick={(event) => event.stopPropagation()}
                        style={{ width: "16px", height: "16px", cursor: "pointer" }}
                      />
                    </td>
                    <td style={bodyCellStyle}>{formatManualJournalDate(journal.date)}</td>
                    <td style={bodyCellStyle}>
                      <span style={{ color: "#2563eb", fontWeight: 600 }}>
                        {journal.journalNumber}
                      </span>
                    </td>
                    <td style={bodyCellStyle}>{journal.referenceNumber || "-"}</td>
                    <td style={bodyCellStyle}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          borderRadius: "999px",
                          padding: "5px 10px",
                          backgroundColor:
                            journal.status === "PUBLISHED"
                              ? "#dcfce7"
                              : journal.status === "DRAFT"
                                ? "#fef3c7"
                                : "#e0e7ff",
                          color:
                            journal.status === "PUBLISHED"
                              ? "#166534"
                              : journal.status === "DRAFT"
                                ? "#b45309"
                                : "#4338ca",
                          fontSize: "12px",
                          fontWeight: 700,
                        }}
                      >
                        {journal.status}
                      </span>
                    </td>
                    <td style={{ ...bodyCellStyle, maxWidth: "220px" }}>
                      <div
                        style={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          maxWidth: "220px",
                        }}
                      >
                        {journal.notes || "-"}
                      </div>
                    </td>
                    <td style={{ ...bodyCellStyle, textAlign: "right", fontWeight: 700, color: "#111827" }}>
                      {formatManualJournalCurrency(journal.amount, journal.currency)}
                    </td>
                    <td style={bodyCellStyle}>{journal.createdBy || "System"}</td>
                    <td style={bodyCellStyle}>
                      {journal.reportingMethod || "Accrual and Cash"}
                    </td>
                    <td style={{ ...bodyCellStyle, textAlign: "right" }}>
                      <MoreHorizontal size={16} color="#94a3b8" />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const headerCellStyle: React.CSSProperties = {
  padding: "14px 12px",
  textAlign: "left",
  fontSize: "11px",
  fontWeight: 700,
  color: "#64748b",
  letterSpacing: "0.08em",
};

const bodyCellStyle: React.CSSProperties = {
  padding: "16px 12px",
  fontSize: "14px",
  color: "#334155",
};
