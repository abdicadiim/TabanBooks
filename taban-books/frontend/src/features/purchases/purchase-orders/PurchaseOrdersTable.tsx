// @ts-nocheck
import React from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { formatPurchaseOrderDate } from "./PurchaseOrders.utils";

export default function PurchaseOrdersTable({
  displayCurrencySymbol,
  isRefreshing,
  onOpenSearch,
  orders,
  selectedOrders,
  setSelectedOrders,
  styles,
  visibleOrderIds,
}) {
  const navigate = useNavigate();
  const areAllVisibleOrdersSelected =
    visibleOrderIds.length > 0 &&
    visibleOrderIds.every((orderId) => selectedOrders.includes(orderId));

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

  return (
    <div style={styles.content}>
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead style={styles.tableHeader}>
            <tr>
              <th style={styles.tableHeaderCellWithCheckbox}>
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
              </th>
              <th style={styles.tableHeaderCell}>DATE</th>
              <th style={styles.tableHeaderCell}>PURCHASE ORDER#</th>
              <th style={styles.tableHeaderCell}>REFERENCE#</th>
              <th style={styles.tableHeaderCell}>VENDOR NAME</th>
              <th style={styles.tableHeaderCell}>STATUS</th>
              <th style={styles.tableHeaderCell}>BILLED STATUS</th>
              <th style={styles.tableHeaderCell}>AMOUNT</th>
              <th style={styles.tableHeaderCell}>DELIVERY DATE</th>
              <th
                style={{
                  ...styles.tableHeaderCell,
                  width: "50px",
                  padding: "8px",
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
                    border: "1px solid #d1d5db",
                    borderRadius: "4px",
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
                      <div style={styles.skeletonCheckbox} />
                    </td>
                    <td style={styles.tableCell}>
                      <div style={{ ...styles.skeletonCell, width: "80px" }} />
                    </td>
                    <td style={styles.tableCell}>
                      <div style={{ ...styles.skeletonCell, width: "100px" }} />
                    </td>
                    <td style={styles.tableCell}>
                      <div style={{ ...styles.skeletonCell, width: "80px" }} />
                    </td>
                    <td style={styles.tableCell}>
                      <div style={{ ...styles.skeletonCell, width: "120px" }} />
                    </td>
                    <td style={styles.tableCell}>
                      <div style={{ ...styles.skeletonCell, width: "70px" }} />
                    </td>
                    <td style={styles.tableCell}>
                      <div style={{ ...styles.skeletonCell, width: "80px" }} />
                    </td>
                    <td style={styles.tableCell}>
                      <div style={{ ...styles.skeletonCell, width: "90px" }} />
                    </td>
                    <td style={styles.tableCell}>
                      <div style={{ ...styles.skeletonCell, width: "80px" }} />
                    </td>
                    <td style={styles.tableCell} />
                  </tr>
                ))
              : orders.map((order) => (
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
                        navigate(`/purchases/purchase-orders/${order.id}`);
                      }
                    }}
                    onMouseEnter={(event) => {
                      if (!selectedOrders.includes(order.id)) {
                        event.currentTarget.style.backgroundColor = "#f9fafb";
                      }
                    }}
                    onMouseLeave={(event) => {
                      if (!selectedOrders.includes(order.id)) {
                        event.currentTarget.style.backgroundColor = "transparent";
                      }
                    }}
                  >
                    <td style={styles.tableCell} onClick={(event) => event.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedOrders.includes(order.id)}
                        onChange={(event) => {
                          if (event.target.checked) {
                            setSelectedOrders([...selectedOrders, order.id]);
                          } else {
                            setSelectedOrders(
                              selectedOrders.filter((selectedId) => selectedId !== order.id)
                            );
                          }
                        }}
                        style={styles.tableCheckbox}
                      />
                    </td>
                    <td style={styles.tableCell}>
                      {formatPurchaseOrderDate(order.date)}
                    </td>
                    <td style={styles.tableCell}>
                      <a
                        href="#"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          navigate(`/purchases/purchase-orders/${order.id}`);
                        }}
                        style={styles.purchaseOrderLink}
                      >
                        {order.purchaseOrderNumber}
                      </a>
                    </td>
                    <td style={styles.tableCell}>{order.referenceNumber}</td>
                    <td style={styles.tableCell}>
                      {order.vendorName ||
                        (order.vendor && (order.vendor.name || order.vendor.displayName)) ||
                        ""}
                    </td>
                    <td style={styles.tableCell}>
                      <span style={getStatusStyle(order.status)}>{order.status}</span>
                    </td>
                    <td style={styles.tableCell}>
                      <span
                        style={
                          String(order.billedStatus ?? "").trim().toUpperCase() === "BILLED"
                            ? styles.billedStatusBilled
                            : styles.billedStatusYetToBeBilled
                        }
                      >
                        {order.billedStatus || "YET TO BE BILLED"}
                      </span>
                    </td>
                    <td style={styles.tableCell}>
                      <span style={styles.amount}>
                        {displayCurrencySymbol}
                        {(order.amount || order.total || 0).toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </td>
                    <td style={styles.tableCell}>
                      <div>
                        {formatPurchaseOrderDate(order.deliveryDate || order.expectedDate)}
                        {order.overdue && (
                          <div style={styles.overdueText}>
                            Overdue by {order.overdueDays} days
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={styles.tableCell} />
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
