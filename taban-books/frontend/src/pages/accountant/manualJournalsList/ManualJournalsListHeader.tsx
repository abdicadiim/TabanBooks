import React from "react";
import {
  ArrowUpDown,
  Download,
  Plus,
  Search,
  Settings2,
  UserRoundSearch,
} from "lucide-react";

import type { ManualJournalExportType, ManualJournalViewOption } from "./types";

interface ManualJournalsListHeaderProps {
  activeViewKey: string;
  hasActiveSearch: boolean;
  importActions: Array<{ label: string; route: string }>;
  isBusy: boolean;
  periodOptions: readonly string[];
  selectedPeriod: string;
  sortBy: string;
  sortOptions: readonly string[];
  sortOrder: "asc" | "desc";
  totalCount: number;
  viewOptions: ManualJournalViewOption[];
  onChangePeriod: (value: string) => void;
  onChangeSort: (value: string) => void;
  onChangeView: (value: string) => void;
  onClearAdvancedSearch: () => void;
  onImport: (route: string) => void;
  onManageTemplates: () => void;
  onNewCustomView: () => void;
  onNewFromTemplate: () => void;
  onNewJournal: () => void;
  onNewTemplate: () => void;
  onOpenAccountants: () => void;
  onOpenExport: (type: ManualJournalExportType) => void;
  onOpenSearch: () => void;
  onToggleSortOrder: () => void;
}

