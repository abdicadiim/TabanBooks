import React, { useEffect, useMemo, useState } from "react";
import {
  BriefcaseBusiness,
  ChevronDown,
  ChevronUp,
  MapPin,
  Search,
  Tag,
} from "lucide-react";

import type {
  ManualJournalContact,
  ManualJournalEntry,
  ManualJournalGroupedAccount,
  ManualJournalLocationOption,
  ManualJournalProjectOption,
  ManualJournalReportingTagOption,
} from "../manualJournalTypes";
import type { ManualJournalTotals } from "./types";

interface ManualJournalEntriesTableProps {
  contacts: ManualJournalContact[];
  currencyCode: string;
  entries: ManualJournalEntry[];
  groupedAccounts: ManualJournalGroupedAccount[];
  isBusy: boolean;
  locationOptions: ManualJournalLocationOption[];
  onAddRow: () => void;
  onRemoveRow: (entryId: number) => void;
  onSelectAccount: (entryId: number, accountId: string) => void;
  onUpdateEntry: (
    entryId: number,
    field: keyof ManualJournalEntry,
    value: string,
  ) => void;
  projectOptions: ManualJournalProjectOption[];
  reportingTagOptions: ManualJournalReportingTagOption[];
  totals: ManualJournalTotals;
}

const brandBlue = "#2563eb";
const brandGreen = "#22b573";
const dangerRed = "#ef4444";

const cellInputStyle: React.CSSProperties = {
  width: "100%",
  minHeight: "42px",
  border: "none",
  padding: "8px 10px",
  fontSize: "14px",
  color: "#6b7280",
  backgroundColor: "transparent",
  outline: "none",
};

const tableCellStyle: React.CSSProperties = {
  borderBottom: "1px solid #e5e7eb",
  borderRight: "1px solid #e5e7eb",
  backgroundColor: "#ffffff",
};

const selectFieldStyle: React.CSSProperties = {
  ...cellInputStyle,
  minHeight: "54px",
  fontSize: "14px",
  backgroundColor: "#ffffff",
  appearance: "none",
  WebkitAppearance: "none",
  MozAppearance: "none",
  paddingLeft: "42px",
  paddingRight: "36px",
};

