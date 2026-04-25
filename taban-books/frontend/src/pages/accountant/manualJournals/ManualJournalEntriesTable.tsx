import React from "react";

import type {
  ManualJournalContact,
  ManualJournalEntry,
  ManualJournalGroupedAccount,
} from "../manualJournalTypes";
import { MANUAL_JOURNAL_ENTRY_TYPE_OPTIONS } from "./config";
import type { ManualJournalTotals } from "./types";

interface ManualJournalEntriesTableProps {
  contacts: ManualJournalContact[];
  entries: ManualJournalEntry[];
  groupedAccounts: ManualJournalGroupedAccount[];
  isBusy: boolean;
  onAddRow: () => void;
  onOpenNewTaxModal: (entryId?: number) => void;
  onRemoveRow: (entryId: number) => void;
  onSelectAccount: (entryId: number, accountId: string) => void;
  onUpdateEntry: (
    entryId: number,
    field: keyof ManualJournalEntry,
    value: string,
  ) => void;
  taxOptions: string[];
  totals: ManualJournalTotals;
}

const cellInputStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid #d1d5db",
  borderRadius: "10px",
  padding: "10px 12px",
  fontSize: "13px",
  color: "#111827",
  backgroundColor: "#ffffff",
};

export function ManualJournalEntriesTable({
  contacts,
  entries,
  groupedAccounts,
  isBusy,
  onAddRow,
  onOpenNewTaxModal,
  onRemoveRow,
  onSelectAccount,
  onUpdateEntry,
  taxOptions,
  totals,
}: ManualJournalEntriesTableProps) {
  return (
    <section
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: "20px",
        backgroundColor: "#ffffff",
        boxShadow: "0 12px 30px rgba(15, 23, 42, 0.04)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          padding: "20px 24px",
          borderBottom: "1px solid #e5e7eb",
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: "20px",
              fontWeight: 700,
              color: "#111827",
            }}
          >
            Journal Lines
          </h2>
          <p
            style={{
              margin: "6px 0 0",
              fontSize: "14px",
              color: "#6b7280",
              lineHeight: 1.6,
            }}
          >
            Use simple account, contact, and tax selectors instead of the old
            custom dropdown maze.
          </p>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
          <button
            type="button"
            onClick={() => onOpenNewTaxModal()}
            style={{
              border: "1px solid #d1d5db",
              borderRadius: "12px",
              backgroundColor: "#ffffff",
              color: "#374151",
              cursor: "pointer",
              padding: "10px 14px",
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            New Tax
          </button>
          <button
            type="button"
            onClick={onAddRow}
            style={{
              border: "none",
              borderRadius: "12px",
              backgroundColor: "#0f766e",
              color: "#ffffff",
              cursor: "pointer",
              padding: "10px 14px",
              fontSize: "14px",
              fontWeight: 700,
            }}
          >
            Add Line
          </button>
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            minWidth: "1350px",
            borderCollapse: "collapse",
          }}
        >
          <thead style={{ backgroundColor: "#f8fafc" }}>
            <tr>
              {[
                "Account",
                "Description",
                "Contact",
                "Type",
                "Tax",
                "Project",
                "Reporting Tags",
                "Debit",
                "Credit",
                "",
              ].map((heading) => (
                <th
                  key={heading || "actions"}
                  style={{
                    padding: "14px 12px",
                    borderBottom: "1px solid #e5e7eb",
                    textAlign:
                      heading === "Debit" || heading === "Credit"
                        ? "right"
                        : "left",
                    fontSize: "12px",
                    fontWeight: 700,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    color: "#6b7280",
                  }}
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {entries.map((entry) => {
              const hasSelectedAccount = groupedAccounts.some((group) =>
                group.items.some(
                  (item) =>
                    String(item.id || "") === String(entry.accountId || ""),
                ),
              );

              const hasSelectedContact = contacts.some(
                (contact) => contact.name === entry.contact,
              );

              const hasSelectedTax = taxOptions.some((tax) => tax === entry.tax);

              return (
                <tr key={entry.id}>
                  <td style={{ padding: "12px", borderBottom: "1px solid #f3f4f6" }}>
                    <select
                      value={entry.accountId}
                      onChange={(event) =>
                        onSelectAccount(entry.id, event.target.value)
                      }
                      style={cellInputStyle}
                    >
                      <option value="">Select account</option>
                      {!hasSelectedAccount && entry.accountId ? (
                        <option value={entry.accountId}>{entry.account}</option>
                      ) : null}
                      {groupedAccounts.map((group) => (
                        <optgroup key={group.category} label={group.category}>
                          {group.items.map((item) => (
                            <option
                              key={`${group.category}-${item.id || item.name}`}
                              value={String(item.id || "")}
                            >
                              {item.code ? `${item.code} - ${item.name}` : item.name}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </td>

                  <td style={{ padding: "12px", borderBottom: "1px solid #f3f4f6" }}>
                    <input
                      type="text"
                      value={entry.description}
                      onChange={(event) =>
                        onUpdateEntry(entry.id, "description", event.target.value)
                      }
                      placeholder="Description"
                      style={cellInputStyle}
                    />
                  </td>

                  <td style={{ padding: "12px", borderBottom: "1px solid #f3f4f6" }}>
                    <select
                      value={entry.contact}
                      onChange={(event) =>
                        onUpdateEntry(entry.id, "contact", event.target.value)
                      }
                      style={cellInputStyle}
                    >
                      <option value="">Select contact</option>
                      {!hasSelectedContact && entry.contact ? (
                        <option value={entry.contact}>{entry.contact}</option>
                      ) : null}
                      {contacts.map((contact) => (
                        <option key={`${contact.type}-${contact.id}`} value={contact.name}>
                          {contact.name} ({contact.type})
                        </option>
                      ))}
                    </select>
                  </td>

                  <td style={{ padding: "12px", borderBottom: "1px solid #f3f4f6" }}>
                    <select
                      value={entry.type}
                      onChange={(event) =>
                        onUpdateEntry(entry.id, "type", event.target.value)
                      }
                      style={cellInputStyle}
                    >
                      <option value="">Select type</option>
                      {MANUAL_JOURNAL_ENTRY_TYPE_OPTIONS.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td style={{ padding: "12px", borderBottom: "1px solid #f3f4f6" }}>
                    <select
                      value={entry.tax || ""}
                      onChange={(event) => {
                        if (event.target.value === "__create_new__") {
                          onOpenNewTaxModal(entry.id);
                          return;
                        }

                        onUpdateEntry(entry.id, "tax", event.target.value);
                      }}
                      style={cellInputStyle}
                    >
                      <option value="">No tax</option>
                      {!hasSelectedTax && entry.tax ? (
                        <option value={entry.tax}>{entry.tax}</option>
                      ) : null}
                      {taxOptions.map((tax) => (
                        <option key={tax} value={tax}>
                          {tax}
                        </option>
                      ))}
                      <option value="__create_new__">Create new tax...</option>
                    </select>
                  </td>

                  <td style={{ padding: "12px", borderBottom: "1px solid #f3f4f6" }}>
                    <input
                      type="text"
                      value={entry.project || ""}
                      onChange={(event) =>
                        onUpdateEntry(entry.id, "project", event.target.value)
                      }
                      placeholder="Project"
                      style={cellInputStyle}
                    />
                  </td>

                  <td style={{ padding: "12px", borderBottom: "1px solid #f3f4f6" }}>
                    <input
                      type="text"
                      value={entry.reportingTags || ""}
                      onChange={(event) =>
                        onUpdateEntry(
                          entry.id,
                          "reportingTags",
                          event.target.value,
                        )
                      }
                      placeholder="Reporting tags"
                      style={cellInputStyle}
                    />
                  </td>

                  <td style={{ padding: "12px", borderBottom: "1px solid #f3f4f6" }}>
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      value={entry.debits}
                      onChange={(event) =>
                        onUpdateEntry(entry.id, "debits", event.target.value)
                      }
                      placeholder="0.00"
                      style={{ ...cellInputStyle, textAlign: "right" }}
                    />
                  </td>

                  <td style={{ padding: "12px", borderBottom: "1px solid #f3f4f6" }}>
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      value={entry.credits}
                      onChange={(event) =>
                        onUpdateEntry(entry.id, "credits", event.target.value)
                      }
                      placeholder="0.00"
                      style={{ ...cellInputStyle, textAlign: "right" }}
                    />
                  </td>

                  <td style={{ padding: "12px", borderBottom: "1px solid #f3f4f6" }}>
                    <button
                      type="button"
                      onClick={() => onRemoveRow(entry.id)}
                      disabled={isBusy || entries.length <= 1}
                      style={{
                        border: "1px solid #fecaca",
                        borderRadius: "10px",
                        backgroundColor: "#ffffff",
                        color: "#b91c1c",
                        cursor:
                          isBusy || entries.length <= 1
                            ? "not-allowed"
                            : "pointer",
                        opacity: isBusy || entries.length <= 1 ? 0.5 : 1,
                        padding: "10px 12px",
                        fontSize: "13px",
                        fontWeight: 600,
                      }}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "12px",
          padding: "20px 24px",
          borderTop: "1px solid #e5e7eb",
          backgroundColor: "#f8fafc",
        }}
      >
        <SummaryCard label="Total Debits" value={totals.totalDebits.toFixed(2)} />
        <SummaryCard label="Total Credits" value={totals.totalCredits.toFixed(2)} />
        <SummaryCard
          label="Difference"
          tone={Math.abs(totals.difference) > 0.01 ? "danger" : "success"}
          value={totals.difference.toFixed(2)}
        />
      </div>
    </section>
  );
}

function SummaryCard({
  label,
  tone = "neutral",
  value,
}: {
  label: string;
  tone?: "danger" | "neutral" | "success";
  value: string;
}) {
  const toneColor =
    tone === "danger" ? "#b91c1c" : tone === "success" ? "#0f766e" : "#111827";
  const toneBackground =
    tone === "danger" ? "#fef2f2" : tone === "success" ? "#ecfeff" : "#ffffff";

  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: "16px",
        backgroundColor: toneBackground,
        padding: "16px",
      }}
    >
      <div
        style={{
          fontSize: "12px",
          fontWeight: 700,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          color: "#6b7280",
        }}
      >
        {label}
      </div>
      <div
        style={{
          marginTop: "8px",
          fontSize: "24px",
          fontWeight: 700,
          color: toneColor,
        }}
      >
        {value}
      </div>
    </div>
  );
}
