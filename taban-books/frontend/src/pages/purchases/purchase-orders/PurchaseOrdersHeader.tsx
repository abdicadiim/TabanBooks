// @ts-nocheck
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Download,
  MoreVertical,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Star,
  Upload,
} from "lucide-react";
import {
  PURCHASE_ORDER_SORT_OPTIONS,
  PURCHASE_ORDER_VIEWS,
} from "./PurchaseOrders.constants";
import { getPurchaseOrdersDisplayText } from "./PurchaseOrders.utils";

export default function PurchaseOrdersHeader({
  isRefreshing,
  onOpenCustomView,
  onOpenExport,
  onOpenSearch,
  onRefresh,
  onSortChange,
  onViewSelect,
  selectedView,
  sortDirection,
  sortField,
  styles,
}) {
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [showSortSubmenu, setShowSortSubmenu] = useState(false);
  const [importSubmenuOpen, setImportSubmenuOpen] = useState(false);
  const [exportSubmenuOpen, setExportSubmenuOpen] = useState(false);
  const dropdownRef = useRef(null);
  const moreMenuRef = useRef(null);

  useEffect(() => {
    if (!moreMenuOpen) {
      setShowSortSubmenu(false);
      setImportSubmenuOpen(false);
      setExportSubmenuOpen(false);
    }
  }, [moreMenuOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }

      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target)) {
        setMoreMenuOpen(false);
      }
    };

    if (dropdownOpen || moreMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownOpen, moreMenuOpen]);

  const handleViewSelection = (view: string) => {
    onViewSelect(view);
    setDropdownOpen(false);
  };

  return (
    <div style={styles.header}>
      <div style={styles.headerContent}>
        <div style={styles.headerLeft}>
          <div style={styles.dropdownWrapper} ref={dropdownRef}>
            <h1 style={styles.title}>
              <span style={styles.statusText}>
                {getPurchaseOrdersDisplayText(selectedView)}
                <button
                  style={styles.chevronButton}
                  onClick={() => setDropdownOpen((current) => !current)}
                >
                  {dropdownOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
              </span>
            </h1>

            {dropdownOpen && (
              <div
                style={{
                  ...styles.dropdown,
                  maxHeight: "400px",
                  overflowY: "auto",
                }}
              >
                {PURCHASE_ORDER_VIEWS.map((view) => (
                  <button
                    key={view}
                    style={{
                      ...styles.dropdownItem,
                      ...(selectedView === view
                        ? {
                            backgroundColor: "#eff6ff",
                            borderLeft: "3px solid #156372",
                            paddingLeft: "13px",
                          }
                        : {}),
                    }}
                    onClick={() => handleViewSelection(view)}
                    onMouseEnter={(event) => {
                      if (selectedView !== view) {
                        event.currentTarget.style.backgroundColor = "#f9fafb";
                      }
                    }}
                    onMouseLeave={(event) => {
                      if (selectedView !== view) {
                        event.currentTarget.style.backgroundColor = "transparent";
                      }
                    }}
                  >
                    <span style={styles.dropdownItemText}>{view}</span>
                    <Star
                      size={16}
                      style={{
                        color: "#9ca3af",
                        fill: "none",
                        strokeWidth: 1.5,
                        marginLeft: "8px",
                      }}
                    />
                  </button>
                ))}
                <div style={styles.dropdownDivider} />
                <button
                  style={styles.dropdownNewView}
                  onClick={() => {
                    setDropdownOpen(false);
                    onOpenCustomView();
                  }}
                  onMouseEnter={(event) => {
                    event.currentTarget.style.backgroundColor = "#f9fafb";
                  }}
                  onMouseLeave={(event) => {
                    event.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  <Plus size={16} style={{ color: "#156372" }} />
                  <span>New Custom View</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <div style={styles.headerRight}>
          <button
            style={styles.newButton}
            onClick={() => navigate("/purchases/purchase-orders/new")}
            onMouseEnter={(event) => {
              event.currentTarget.style.backgroundColor = "#0D4A52";
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.backgroundColor = "#156372";
            }}
          >
            <Plus size={16} />
            New
          </button>

          <div style={{ position: "relative" }} ref={moreMenuRef}>
            <button
              style={styles.moreButton}
              onClick={() => setMoreMenuOpen((current) => !current)}
              onMouseEnter={(event) => {
                event.currentTarget.style.backgroundColor = "#e5e7eb";
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.backgroundColor = "#f3f4f6";
              }}
            >
              <MoreVertical size={18} />
            </button>

            {moreMenuOpen && (
              <div style={styles.moreDropdown}>
                <div style={{ position: "relative" }}>
                  <button
                    style={{
                      ...styles.moreDropdownItem,
                      ...styles.moreDropdownItemHighlighted,
                    }}
                    onMouseEnter={(event) => {
                      event.currentTarget.style.backgroundColor = "#0D4A52";
                      setShowSortSubmenu(true);
                    }}
                    onMouseLeave={(event) => {
                      event.currentTarget.style.backgroundColor = "#156372";
                    }}
                    onClick={() => setShowSortSubmenu((current) => !current)}
                  >
                    <ArrowUpDown size={16} style={styles.moreDropdownItemIcon} />
                    <span style={styles.moreDropdownItemText}>Sort by</span>
                    <ChevronRight size={16} style={styles.moreDropdownItemChevron} />
                  </button>

                  {showSortSubmenu && (
                    <div
                      style={{
                        position: "absolute",
                        left: "-180px",
                        top: 0,
                        width: "170px",
                        backgroundColor: "#ffffff",
                        borderRadius: "8px",
                        boxShadow: "0 4px 16px rgba(0, 0, 0, 0.15)",
                        border: "1px solid #e5e7eb",
                        zIndex: 1001,
                        overflow: "hidden",
                      }}
                      onMouseLeave={() => setShowSortSubmenu(false)}
                    >
                      {PURCHASE_ORDER_SORT_OPTIONS.map((option) => (
                        <button
                          key={option.key}
                          style={{
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "10px 14px",
                            fontSize: "13px",
                            color: sortField === option.key ? "#ffffff" : "#374151",
                            backgroundColor:
                              sortField === option.key ? "#156372" : "transparent",
                            border: "none",
                            cursor: "pointer",
                            textAlign: "left",
                            transition: "background-color 0.15s ease",
                          }}
                          onMouseEnter={(event) => {
                            if (sortField !== option.key) {
                              event.currentTarget.style.backgroundColor = "#f3f4f6";
                            }
                          }}
                          onMouseLeave={(event) => {
                            if (sortField !== option.key) {
                              event.currentTarget.style.backgroundColor = "transparent";
                            }
                          }}
                          onClick={() => {
                            onSortChange(option.key);
                            setShowSortSubmenu(false);
                            setMoreMenuOpen(false);
                          }}
                        >
                          <span>{option.label}</span>
                          {sortField === option.key && (
                            <ChevronUp
                              size={14}
                              style={{
                                transform:
                                  sortDirection === "desc"
                                    ? "rotate(180deg)"
                                    : "rotate(0deg)",
                                transition: "transform 0.2s ease",
                              }}
                            />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  style={styles.moreDropdownItem}
                  onMouseEnter={(event) => {
                    event.currentTarget.style.backgroundColor = "#f9fafb";
                  }}
                  onMouseLeave={(event) => {
                    event.currentTarget.style.backgroundColor = "transparent";
                  }}
                  onClick={() => {
                    setMoreMenuOpen(false);
                    onOpenSearch();
                  }}
                >
                  <Search size={16} style={styles.moreDropdownItemIcon} />
                  <span style={styles.moreDropdownItemText}>Search items</span>
                </button>

                <div style={{ position: "relative" }}>
                  <button
                    style={{
                      ...styles.moreDropdownItem,
                      justifyContent: "space-between",
                      backgroundColor: importSubmenuOpen ? "#eff6ff" : "transparent",
                      borderLeft: importSubmenuOpen
                        ? "3px solid #156372"
                        : "3px solid transparent",
                      paddingLeft: importSubmenuOpen ? "13px" : "16px",
                      color: importSubmenuOpen ? "#156372" : "#374151",
                    }}
                    onClick={(event) => {
                      event.stopPropagation();
                      setImportSubmenuOpen((current) => !current);
                      setExportSubmenuOpen(false);
                      setShowSortSubmenu(false);
                    }}
                    onMouseEnter={(event) => {
                      if (!importSubmenuOpen) {
                        event.currentTarget.style.backgroundColor = "#f9fafb";
                      }
                    }}
                    onMouseLeave={(event) => {
                      event.currentTarget.style.backgroundColor = importSubmenuOpen
                        ? "#eff6ff"
                        : "transparent";
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <Download
                        size={16}
                        style={{ color: importSubmenuOpen ? "#156372" : "#6b7280" }}
                      />
                      <span style={styles.moreDropdownItemText}>Import</span>
                    </div>
                    <ChevronRight
                      size={12}
                      style={{ color: importSubmenuOpen ? "#156372" : "#6b7280" }}
                    />
                  </button>

                  {importSubmenuOpen && (
                    <div
                      style={{
                        position: "absolute",
                        top: 0,
                        right: "100%",
                        marginRight: "8px",
                        backgroundColor: "#fff",
                        borderRadius: "6px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                        minWidth: "220px",
                        border: "1px solid #e5e7eb",
                        zIndex: 1001,
                        padding: "4px 0",
                      }}
                    >
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          setImportSubmenuOpen(false);
                          setMoreMenuOpen(false);
                          navigate("/purchases/purchase-orders/import");
                        }}
                        style={{
                          width: "100%",
                          padding: "10px 16px",
                          fontSize: "14px",
                          color: "#111827",
                          cursor: "pointer",
                          border: "none",
                          background: "none",
                          textAlign: "left",
                        }}
                        onMouseEnter={(event) => {
                          event.currentTarget.style.backgroundColor = "#eff6ff";
                        }}
                        onMouseLeave={(event) => {
                          event.currentTarget.style.backgroundColor = "transparent";
                        }}
                      >
                        Import Purchase Orders
                      </button>
                    </div>
                  )}
                </div>

                <div style={{ position: "relative" }}>
                  <button
                    style={{
                      ...styles.moreDropdownItem,
                      justifyContent: "space-between",
                      backgroundColor: exportSubmenuOpen ? "#eff6ff" : "transparent",
                      borderLeft: exportSubmenuOpen
                        ? "3px solid #156372"
                        : "3px solid transparent",
                      paddingLeft: exportSubmenuOpen ? "13px" : "16px",
                      color: exportSubmenuOpen ? "#156372" : "#374151",
                    }}
                    onClick={(event) => {
                      event.stopPropagation();
                      setExportSubmenuOpen((current) => !current);
                      setImportSubmenuOpen(false);
                      setShowSortSubmenu(false);
                    }}
                    onMouseEnter={(event) => {
                      if (!exportSubmenuOpen) {
                        event.currentTarget.style.backgroundColor = "#f9fafb";
                      }
                    }}
                    onMouseLeave={(event) => {
                      event.currentTarget.style.backgroundColor = exportSubmenuOpen
                        ? "#eff6ff"
                        : "transparent";
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <Upload
                        size={16}
                        style={{ color: exportSubmenuOpen ? "#156372" : "#6b7280" }}
                      />
                      <span style={styles.moreDropdownItemText}>Export</span>
                    </div>
                    <ChevronRight
                      size={12}
                      style={{ color: exportSubmenuOpen ? "#156372" : "#6b7280" }}
                    />
                  </button>

                  {exportSubmenuOpen && (
                    <div
                      style={{
                        position: "absolute",
                        top: 0,
                        right: "100%",
                        marginRight: "8px",
                        backgroundColor: "#fff",
                        borderRadius: "6px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                        minWidth: "220px",
                        border: "1px solid #e5e7eb",
                        zIndex: 1001,
                        padding: "4px 0",
                      }}
                    >
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          setExportSubmenuOpen(false);
                          setMoreMenuOpen(false);
                          onOpenExport("purchase-orders");
                        }}
                        style={{
                          width: "100%",
                          padding: "10px 16px",
                          fontSize: "14px",
                          color: "#111827",
                          cursor: "pointer",
                          border: "none",
                          background: "none",
                          textAlign: "left",
                        }}
                        onMouseEnter={(event) => {
                          event.currentTarget.style.backgroundColor = "#eff6ff";
                        }}
                        onMouseLeave={(event) => {
                          event.currentTarget.style.backgroundColor = "transparent";
                        }}
                      >
                        Export Purchase Orders
                      </button>
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          setExportSubmenuOpen(false);
                          setMoreMenuOpen(false);
                          onOpenExport("current-view");
                        }}
                        style={{
                          width: "100%",
                          padding: "10px 16px",
                          fontSize: "14px",
                          color: "#111827",
                          cursor: "pointer",
                          border: "none",
                          background: "none",
                          textAlign: "left",
                        }}
                        onMouseEnter={(event) => {
                          event.currentTarget.style.backgroundColor = "#eff6ff";
                        }}
                        onMouseLeave={(event) => {
                          event.currentTarget.style.backgroundColor = "transparent";
                        }}
                      >
                        Export Current View
                      </button>
                    </div>
                  )}
                </div>

                <button
                  style={styles.moreDropdownItem}
                  onMouseEnter={(event) => {
                    event.currentTarget.style.backgroundColor = "#f9fafb";
                  }}
                  onMouseLeave={(event) => {
                    event.currentTarget.style.backgroundColor = "transparent";
                  }}
                  onClick={() => {
                    setMoreMenuOpen(false);
                    navigate("/settings/purchase-orders");
                  }}
                >
                  <Settings size={16} style={styles.moreDropdownItemIcon} />
                  <span style={styles.moreDropdownItemText}>Preferences</span>
                </button>

                <button
                  style={styles.moreDropdownItem}
                  onMouseEnter={(event) => {
                    event.currentTarget.style.backgroundColor = "#f9fafb";
                  }}
                  onMouseLeave={(event) => {
                    event.currentTarget.style.backgroundColor = "transparent";
                  }}
                  onClick={() => {
                    setMoreMenuOpen(false);
                    onRefresh();
                  }}
                  disabled={isRefreshing}
                >
                  <RefreshCw
                    size={16}
                    style={{
                      ...styles.moreDropdownItemIcon,
                      animation: isRefreshing ? "spin 1s linear infinite" : "none",
                    }}
                  />
                  <span style={styles.moreDropdownItemText}>Refresh List</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
