import React, { useEffect, useRef, useState } from "react";
import {
  Building2,
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  Download,
  FileText,
  MoreHorizontal,
  Plus,
  Search,
  Upload,
  User,
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

type MoreActionItem = {
  key: string;
  label: string;
  icon: React.ElementType;
  onClick: () => void;
  disabled?: boolean;
};

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
  onChangeView,
  onChangePeriod,
  onChangeSort,
  onClearAdvancedSearch,
  onImport,
  onNewCustomView: _onNewCustomView,
  onNewFromTemplate,
  onNewJournal,
  onNewTemplate,
  onOpenAccountants: _onOpenAccountants,
  onOpenExport,
  onOpenSearch,
  onToggleSortOrder,
}: ManualJournalsListHeaderProps) {
  const [showNewMenu, setShowNewMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showViewMenu, setShowViewMenu] = useState(false);
  const [activeMoreSection, setActiveMoreSection] = useState<
    "searchViews" | "import" | "export" | null
  >(null);

  const headerRef = useRef<HTMLDivElement | null>(null);

  const closeAllMenus = () => {
    setShowNewMenu(false);
    setShowMoreMenu(false);
    setShowViewMenu(false);
    setActiveMoreSection(null);
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        headerRef.current &&
        !headerRef.current.contains(event.target as Node)
      ) {
        closeAllMenus();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const activeViewLabel =
    viewOptions.find((option) => option.value === activeViewKey)?.label ||
    "All Manual Journals";

  const dropdownStyle: React.CSSProperties = {
    position: "absolute",
    top: "100%",
    right: 0,
    minWidth: "250px",
    backgroundColor: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "10px",
    boxShadow: "0 12px 30px rgba(15, 23, 42, 0.14)",
    padding: "6px",
    zIndex: 9999,
  };

  const menuItemStyle: React.CSSProperties = {
    width: "100%",
    border: "none",
    backgroundColor: "transparent",
    padding: "11px 12px",
    textAlign: "left",
    cursor: "pointer",
    fontSize: "14px",
    color: "#334155",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    fontWeight: 500,
  };

  const iconStyle: React.CSSProperties = {
    color: "#156372",
    flexShrink: 0,
  };

  const searchViewsItems: MoreActionItem[] = [
    {
      key: "advanced-search",
      label: "Advanced Search",
      icon: Search,
      disabled: isBusy,
      onClick: () => {
        onOpenSearch();
        closeAllMenus();
      },
    },
    ...(hasActiveSearch
      ? [
          {
            key: "clear-search-filters",
            label: "Clear Search Filters",
            icon: Search,
            onClick: () => {
              onClearAdvancedSearch();
              closeAllMenus();
            },
          },
        ]
      : []),
  ];

  const dataActionItems: MoreActionItem[] = [
    {
      key: "export-journals",
      label: "Export Journals",
      icon: FileText,
      onClick: () => {
        onOpenExport("journals");
        closeAllMenus();
      },
    },
    {
      key: "export-customer-credits",
      label: "Export Customer Credits",
      icon: User,
      onClick: () => {
        onOpenExport("customerCredits");
        closeAllMenus();
      },
    },
    {
      key: "export-vendor-credits",
      label: "Export Vendor Credits",
      icon: Building2,
      onClick: () => {
        onOpenExport("vendorCredits");
        closeAllMenus();
      },
    },
  ];

  const moreSections: Array<{
    key: "searchViews" | "import" | "export";
    label: string;
    icon: React.ElementType;
  }> = [
    { key: "searchViews", label: "Search & Views", icon: Search },
    { key: "import", label: "Import", icon: Upload },
    { key: "export", label: "Export", icon: Download },
  ];

  const getImportActionLabel = (label: string) =>
    label.trim().toLowerCase().startsWith("import ")
      ? label.trim()
      : `Import ${label.trim()}`;

  return (
    <div
      ref={headerRef}
      style={{
        position: "sticky",
        top: 0,
        zIndex: 1200,
        backgroundColor: "#ffffff",
        boxShadow: "0 2px 10px rgba(15, 23, 42, 0.06)",
      }}
    >
      <div
        style={{
          height: "88px",
          borderBottom: "1px solid #e5e7eb",
          padding: "0 28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: "",
        }}
      >
        <div style={{ position: "relative" }}>
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
                color: "#156372",
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
            <div style={{ marginTop: "6px", fontSize: "14px", color: "#156372" }}>
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
            onClick={() => {
              setShowViewMenu((value) => !value);
              setShowNewMenu(false);
              setShowMoreMenu(false);
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              border: "none",
              backgroundColor: "transparent",
              color: "#1f2937",
              cursor: "pointer",
              fontSize: "26px",
              fontWeight: 700,
              padding: 0,
              borderBottom: "2px solid #0f172a",
            }}
          >
            {activeViewLabel}
            <ChevronDown size={20} color="#156372" />
          </button>

          {showViewMenu && (
            <div style={{ ...dropdownStyle, left: 0, right: "auto" }}>
              {viewOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChangeView(option.value);
                    closeAllMenus();
                  }}
                  style={{
                    ...menuItemStyle,
                    fontWeight: option.value === activeViewKey ? 700 : 500,
                    color:
                      option.value === activeViewKey ? "#156372" : "#334155",
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ position: "relative", display: "flex" }}>
            <button
              type="button"
              onClick={onNewJournal}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                border: "1px solid #0D4A52",
                borderRight: "1px solid rgba(255,255,255,0.35)",
                borderBottom: "3px solid #0D4A52",
                borderRadius: "7px 0 0 7px",
                padding: "12px 18px",
                background: "linear-gradient(180deg, #156372 0%, #0D4A52 100%)",
                color: "#ffffff",
                cursor: "pointer",
                fontSize: "16px",
                fontWeight: 600,
                boxShadow: "0 1px 2px rgba(15, 23, 42, 0.12)",
              }}
            >
              <Plus size={20} />
              New
            </button>

            <button
              type="button"
              onClick={() => {
                setShowNewMenu((value) => !value);
                setShowMoreMenu(false);
                setShowViewMenu(false);
              }}
              style={{
                border: "1px solid #0D4A52",
                borderBottom: "3px solid #0D4A52",
                borderRadius: "0 7px 7px 0",
                padding: "12px 12px",
                background: "linear-gradient(180deg, #156372 0%, #0D4A52 100%)",
                color: "#ffffff",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                boxShadow: "0 1px 2px rgba(15, 23, 42, 0.12)",
              }}
            >
              <ChevronDown size={18} />
            </button>

            {showNewMenu && (
              <div style={dropdownStyle}>
                <button
                  type="button"
                  style={menuItemStyle}
                  onClick={() => {
                    onNewJournal();
                    closeAllMenus();
                  }}
                >
                  <Plus size={16} style={iconStyle} />
                  Create New Journal
                </button>

                <button
                  type="button"
                  style={menuItemStyle}
                  onClick={() => {
                    onNewFromTemplate();
                    closeAllMenus();
                  }}
                >
                  <Plus size={16} style={iconStyle} />
                  Create Recurring Journal
                </button>

                <button
                  type="button"
                  style={menuItemStyle}
                  onClick={() => {
                    onNewTemplate();
                    closeAllMenus();
                  }}
                >
                  <Plus size={16} style={iconStyle} />
                  New Template
                </button>
              </div>
            )}
          </div>

          <div style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => {
                setShowMoreMenu((value) => {
                  const next = !value;
                  if (!next) {
                    setActiveMoreSection(null);
                  }
                  return next;
                });
                setShowNewMenu(false);
                setShowViewMenu(false);
              }}
              onMouseEnter={() => setShowMoreMenu(true)}
              style={{
                width: "46px",
                height: "46px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                borderBottom: "3px solid #cbd5e1",
                backgroundColor: "#ffffff",
                color: "#475569",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
              }}
            >
              <MoreHorizontal size={22} />
            </button>

            {showMoreMenu && (
              <div className="absolute top-full right-0 mt-2 w-60 bg-white border border-slate-200 rounded-lg shadow-xl z-[1200] py-2 animate-in fade-in slide-in-from-top-1 duration-200">
                {moreSections.map((section, sectionIndex) => {
                  const isActive = activeMoreSection === section.key;
                  const SectionIcon = section.icon;
                  const sectionItems =
                    section.key === "searchViews"
                      ? searchViewsItems
                      : section.key === "export"
                      ? dataActionItems
                      : [];

                  return (
                    <div
                      key={section.key}
                      className={`relative ${
                        sectionIndex < moreSections.length - 1
                          ? "border-b border-slate-100"
                          : ""
                      }`}
                    >
                      <button
                        type="button"
                        className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors ${
                          isActive
                            ? "text-white rounded-md mx-2 w-[calc(100%-16px)] shadow-sm"
                            : "text-slate-700 hover:bg-[#1964721A] hover:text-[#196472]"
                        }`}
                        style={isActive ? { backgroundColor: "#196472" } : {}}
                        onMouseEnter={() => setActiveMoreSection(section.key)}
                        onClick={() =>
                          setActiveMoreSection((current) =>
                            current === section.key ? null : section.key,
                          )
                        }
                      >
                        <span className="inline-flex items-center gap-3 font-medium">
                          <SectionIcon
                            size={16}
                            className={isActive ? "text-white" : "text-[#196472]"}
                          />
                          {section.label}
                        </span>
                        <ChevronRight
                          size={14}
                          className={isActive ? "text-white" : "text-[#196472]"}
                        />
                      </button>

                      {isActive && (
                        <div className="md:absolute md:top-0 md:right-full md:mr-2 md:w-64 relative w-full bg-white md:border border-slate-200 rounded-lg md:shadow-xl py-2 z-[1210] md:animate-in md:fade-in md:slide-in-from-right-1 duration-200">
                          {section.key === "import" ? (
                            importActions.map((action) => (
                              <button
                                key={action.route}
                                type="button"
                                className="w-full flex items-center justify-start gap-3 px-4 py-2 text-left text-sm text-slate-700 hover:bg-[#1964721A] hover:text-[#196472] transition-colors"
                                onClick={() => {
                                  onImport(action.route);
                                  closeAllMenus();
                                }}
                              >
                                <Upload size={16} className="text-[#196472]" />
                                {getImportActionLabel(action.label)}
                              </button>
                            ))
                          ) : (
                            sectionItems.map((item) => {
                              const ItemIcon = item.icon;
                              return (
                                <button
                                  key={item.key}
                                  type="button"
                                  disabled={item.disabled}
                                  className={`w-full flex items-center justify-start gap-3 px-4 py-2 text-left text-sm transition-colors ${
                                    item.disabled
                                      ? "cursor-not-allowed opacity-60 text-slate-400"
                                      : "text-slate-700 hover:bg-[#1964721A] hover:text-[#196472]"
                                  }`}
                                  onClick={item.onClick}
                                >
                                  <ItemIcon
                                    size={16}
                                    className={
                                      item.disabled ? "text-slate-300" : "text-[#196472]"
                                    }
                                  />
                                  {item.label}
                                </button>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
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
            onClick={_onNewCustomView}
            style={{
              borderRadius: "14px",
              border: "1px dashed #94a3b8",
              padding: "12px 16px",
              backgroundColor: "#ffffff",
              color: "#156372",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: 700,
            }}
          >
            New Custom View
          </button>
        </div>
    </div>
  </div>
  );
}
