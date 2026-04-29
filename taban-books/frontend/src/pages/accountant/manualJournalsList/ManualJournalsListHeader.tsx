import React, { useEffect, useRef, useState } from "react";
import {
  Building2,
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
  viewOptions,
  onChangeView,
  onClearAdvancedSearch,
  onImport,
  onNewCustomView: _onNewCustomView,
  onNewFromTemplate,
  onNewJournal,
  onNewTemplate,
  onOpenAccountants: _onOpenAccountants,
  onOpenExport,
  onOpenSearch,
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
    </div>
  );
}