export function ManualJournalsListHeader({
  activeViewKey,
  hasActiveSearch,
  importActions,
  isBusy,
  periodOptions,
  selectedPeriod,
  sortBy,
  sortOptions,
  sortOrder,
  totalCount,
  viewOptions,
  onChangePeriod,
  onChangeSort,
  onChangeView,
  onClearAdvancedSearch,
  onImport,
  onManageTemplates,
  onNewCustomView,
  onNewFromTemplate,
  onNewJournal,
  onNewTemplate,
  onOpenAccountants,
  onOpenExport,
  onOpenSearch,
  onToggleSortOrder,
}: ManualJournalsListHeaderProps) {
  return (
    <div style={{ padding: "28px 24px 0" }}>
      <section
        style={{
          background:
            "linear-gradient(135deg, rgba(21, 99, 114, 0.08) 0%, rgba(255, 255, 255, 1) 55%)",
          border: "1px solid #dbeafe",
          borderRadius: "24px",
          padding: "24px",
          display: "grid",
          gap: "20px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            gap: "20px",
          }}
        >
          <div style={{ maxWidth: "760px" }}>
            <h1 style={{ margin: 0, fontSize: "30px", fontWeight: 700, color: "#111827" }}>
              Manual Journals
            </h1>
            <p
              style={{
                margin: "12px 0 0",
                fontSize: "15px",
                lineHeight: 1.8,
                color: "#475569",
              }}
            >
              Review, search, publish, and export journal entries from one place.
              The page now uses simpler controls so the core accounting workflows are
              easier to maintain and faster to understand.
            </p>
          </div>

          <div
            style={{
              minWidth: "220px",
              backgroundColor: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: "18px",
              padding: "16px 18px",
            }}
          >
            <div style={{ fontSize: "12px", fontWeight: 700, color: "#64748b" }}>
              CURRENT RESULT SET
            </div>
            <div style={{ marginTop: "10px", fontSize: "30px", fontWeight: 700, color: "#111827" }}>
              {totalCount}
            </div>
            <div style={{ marginTop: "6px", fontSize: "14px", color: "#475569" }}>
              journals in the current view
            </div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gap: "14px",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          }}
        >
          <label style={{ display: "grid", gap: "8px" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#64748b" }}>
              VIEW
            </span>
            <select
              value={activeViewKey}
              onChange={(event) => onChangeView(event.target.value)}
              style={{
                borderRadius: "12px",
                border: "1px solid #cbd5e1",
                padding: "11px 12px",
                fontSize: "14px",
                backgroundColor: "#ffffff",
                color: "#111827",
              }}
            >
              {viewOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: "8px" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#64748b" }}>
              PERIOD
            </span>
            <select
              value={selectedPeriod}
              onChange={(event) => onChangePeriod(event.target.value)}
              style={{
                borderRadius: "12px",
                border: "1px solid #cbd5e1",
                padding: "11px 12px",
                fontSize: "14px",
                backgroundColor: "#ffffff",
                color: "#111827",
              }}
            >
              {periodOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: "8px" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#64748b" }}>
              SORT BY
            </span>
            <div style={{ display: "flex", gap: "10px" }}>
              <select
                value={sortBy}
                onChange={(event) => onChangeSort(event.target.value)}
                style={{
                  flex: 1,
                  borderRadius: "12px",
                  border: "1px solid #cbd5e1",
                  padding: "11px 12px",
                  fontSize: "14px",
                  backgroundColor: "#ffffff",
                  color: "#111827",
                }}
              >
                {sortOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={onToggleSortOrder}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  borderRadius: "12px",
                  border: "1px solid #cbd5e1",
                  padding: "11px 14px",
                  backgroundColor: "#ffffff",
                  color: "#334155",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: 600,
                }}
              >
                <ArrowUpDown size={16} />
                {sortOrder === "asc" ? "Asc" : "Desc"}
              </button>
            </div>
          </label>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
          <button
            type="button"
            disabled={isBusy}
            onClick={onOpenSearch}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              borderRadius: "999px",
              border: "1px solid #cbd5e1",
              padding: "10px 14px",
              backgroundColor: "#ffffff",
              color: "#334155",
              cursor: isBusy ? "not-allowed" : "pointer",
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            <Search size={16} />
            Advanced Search
          </button>

          {hasActiveSearch ? (
            <button
              type="button"
              onClick={onClearAdvancedSearch}
              style={{
                borderRadius: "999px",
                border: "1px solid #fcd34d",
                padding: "10px 14px",
                backgroundColor: "#fffbeb",
                color: "#b45309",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: 600,
              }}
            >
              Clear Search Filters
            </button>
          ) : null}

          <button
            type="button"
            onClick={onOpenAccountants}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              borderRadius: "999px",
              border: "1px solid #cbd5e1",
              padding: "10px 14px",
              backgroundColor: "#ffffff",
              color: "#156372",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            <UserRoundSearch size={16} />
            Find Accountants
          </button>

          <button
            type="button"
            onClick={onManageTemplates}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              borderRadius: "999px",
              border: "1px solid #cbd5e1",
              padding: "10px 14px",
              backgroundColor: "#ffffff",
              color: "#334155",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            <Settings2 size={16} />
            Manage Templates
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gap: "12px",
            gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          }}
        >
          <button
            type="button"
            onClick={onNewJournal}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              borderRadius: "14px",
              border: "none",
              padding: "12px 16px",
              backgroundColor: "#156372",
              color: "#ffffff",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: 700,
            }}
          >
            <Plus size={16} />
            New Journal
          </button>

          <button
            type="button"
            onClick={onNewFromTemplate}
            style={{
              borderRadius: "14px",
              border: "1px solid #cbd5e1",
              padding: "12px 16px",
              backgroundColor: "#ffffff",
              color: "#334155",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: 700,
            }}
          >
            New From Template
          </button>

          <button
            type="button"
            onClick={onNewTemplate}
            style={{
              borderRadius: "14px",
              border: "1px solid #cbd5e1",
              padding: "12px 16px",
              backgroundColor: "#ffffff",
              color: "#334155",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: 700,
            }}
          >
            New Template
          </button>

          <select
            defaultValue=""
            onChange={(event) => {
              if (event.target.value) {
                onImport(event.target.value);
                event.target.value = "";
              }
            }}
            style={{
              borderRadius: "14px",
              border: "1px solid #cbd5e1",
              padding: "12px 16px",
              backgroundColor: "#ffffff",
              color: "#334155",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            <option value="">Import...</option>
            {importActions.map((action) => (
              <option key={action.route} value={action.route}>
                {action.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => onOpenExport("journals")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              borderRadius: "14px",
              border: "1px solid #cbd5e1",
              padding: "12px 16px",
              backgroundColor: "#ffffff",
              color: "#334155",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: 700,
            }}
          >
            <Download size={16} />
            Export Journals
          </button>

          <button
            type="button"
            onClick={() => onOpenExport("customerCredits")}
            style={{
              borderRadius: "14px",
              border: "1px solid #cbd5e1",
              padding: "12px 16px",
              backgroundColor: "#ffffff",
              color: "#334155",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: 700,
            }}
          >
            Export Customer Credits
          </button>

          <button
            type="button"
            onClick={() => onOpenExport("vendorCredits")}
            style={{
              borderRadius: "14px",
              border: "1px solid #cbd5e1",
              padding: "12px 16px",
              backgroundColor: "#ffffff",
              color: "#334155",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: 700,
            }}
          >
            Export Vendor Credits
          </button>

          <button
            type="button"
            onClick={onNewCustomView}
            style={{
              borderRadius: "14px",
              border: "1px dashed #94a3b8",
              padding: "12px 16px",
              backgroundColor: "#ffffff",
              color: "#475569",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: 700,
            }}
          >
            New Custom View
          </button>
        </div>
      </section>
    </div>
  );
}