export function ManualJournalEntriesTable({
  contacts,
  currencyCode,
  entries,
  groupedAccounts,
  isBusy,
  locationOptions,
  onAddRow,
  onRemoveRow,
  onSelectAccount,
  onUpdateEntry,
  projectOptions,
  reportingTagOptions,
  totals,
}: ManualJournalEntriesTableProps) {
  const [hoveredEntryId, setHoveredEntryId] = useState<number | null>(null);
  const [openAdditionalRows, setOpenAdditionalRows] = useState<
    Record<number, boolean>
  >({});
  const [reportingTagModalEntryId, setReportingTagModalEntryId] = useState<
    number | null
  >(null);
  const [draftReportingTagValue, setDraftReportingTagValue] = useState("");
  const [isReportingTagDropdownOpen, setIsReportingTagDropdownOpen] =
    useState(false);
  const [reportingTagSearchTerm, setReportingTagSearchTerm] = useState("");
  const [reportingTagPopoverStyle, setReportingTagPopoverStyle] = useState<{
    top: number;
    left: number;
    width: number;
    arrowLeft: number;
  } | null>(null);

  const toggleAdditionalRow = (entryId: number) => {
    setOpenAdditionalRows((current) => ({
      ...current,
      [entryId]: !current[entryId],
    }));
  };

  const defaultLocationLabel =
    locationOptions.find((location) => location.isDefault)?.label ||
    locationOptions[0]?.label ||
    "Head Office";

  const activeReportingTagDefinition = useMemo(() => {
    const lineItemTag = reportingTagOptions.find(
      (tag) => tag.moduleLevel?.journals === "lineItem",
    );

    if (lineItemTag) {
      return lineItemTag;
    }

    return reportingTagOptions[0] || null;
  }, [reportingTagOptions]);

  const openReportingTagModal = (entry: ManualJournalEntry) => {
    setReportingTagModalEntryId(entry.id);
    setDraftReportingTagValue(entry.reportingTags || "");
    setIsReportingTagDropdownOpen(true);
    setReportingTagSearchTerm("");
  };

  const closeReportingTagModal = () => {
    setReportingTagModalEntryId(null);
    setDraftReportingTagValue("");
    setIsReportingTagDropdownOpen(false);
    setReportingTagSearchTerm("");
    setReportingTagPopoverStyle(null);
  };

  const positionReportingTagPopover = (triggerRect: DOMRect) => {
    const viewportWidth = window.innerWidth;
    const desiredWidth = Math.min(460, Math.max(320, viewportWidth * 0.24));
    const left = Math.min(
      Math.max(16, triggerRect.left - 12),
      Math.max(16, viewportWidth - desiredWidth - 16),
    );
    const width = Math.min(desiredWidth, viewportWidth - left - 16);
    const arrowLeft = Math.min(
      Math.max(56, triggerRect.left - left + 32),
      width - 56,
    );

    setReportingTagPopoverStyle({
      top: triggerRect.bottom + 10,
      left,
      width,
      arrowLeft,
    });
  };

  useEffect(() => {
    if (reportingTagModalEntryId === null) {
      return;
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeReportingTagModal();
      }
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [reportingTagModalEntryId]);

  const saveReportingTagModal = () => {
    if (reportingTagModalEntryId === null) {
      return;
    }

    onUpdateEntry(
      reportingTagModalEntryId,
      "reportingTags",
      draftReportingTagValue,
    );
    closeReportingTagModal();
  };

  const filteredReportingTagOptions = useMemo(() => {
    const options = activeReportingTagDefinition?.options || [];
    const searchTerm = reportingTagSearchTerm.trim().toLowerCase();

    if (!searchTerm) {
      return options;
    }

    return options.filter((option) =>
      option.toLowerCase().includes(searchTerm),
    );
  }, [activeReportingTagDefinition?.options, reportingTagSearchTerm]);

  return (
    <>
      <section
        style={{
          backgroundColor: "#ffffff",
          padding: "0 6px 18px",
          width: "100%",
          overflow: "visible",
        }}
      >
        <div style={{ backgroundColor: "#ffffff", overflow: "visible" }}>
          <table
            style={{
              width: "100%",
              tableLayout: "fixed",
              borderCollapse: "separate",
              borderSpacing: 0,
            }}
          >
            <colgroup>
              <col style={{ width: "26%" }} />
              <col style={{ width: "31%" }} />
              <col style={{ width: "20%" }} />
              <col style={{ width: "11.5%" }} />
              <col style={{ width: "11.5%" }} />
            </colgroup>

            <thead>
              <tr>
                {[
                  "Account",
                  "Description",
                  `Contact (${currencyCode || "SOS"})`,
                  "Debits",
                  "Credits",
                ].map(
                  (heading) => (
                    <th
                      key={heading}
                      style={{
                        padding: "10px 10px",
                        borderTop: "1px solid #e5e7eb",
                        borderBottom: "1px solid #e5e7eb",
                        borderRight:
                          heading !== "Credits" ? "1px solid #e5e7eb" : "none",
                        textAlign:
                          heading === "Debits" || heading === "Credits"
                            ? "right"
                            : "left",
                        fontSize: "12px",
                        fontWeight: 800,
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                        color: "#6b7280",
                        backgroundColor: "#ffffff",
                      }}
                    >
                      {heading}
                    </th>
                  ),
                )}
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

                const hasSelectedLocation = locationOptions.some(
                  (location) => location.label === entry.location,
                );

                const hasSelectedProject = projectOptions.some(
                  (project) => project.name === entry.project,
                );

                const isRowHovered = hoveredEntryId === entry.id;
                const isAdditionalOpen = Boolean(openAdditionalRows[entry.id]);

                return (
                  <React.Fragment key={entry.id}>
                    <tr
                      onMouseEnter={() => setHoveredEntryId(entry.id)}
                      onMouseLeave={() => setHoveredEntryId(null)}
                    >
                      <td style={tableCellStyle}>
                        <select
                          value={entry.accountId}
                          onChange={(event) =>
                            onSelectAccount(entry.id, event.target.value)
                          }
                          style={cellInputStyle}
                        >
                          <option value="">Select an account</option>

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
                                  {item.code
                                    ? `${item.code} - ${item.name}`
                                    : item.name}
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      </td>

                      <td style={tableCellStyle}>
                        <textarea
                          value={entry.description}
                          onChange={(event) =>
                            onUpdateEntry(
                              entry.id,
                              "description",
                              event.target.value,
                            )
                          }
                          placeholder="Description"
                          style={{
                            ...cellInputStyle,
                            resize: "vertical",
                            minHeight: "52px",
                          }}
                        />
                      </td>

                      <td style={tableCellStyle}>
                        <select
                          value={entry.contact}
                          onChange={(event) =>
                            onUpdateEntry(entry.id, "contact", event.target.value)
                          }
                          style={cellInputStyle}
                        >
                          <option value="">Select Contact</option>

                          {!hasSelectedContact && entry.contact ? (
                            <option value={entry.contact}>{entry.contact}</option>
                          ) : null}

                          {contacts.map((contact) => (
                            <option
                              key={`${contact.type}-${contact.id}`}
                              value={contact.name}
                            >
                              {contact.name} ({contact.type})
                            </option>
                          ))}
                        </select>
                      </td>

                      <td style={tableCellStyle}>
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

                      <td
                        style={{
                          borderBottom: "1px solid #e5e7eb",
                          backgroundColor: "#ffffff",
                          position: "relative",
                        }}
                      >
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
                          style={{
                            ...cellInputStyle,
                            textAlign: "right",
                            paddingRight: "64px",
                          }}
                        />

                        <div
                          style={{
                            position: "absolute",
                            right: "8px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                            opacity: isRowHovered || isAdditionalOpen ? 1 : 0,
                            pointerEvents:
                              isRowHovered || isAdditionalOpen ? "auto" : "none",
                            transition: "opacity 0.15s ease",
                            zIndex: 2,
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => toggleAdditionalRow(entry.id)}
                            title="Click to add additional information for this entry."
                            style={{
                              width: "24px",
                              height: "24px",
                              border: "1px solid #bfdbfe",
                              borderRadius: "999px",
                              backgroundColor: isAdditionalOpen
                                ? "#eff6ff"
                                : "#ffffff",
                              color: "#64748b",
                              cursor: "pointer",
                              fontSize: "15px",
                              lineHeight: 1,
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              padding: 0,
                            }}
                          >
                            ⋯
                          </button>

                          <button
                            type="button"
                            onClick={() => onRemoveRow(entry.id)}
                            disabled={isBusy || entries.length <= 1}
                            title="Remove"
                            style={{
                              width: "24px",
                              height: "24px",
                              border: "1px solid #fecaca",
                              borderRadius: "999px",
                              backgroundColor: "#ffffff",
                              color: "#ef4444",
                              cursor:
                                isBusy || entries.length <= 1
                                  ? "not-allowed"
                                  : "pointer",
                              opacity: isBusy || entries.length <= 1 ? 0.5 : 1,
                              fontSize: "17px",
                              lineHeight: 1,
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              padding: 0,
                            }}
                          >
                            ×
                          </button>
                        </div>
                      </td>
                    </tr>

                    {isAdditionalOpen ? (
                      <tr
                        onMouseEnter={() => setHoveredEntryId(entry.id)}
                        onMouseLeave={() => setHoveredEntryId(null)}
                      >
                        <td
                          colSpan={5}
                          style={{
                            padding: 0,
                            borderBottom: "1px solid #e5e7eb",
                            backgroundColor: "#fafafa",
                          }}
                        >
                          <div
                            style={{
                              backgroundColor: "#e5e7eb",
                              display: "grid",
                              gridTemplateColumns: "1fr 1.35fr 1.35fr",
                              gap: "1px",
                            }}
                          >
                            <div
                              style={{
                                position: "relative",
                                backgroundColor: "#ffffff",
                              }}
                            >
                              <MapPin
                                size={17}
                                style={{
                                  position: "absolute",
                                  left: "14px",
                                  top: "50%",
                                  transform: "translateY(-50%)",
                                  color: "#9ca3af",
                                  pointerEvents: "none",
                                }}
                              />
                              <ChevronDown
                                size={18}
                                style={{
                                  position: "absolute",
                                  right: "12px",
                                  top: "50%",
                                  transform: "translateY(-50%)",
                                  color: "#9ca3af",
                                  pointerEvents: "none",
                                }}
                              />
                              <select
                                value={entry.location || ""}
                                onChange={(event) =>
                                  onUpdateEntry(
                                    entry.id,
                                    "location",
                                    event.target.value,
                                  )
                                }
                                style={{
                                  ...selectFieldStyle,
                                  color: entry.location ? "#1f2937" : "#6b7280",
                                }}
                              >
                                <option value="">
                                  {defaultLocationLabel || "Select location"}
                                </option>

                                {!hasSelectedLocation && entry.location ? (
                                  <option value={entry.location}>
                                    {entry.location}
                                  </option>
                                ) : null}

                                {locationOptions.map((location) => (
                                  <option key={location.id} value={location.label}>
                                    {location.label}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div
                              style={{
                                position: "relative",
                                backgroundColor: "#ffffff",
                              }}
                            >
                              <BriefcaseBusiness
                                size={17}
                                style={{
                                  position: "absolute",
                                  left: "14px",
                                  top: "50%",
                                  transform: "translateY(-50%)",
                                  color: "#9ca3af",
                                  pointerEvents: "none",
                                }}
                              />
                              <ChevronDown
                                size={18}
                                style={{
                                  position: "absolute",
                                  right: "12px",
                                  top: "50%",
                                  transform: "translateY(-50%)",
                                  color: "#9ca3af",
                                  pointerEvents: "none",
                                }}
                              />
                              <select
                                value={entry.project || ""}
                                onChange={(event) =>
                                  onUpdateEntry(
                                    entry.id,
                                    "project",
                                    event.target.value,
                                  )
                                }
                                style={{
                                  ...selectFieldStyle,
                                  color: entry.project ? "#1f2937" : "#6b7280",
                                }}
                              >
                                <option value="">Select a project</option>

                                {!hasSelectedProject && entry.project ? (
                                  <option value={entry.project}>{entry.project}</option>
                                ) : null}

                                {projectOptions.map((project) => (
                                  <option key={project.id} value={project.name}>
                                    {project.name}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <button
                              type="button"
                              onClick={(event) => {
                                positionReportingTagPopover(
                                  event.currentTarget.getBoundingClientRect(),
                                );
                                openReportingTagModal(entry);
                              }}
                              style={{
                                minHeight: "54px",
                                border: "none",
                                backgroundColor: "#ffffff",
                                display: "flex",
                                alignItems: "center",
                                gap: "10px",
                                padding: "0 14px",
                                textAlign: "left",
                                cursor: "pointer",
                              }}
                            >
                              <Tag
                                size={17}
                                style={{ color: "#9ca3af", flexShrink: 0 }}
                              />
                              <span
                                style={{
                                  flex: 1,
                                  fontSize: "14px",
                                  color: entry.reportingTags ? "#111827" : "#ef4444",
                                  fontWeight: entry.reportingTags ? 500 : 400,
                                }}
                              >
                                {entry.reportingTags ||
                                  (activeReportingTagDefinition?.isRequired
                                    ? "Reporting Tags*"
                                    : "Reporting Tags")}
                              </span>
                              <ChevronDown
                                size={18}
                                style={{ color: "#9ca3af", flexShrink: 0 }}
                              />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr minmax(280px, 520px)",
            gap: "14px",
            alignItems: "start",
            padding: "16px 0 10px",
            backgroundColor: "#ffffff",
          }}
        >
          <div>
            <button
              type="button"
              onClick={onAddRow}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                backgroundColor: "#f3f4f6",
                color: "#374151",
                cursor: "pointer",
                minHeight: "36px",
                padding: "0 11px",
                fontSize: "13px",
                fontWeight: 500,
                display: "inline-flex",
                alignItems: "center",
                gap: "7px",
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  width: "17px",
                  height: "17px",
                  borderRadius: "999px",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: brandBlue,
                  color: "#ffffff",
                  fontSize: "14px",
                  lineHeight: 1,
                  fontWeight: 700,
                }}
              >
                +
              </span>
              Add New Row
            </button>
          </div>

          <div
            style={{
              borderRadius: "12px",
              backgroundColor: "#f5f5f7",
              padding: "18px 24px",
              display: "grid",
              gap: "14px",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 80px 80px",
                gap: "8px",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: "14px", color: "#111827" }}>Sub Total</span>

              <span
                style={{
                  fontSize: "14px",
                  color: "#111827",
                  textAlign: "right",
                }}
              >
                {totals.totalDebits.toFixed(2)}
              </span>

              <span
                style={{
                  fontSize: "14px",
                  color: "#111827",
                  textAlign: "right",
                }}
              >
                {totals.totalCredits.toFixed(2)}
              </span>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 80px 80px",
                gap: "8px",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontSize: "17px",
                  fontWeight: 800,
                  color: "#111827",
                }}
              >
                Total ({currencyCode || "SOS"})
              </span>

              <span
                style={{
                  fontSize: "17px",
                  fontWeight: 800,
                  color: "#374151",
                  textAlign: "right",
                }}
              >
                {totals.totalDebits.toFixed(2)}
              </span>

              <span
                style={{
                  fontSize: "17px",
                  fontWeight: 800,
                  color: "#374151",
                  textAlign: "right",
                }}
              >
                {totals.totalCredits.toFixed(2)}
              </span>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 80px 80px",
                gap: "8px",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: "15px", color: dangerRed }}>
                Difference
              </span>
              <span />
              <span
                style={{
                  fontSize: "15px",
                  color: dangerRed,
                  textAlign: "right",
                }}
              >
                {totals.difference.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </section>

      {reportingTagModalEntryId !== null && reportingTagPopoverStyle ? (
        <div
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeReportingTagModal();
            }
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1200,
            backgroundColor: "transparent",
          }}
        >
          <div
            style={{
              position: "fixed",
              top: `${reportingTagPopoverStyle.top}px`,
              left: `${reportingTagPopoverStyle.left}px`,
              width: `${reportingTagPopoverStyle.width}px`,
              border: "1px solid #d1d5db",
              borderRadius: "12px",
              backgroundColor: "#ffffff",
              boxShadow: "0 14px 32px rgba(15, 23, 42, 0.16)",
              overflow: "hidden",
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div
              style={{
                position: "absolute",
                top: "-8px",
                left: `${reportingTagPopoverStyle.arrowLeft}px`,
                width: "16px",
                height: "16px",
                backgroundColor: "#ffffff",
                borderLeft: "1px solid #d1d5db",
                borderTop: "1px solid #d1d5db",
                transform: "rotate(45deg)",
              }}
            />
            <div
              style={{
                padding: "14px 16px",
                borderBottom: "1px solid #e5e7eb",
                fontSize: "16px",
                fontWeight: 500,
                color: "#111827",
              }}
            >
              Reporting Tags
            </div>

            <div
              style={{
                padding: "18px 24px 20px",
                display: "grid",
                gap: "10px",
              }}
            >
              <label
                htmlFor="manual-journal-reporting-tag-select"
                style={{
                  fontSize: "14px",
                  color: "#ef4444",
                }}
              >
                {activeReportingTagDefinition?.name || "Reporting Tags"}
                {activeReportingTagDefinition?.isRequired ? " *" : ""}
              </label>

              <button
                id="manual-journal-reporting-tag-select"
                type="button"
                onClick={() =>
                  setIsReportingTagDropdownOpen((current) => !current)
                }
                style={{
                  width: "100%",
                  maxWidth: "280px",
                  minHeight: "46px",
                  borderRadius: "12px",
                  border: "2px solid #3b82f6",
                  boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.1)",
                  padding: "0 14px",
                  fontSize: "14px",
                  color: draftReportingTagValue ? "#111827" : "#6b7280",
                  backgroundColor: "#ffffff",
                  outline: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  textAlign: "left",
                }}
              >
                <span
                  style={{
                    color: draftReportingTagValue ? "#111827" : "#6b7280",
                  }}
                >
                  {draftReportingTagValue || "Select reporting tag"}
                </span>
                {isReportingTagDropdownOpen ? (
                  <ChevronUp size={18} color="#3b82f6" />
                ) : (
                  <ChevronDown size={18} color="#3b82f6" />
                )}
              </button>

              {isReportingTagDropdownOpen ? (
                <div
                  style={{
                    width: "100%",
                    maxWidth: "280px",
                    borderRadius: "12px",
                    backgroundColor: "#ffffff",
                    boxShadow: "0 12px 24px rgba(59, 130, 246, 0.12)",
                    padding: "10px",
                  }}
                >
                  <div
                    style={{
                      position: "relative",
                      marginBottom: "8px",
                    }}
                  >
                    <Search
                      size={18}
                      color="#9ca3af"
                      style={{
                        position: "absolute",
                        left: "12px",
                        top: "50%",
                        transform: "translateY(-50%)",
                      }}
                    />
                    <input
                      type="text"
                      value={reportingTagSearchTerm}
                      onChange={(event) =>
                        setReportingTagSearchTerm(event.target.value)
                      }
                      placeholder="Search"
                      style={{
                        width: "100%",
                        minHeight: "42px",
                        borderRadius: "10px",
                        border: "2px solid #3b82f6",
                        padding: "0 12px 0 40px",
                        fontSize: "14px",
                        color: "#111827",
                        outline: "none",
                      }}
                    />
                  </div>

                  <div style={{ display: "grid", gap: "4px" }}>
                    {filteredReportingTagOptions.length === 0 ? (
                      <div
                        style={{
                          padding: "10px 12px",
                          fontSize: "14px",
                          color: "#6b7280",
                        }}
                      >
                        No reporting tag options found.
                      </div>
                    ) : (
                      filteredReportingTagOptions.map((option) => {
                        const isSelected = draftReportingTagValue === option;

                        return (
                          <button
                            key={option}
                            type="button"
                            onClick={() => {
                              setDraftReportingTagValue(option);
                              setIsReportingTagDropdownOpen(false);
                            }}
                            style={{
                              border: "none",
                              borderRadius: "10px",
                              backgroundColor: isSelected
                                ? "#4a86e8"
                                : "#ffffff",
                              color: isSelected ? "#ffffff" : "#4b5563",
                              minHeight: "40px",
                              padding: "0 18px",
                              fontSize: "14px",
                              textAlign: "left",
                              cursor: "pointer",
                            }}
                          >
                            {option}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            <div
              style={{
                padding: "14px 24px",
                borderTop: "1px solid #e5e7eb",
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <button
                type="button"
                onClick={saveReportingTagModal}
                style={{
                  border: "none",
                  borderRadius: "8px",
                  backgroundColor: brandGreen,
                  color: "#ffffff",
                  minHeight: "42px",
                  padding: "0 18px",
                  fontSize: "14px",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Save
              </button>

              <button
                type="button"
                onClick={closeReportingTagModal}
                style={{
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  backgroundColor: "#ffffff",
                  color: "#111827",
                  minHeight: "42px",
                  padding: "0 18px",
                  fontSize: "14px",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
