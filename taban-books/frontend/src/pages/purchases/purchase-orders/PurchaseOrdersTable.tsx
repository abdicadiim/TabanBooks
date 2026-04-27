// @ts-nocheck
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { AlignLeft, Columns3, Search, SlidersHorizontal } from "lucide-react";
import { formatPurchaseOrderDate, parsePurchaseOrderDate } from "./PurchaseOrders.utils";

export default function PurchaseOrdersTable({
  displayCurrencySymbol,
  isRefreshing,
  onOpenCustomizeColumns,
  onOpenSearch,
  orders,
  selectedOrders,
  setSelectedOrders,
  styles,
  visibleColumns,
  visibleOrderIds,
}) {
  const navigate = useNavigate();
  const tableToolsRef = useRef(null);
  const tableToolsButtonRef = useRef(null);
  const [isTableToolsOpen, setIsTableToolsOpen] = useState(false);
  const [isClipTextEnabled, setIsClipTextEnabled] = useState(false);
  const [tableToolsMenuPosition, setTableToolsMenuPosition] = useState({
    top: 0,
    left: 0,
  });

  const areAllVisibleOrdersSelected =
    visibleOrderIds.length > 0 &&
    visibleOrderIds.every((orderId) => selectedOrders.includes(orderId));

  useEffect(() => {
    if (!isTableToolsOpen) {
      return undefined;
    }

    const handleClickOutside = (event) => {
      if (tableToolsRef.current && !tableToolsRef.current.contains(event.target)) {
        setIsTableToolsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isTableToolsOpen]);

  useEffect(() => {
    if (!isTableToolsOpen || !tableToolsButtonRef.current) {
      return undefined;
    }

    const updateMenuPosition = () => {
      if (!tableToolsButtonRef.current) {
        return;
      }

      const rect = tableToolsButtonRef.current.getBoundingClientRect();
      setTableToolsMenuPosition({
        top: rect.bottom + 8,
        left: rect.left,
      });
    };

    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);

    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [isTableToolsOpen]);

  const getStatusStyle = (status: string) => {
    const normalizedStatus = String(status ?? "").trim().toUpperCase();

    if (normalizedStatus === "DRAFT") {
      return styles.statusDraft;
    }

    if (normalizedStatus === "CLOSED") {
      return styles.statusClosed;
    }

    return styles.statusIssued;
  };

  const getDeliveryDateMeta = (order: any) => {
    const billedStatus = String(order.billedStatus ?? "").trim().toUpperCase();
    if (billedStatus === "BILLED") {
      return null;
    }

    const rawDate = order.deliveryDate || order.expectedDate;
    if (!rawDate) {
      return null;
    }

    const deliveryDate = parsePurchaseOrderDate(rawDate);
    if (!deliveryDate) {
      return null;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    deliveryDate.setHours(0, 0, 0, 0);

    if (deliveryDate.getTime() < today.getTime()) {
      const diffInMs = today.getTime() - deliveryDate.getTime();
      const diffInDays = Math.max(1, Math.round(diffInMs / (1000 * 60 * 60 * 24)));
      return {
        label: `Overdue by ${diffInDays} day${diffInDays === 1 ? "" : "s"}`,
        color: "#f97316",
      };
    }

    if (deliveryDate.getTime() === today.getTime()) {
      return { label: "Due Today", color: "#4f46e5" };
    }

    return null;
  };

  const isColumnVisible = (key: string) => visibleColumns.includes(key);
  const checkboxAlignmentOffset = 26;
  const clipTextStyle = isClipTextEnabled
    ? {
        display: "inline-block",
        maxWidth: "180px",
        overflow: "hidden",
        textOverflow: "ellipsis",
        verticalAlign: "bottom",
      }
    : undefined;

  const getLocationText = (order: any) =>
    order.locationName ||
    order.location ||
    order.locationLabel ||
    order.branchName ||
    "";

  const getCompanyNameText = (order: any) =>
    order.companyName || order.vendorCompanyName || order.company || "";

  const getLocationCodeText = (order: any) =>
    order.locationCode || order.branchCode || "";

  const getReceivedText = (order: any) => {
    if (typeof order.received === "boolean") {
      return order.received ? "Yes" : "No";
    }
    return order.receivedStatus || "";
  };

  return (
    <div style={styles.content}>
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead style={styles.tableHeader}>
            <tr>
              <th
                style={{
                  ...styles.tableHeaderCellWithCheckbox,
                  width: "72px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    whiteSpace: "nowrap",
                  }}
                >
                  <div style={{ position: "relative" }} ref={tableToolsRef}>
                    <button
                      ref={tableToolsButtonRef}
                      type="button"
                      aria-label="Purchase order table options"
                      onClick={() => setIsTableToolsOpen((current) => !current)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "20px",
                        height: "20px",
                        padding: 0,
                        border: "none",
                        borderRadius: "4px",
                        backgroundColor: "transparent",
                        color: "#156372",
                        cursor: "pointer",
                      }}
                      onMouseEnter={(event) => {
                        event.currentTarget.style.backgroundColor = "#f0fdfa";
                      }}
                      onMouseLeave={(event) => {
                        event.currentTarget.style.backgroundColor = "transparent";
                      }}
                      title="Table Options"
                    >
                      <SlidersHorizontal size={14} />
                    </button>

                    {isTableToolsOpen &&
                      typeof document !== "undefined" &&
                      createPortal(
                        <div
                          style={{
                            position: "fixed",
                            top: tableToolsMenuPosition.top,
                            left: tableToolsMenuPosition.left,
                            width: "190px",
                            backgroundColor: "#ffffff",
                            border: "1px solid #e5e7eb",
                            borderRadius: "12px",
                            boxShadow: "0 12px 30px rgba(15, 23, 42, 0.16)",
                            overflow: "hidden",
                            zIndex: 60,
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setIsTableToolsOpen(false);
                              onOpenCustomizeColumns();
                            }}
                            style={{
                              width: "100%",
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              padding: "12px 14px",
                              border: "none",
                              cursor: "pointer",
                              backgroundColor: "#156372",
                              color: "#ffffff",
                              fontSize: "14px",
                              fontWeight: "600",
                              whiteSpace: "nowrap",
                            }}
                          >
                            <Columns3 size={16} />
                            Customize Columns
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsClipTextEnabled((current) => !current);
                              setIsTableToolsOpen(false);
                            }}
                            style={{
                              width: "100%",
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              padding: "12px 14px",
                              border: "none",
                              cursor: "pointer",
                              backgroundColor: "#ffffff",
                              color: "#6b7280",
                              fontSize: "14px",
                              fontWeight: "500",
                              borderTop: "1px solid #f3f4f6",
                            }}
                          >
                            <AlignLeft size={16} style={{ color: "#3b82f6" }} />
                            Clip Text
                          </button>
                        </div>,
                        document.body
                      )}
                  </div>

                  <input
                    type="checkbox"
                    checked={areAllVisibleOrdersSelected}
                    onChange={(event) => {
                      if (event.target.checked) {
                        setSelectedOrders(visibleOrderIds);
                      } else {
                        setSelectedOrders([]);
                      }
                    }}
                    style={styles.tableCheckbox}
                  />
                </div>
              </th>
              {isColumnVisible("date") && <th style={styles.tableHeaderCell}>DATE</th>}
              {isColumnVisible("location") && <th style={styles.tableHeaderCell}>LOCATION</th>}
              {isColumnVisible("purchaseOrderNumber") && (
                <th style={styles.tableHeaderCell}>PURCHASE ORDER#</th>
              )}
              {isColumnVisible("referenceNumber") && (
                <th style={styles.tableHeaderCell}>REFERENCE#</th>
              )}
              {isColumnVisible("vendorName") && <th style={styles.tableHeaderCell}>VENDOR NAME</th>}
              {isColumnVisible("status") && <th style={styles.tableHeaderCell}>STATUS</th>}
              {isColumnVisible("billedStatus") && (
                <th style={styles.tableHeaderCell}>BILLED STATUS</th>
              )}
              {isColumnVisible("amount") && <th style={styles.tableHeaderCell}>AMOUNT</th>}
              {isColumnVisible("deliveryDate") && (
                <th style={styles.tableHeaderCell}>DELIVERY DATE</th>
              )}
              {isColumnVisible("companyName") && (
                <th style={styles.tableHeaderCell}>COMPANY NAME</th>
              )}
              {isColumnVisible("expectedDeliveryDate") && (
                <th style={styles.tableHeaderCell}>EXPECTED DELIVERY DATE</th>
              )}
              {isColumnVisible("locationCode") && (
                <th style={styles.tableHeaderCell}>LOCATION CODE</th>
              )}
              {isColumnVisible("received") && <th style={styles.tableHeaderCell}>RECEIVED</th>}
              <th
                style={{
                  ...styles.tableHeaderCell,
                  width: "50px",
                  padding: "8px 10px 8px 8px",
                  textAlign: "center",
                }}
              >
                <button
                  onClick={onOpenSearch}
                  style={{
                    padding: "6px",
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "#374151",
                    backgroundColor: "#ffffff",
                    border: "1px solid #dbe3ef",
                    borderRadius: "6px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "32px",
                    height: "32px",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(event) => {
                    event.currentTarget.style.backgroundColor = "#f9fafb";
                    event.currentTarget.style.borderColor = "#9ca3af";
                  }}
                  onMouseLeave={(event) => {
                    event.currentTarget.style.backgroundColor = "#ffffff";
                    event.currentTarget.style.borderColor = "#d1d5db";
                  }}
                  title="Open Search View"
                >
                  <Search size={16} style={{ color: "#6b7280" }} />
                </button>
              </th>
            </tr>
          </thead>

          <tbody>
            {isRefreshing
              ? Array.from({ length: 5 }).map((_, index) => (
                  <tr key={`skeleton-${index}`} style={styles.tableRow}>
                    <td style={styles.tableCell}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div
                          style={{
                            width: `${checkboxAlignmentOffset}px`,
                            flexShrink: 0,
                          }}
                        />
                        <div style={styles.skeletonCheckbox} />
                      </div>
                    </td>
                    {isColumnVisible("date") && (
                      <td style={styles.tableCell}>
                        <div style={{ ...styles.skeletonCell, width: "80px" }} />
                      </td>
                    )}
                    {isColumnVisible("location") && (
                      <td style={styles.tableCell}>
                        <div style={{ ...styles.skeletonCell, width: "110px" }} />
                      </td>
                    )}
                    {isColumnVisible("purchaseOrderNumber") && (
                      <td style={styles.tableCell}>
                        <div style={{ ...styles.skeletonCell, width: "100px" }} />
                      </td>
                    )}
                    {isColumnVisible("referenceNumber") && (
                      <td style={styles.tableCell}>
                        <div style={{ ...styles.skeletonCell, width: "80px" }} />
                      </td>
                    )}
                    {isColumnVisible("vendorName") && (
                      <td style={styles.tableCell}>
                        <div style={{ ...styles.skeletonCell, width: "120px" }} />
                      </td>
                    )}
                    {isColumnVisible("status") && (
                      <td style={styles.tableCell}>
                        <div style={{ ...styles.skeletonCell, width: "70px" }} />
                      </td>
                    )}
                    {isColumnVisible("billedStatus") && (
                      <td style={styles.tableCell}>
                        <div style={{ ...styles.skeletonCell, width: "80px" }} />
                      </td>
                    )}
                    {isColumnVisible("amount") && (
                      <td style={styles.tableCell}>
                        <div style={{ ...styles.skeletonCell, width: "90px" }} />
                      </td>
                    )}
                    {isColumnVisible("deliveryDate") && (
                      <td style={styles.tableCell}>
                        <div style={{ ...styles.skeletonCell, width: "80px" }} />
                      </td>
                    )}
                    {isColumnVisible("companyName") && (
                      <td style={styles.tableCell}>
                        <div style={{ ...styles.skeletonCell, width: "120px" }} />
                      </td>
                    )}
                    {isColumnVisible("expectedDeliveryDate") && (
                      <td style={styles.tableCell}>
                        <div style={{ ...styles.skeletonCell, width: "100px" }} />
                      </td>
                    )}
                    {isColumnVisible("locationCode") && (
                      <td style={styles.tableCell}>
                        <div style={{ ...styles.skeletonCell, width: "90px" }} />
                      </td>
                    )}
                    {isColumnVisible("received") && (
                      <td style={styles.tableCell}>
                        <div style={{ ...styles.skeletonCell, width: "60px" }} />
                      </td>
                    )}
                    <td style={styles.tableCell} />
                  </tr>
                ))
              : orders.map((order) => {
                  const deliveryDateMeta = getDeliveryDateMeta(order);

                  return (
                    <tr
                      key={order.id}
                      style={{
                        ...styles.tableRow,
                        ...(selectedOrders.includes(order.id)
                          ? { backgroundColor: "#eff6ff" }
                          : {}),
                      }}
                      onClick={(event) => {
                        const clickedCheckbox =
                          event.target instanceof HTMLInputElement &&
                          event.target.type === "checkbox";

                        if (!clickedCheckbox && selectedOrders.length === 0) {
                          navigate(`/purchases/purchase-orders/${order.id}`, {
                            state: { purchaseOrder: order },
                          });
                        }
                      }}
                      onMouseEnter={(event) => {
                        if (!selectedOrders.includes(order.id)) {
                          event.currentTarget.style.backgroundColor = "#fafcff";
                        }
                      }}
                      onMouseLeave={(event) => {
                        if (!selectedOrders.includes(order.id)) {
                          event.currentTarget.style.backgroundColor = "transparent";
                        }
                      }}
                    >
                      <td style={styles.tableCell} onClick={(event) => event.stopPropagation()}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "flex-start",
                            gap: "10px",
                          }}
                        >
                          <div
                            style={{
                              width: `${checkboxAlignmentOffset}px`,
                              flexShrink: 0,
                            }}
                          />
                          <input
                            type="checkbox"
                            checked={selectedOrders.includes(order.id)}
                            onChange={(event) => {
                              if (event.target.checked) {
                                setSelectedOrders([...selectedOrders, order.id]);
                              } else {
                                setSelectedOrders(
                                  selectedOrders.filter(
                                    (selectedId) => selectedId !== order.id
                                  )
                                );
                              }
                            }}
                            style={{
                              ...styles.tableCheckbox,
                              marginLeft: "-4px",
                            }}
                          />
                        </div>
                      </td>
                      {isColumnVisible("date") && (
                        <td style={styles.tableCell}>
                          <span style={clipTextStyle}>
                            {formatPurchaseOrderDate(order.date)}
                          </span>
                        </td>
                      )}
                      {isColumnVisible("location") && (
                        <td style={styles.tableCell}>
                          <span style={clipTextStyle}>{getLocationText(order)}</span>
                        </td>
                      )}
                      {isColumnVisible("purchaseOrderNumber") && (
                        <td style={styles.tableCell}>
                          <a
                            href="#"
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              navigate(`/purchases/purchase-orders/${order.id}`, {
                                state: { purchaseOrder: order },
                              });
                            }}
                            style={styles.purchaseOrderLink}
                          >
                            <span style={clipTextStyle}>{order.purchaseOrderNumber}</span>
                          </a>
                        </td>
                      )}
                      {isColumnVisible("referenceNumber") && (
                        <td style={styles.tableCell}>
                          <span style={clipTextStyle}>{order.referenceNumber}</span>
                        </td>
                      )}
                      {isColumnVisible("vendorName") && (
                        <td style={styles.tableCell}>
                          <span style={clipTextStyle}>
                            {order.vendorName ||
                              (order.vendor &&
                                (order.vendor.name || order.vendor.displayName)) ||
                              ""}
                          </span>
                        </td>
                      )}
                      {isColumnVisible("status") && (
                        <td style={styles.tableCell}>
                          <span style={getStatusStyle(order.status)}>{order.status}</span>
                        </td>
                      )}
                      {isColumnVisible("billedStatus") && (
                        <td style={styles.tableCell}>
                          <span
                            style={
                              String(order.billedStatus ?? "").trim().toUpperCase() ===
                              "BILLED"
                                ? styles.billedStatusBilled
                                : styles.billedStatusYetToBeBilled
                            }
                          >
                            {order.billedStatus || "YET TO BE BILLED"}
                          </span>
                        </td>
                      )}
                      {isColumnVisible("amount") && (
                        <td
                          style={{
                            ...styles.tableCell,
                            textAlign: "right",
                          }}
                        >
                          <span
                            style={{
                              ...styles.amount,
                              display: "inline-block",
                              minWidth: "120px",
                            }}
                          >
                            <span style={clipTextStyle}>
                              {displayCurrencySymbol}
                              {(order.amount || order.total || 0).toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                          </span>
                        </td>
                      )}
                      {isColumnVisible("deliveryDate") && (
                        <td style={styles.tableCell}>
                          <div>
                            <span style={clipTextStyle}>
                              {formatPurchaseOrderDate(
                                order.deliveryDate || order.expectedDate
                              )}
                            </span>
                            {deliveryDateMeta && (
                              <div
                                style={{
                                  ...styles.overdueText,
                                  color: deliveryDateMeta.color,
                                }}
                              >
                                {deliveryDateMeta.label}
                              </div>
                            )}
                          </div>
                        </td>
                      )}
                      {isColumnVisible("companyName") && (
                        <td style={styles.tableCell}>
                          <span style={clipTextStyle}>{getCompanyNameText(order)}</span>
                        </td>
                      )}
                      {isColumnVisible("expectedDeliveryDate") && (
                        <td style={styles.tableCell}>
                          <span style={clipTextStyle}>
                            {formatPurchaseOrderDate(order.expectedDate)}
                          </span>
                        </td>
                      )}
                      {isColumnVisible("locationCode") && (
                        <td style={styles.tableCell}>
                          <span style={clipTextStyle}>{getLocationCodeText(order)}</span>
                        </td>
                      )}
                      {isColumnVisible("received") && (
                        <td style={styles.tableCell}>
                          <span style={clipTextStyle}>{getReceivedText(order)}</span>
                        </td>
                      )}
                      <td style={styles.tableCell} />
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
