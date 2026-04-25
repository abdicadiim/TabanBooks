// @ts-nocheck
import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { jsPDF } from "jspdf";
import DeleteConfirmationModal from "../shared/DeleteConfirmationModal";
import SearchPurchaseOrdersModal from "./SearchPurchaseOrdersModal";
import ExportPurchaseOrders from "./ExportPurchaseOrders";
import PurchaseOrdersCustomViewModal from "./PurchaseOrdersCustomViewModal";
import PurchaseOrdersCustomizeColumnsModal from "./PurchaseOrdersCustomizeColumnsModal";
import PurchaseOrdersHeader from "./PurchaseOrdersHeader";
import PurchaseOrdersModals from "./PurchaseOrdersModals";
import PurchaseOrdersNotification from "./PurchaseOrdersNotification";
import PurchaseOrdersSelectionBar from "./PurchaseOrdersSelectionBar";
import PurchaseOrdersTable from "./PurchaseOrdersTable";
import { purchaseOrdersAPI } from "../../../services/api";
import { useCurrency } from "../../../hooks/useCurrency";
import {
  buildPurchaseOrderBulkUpdatePayload,
  filterPurchaseOrdersByView,
  formatPurchaseOrderDate,
  sortPurchaseOrders,
} from "./PurchaseOrders.utils";

const PURCHASE_ORDER_COLUMNS_STORAGE_KEY = "purchase-orders-visible-columns";
const PURCHASE_ORDERS_CACHE_KEY = "purchase-orders-cache";
const PURCHASE_ORDER_COLUMN_OPTIONS = [
  { key: "date", label: "Date", locked: true },
  { key: "location", label: "Location" },
  { key: "purchaseOrderNumber", label: "Purchase Order#" },
  { key: "referenceNumber", label: "Reference#" },
  { key: "vendorName", label: "Vendor Name" },
  { key: "status", label: "Status" },
  { key: "billedStatus", label: "Billed Status" },
  { key: "amount", label: "Amount" },
  { key: "deliveryDate", label: "Delivery Date" },
  { key: "companyName", label: "Company Name" },
  { key: "expectedDeliveryDate", label: "Expected Delivery Date" },
  { key: "locationCode", label: "Location Code" },
  { key: "received", label: "Received" },
];

const DEFAULT_VISIBLE_COLUMNS = [
  "date",
  "purchaseOrderNumber",
  "referenceNumber",
  "vendorName",
  "status",
  "billedStatus",
  "amount",
  "deliveryDate",
];

export default function PurchaseOrders() {
  const navigate = useNavigate();
  const location = useLocation();
  const notificationTimeoutRef = useRef(null);
  const { code: baseCurrencyCode, symbol: baseCurrencySymbol } = useCurrency();
  const displayCurrencyCode = baseCurrencyCode || "USD";
  const displayCurrencySymbol = baseCurrencySymbol || displayCurrencyCode;
  const [selectedView, setSelectedView] = useState("All");
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>(() => {
    const stateOrders = location.state?.purchaseOrders;
    if (!Array.isArray(stateOrders)) {
      if (typeof window !== "undefined") {
        try {
          const cachedOrders = window.sessionStorage.getItem(PURCHASE_ORDERS_CACHE_KEY);
          if (cachedOrders) {
            const parsedOrders = JSON.parse(cachedOrders);
            if (Array.isArray(parsedOrders)) {
              return parsedOrders.map((purchaseOrder: any) => ({
                ...purchaseOrder,
                id: purchaseOrder._id || purchaseOrder.id,
              }));
            }
          }
        } catch (error) {
          console.error("Failed to read cached purchase orders:", error);
        }
      }

      return [];
    }

    return stateOrders.map((purchaseOrder: any) => ({
      ...purchaseOrder,
      id: purchaseOrder._id || purchaseOrder.id,
    }));
  });
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [showCustomViewModal, setShowCustomViewModal] = useState(false);
  const [showCustomizeColumnsModal, setShowCustomizeColumnsModal] = useState(false);
  const [showBulkUpdateModal, setShowBulkUpdateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showMarkAsIssuedModal, setShowMarkAsIssuedModal] = useState(false);
  const [showMarkAsReceivedModal, setShowMarkAsReceivedModal] = useState(false);
  const [showBulkCancelItemsModal, setShowBulkCancelItemsModal] = useState(false);
  const [notification, setNotification] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sortField, setSortField] = useState("date");
  const [sortDirection, setSortDirection] = useState("asc");
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportType, setExportType] = useState("purchase-orders");
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    if (typeof window === "undefined") {
      return DEFAULT_VISIBLE_COLUMNS;
    }

    try {
      const rawValue = window.localStorage.getItem(PURCHASE_ORDER_COLUMNS_STORAGE_KEY);
      if (!rawValue) {
        return DEFAULT_VISIBLE_COLUMNS;
      }

      const parsed = JSON.parse(rawValue);
      if (!Array.isArray(parsed)) {
        return DEFAULT_VISIBLE_COLUMNS;
      }

      const allowedKeys = PURCHASE_ORDER_COLUMN_OPTIONS.map((column) => column.key);
      const filtered = parsed.filter((key) => allowedKeys.includes(key));
      return filtered.length > 0 ? Array.from(new Set(filtered)) : DEFAULT_VISIBLE_COLUMNS;
    } catch (error) {
      console.error("Failed to parse purchase order visible columns:", error);
      return DEFAULT_VISIBLE_COLUMNS;
    }
  });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && selectedOrders.length > 0) {
        setSelectedOrders([]);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedOrders.length]);

  useEffect(() => {
    return () => {
      if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current);
      }
    };
  }, []);

  const showNotification = (message: string) => {
    setNotification(message);

    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current);
    }

    notificationTimeoutRef.current = setTimeout(() => {
      setNotification(null);
      notificationTimeoutRef.current = null;
    }, 3000);
  };

  const loadPurchaseOrders = async () => {
    try {
      const response = await purchaseOrdersAPI.getAll();

      if (response && (response.code === 0 || response.success)) {
        const mappedOrders = (response.data || []).map((purchaseOrder: any) => ({
          ...purchaseOrder,
          id: purchaseOrder._id || purchaseOrder.id,
        }));

        setPurchaseOrders(mappedOrders);
      }
    } catch (error) {
      console.error("Error loading purchase orders:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadPurchaseOrders();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      window.sessionStorage.setItem(PURCHASE_ORDERS_CACHE_KEY, JSON.stringify(purchaseOrders));
    } catch (error) {
      console.error("Failed to cache purchase orders:", error);
    }
  }, [purchaseOrders]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      PURCHASE_ORDER_COLUMNS_STORAGE_KEY,
      JSON.stringify(visibleColumns)
    );
  }, [visibleColumns]);

  const updateSelectedOrdersInDatabase = async (updates: Record<string, any>) => {
    if (!selectedOrders.length) {
      return;
    }

    await Promise.all(
      selectedOrders.map((orderId) => purchaseOrdersAPI.update(orderId, updates))
    );

    await loadPurchaseOrders();
    setSelectedOrders([]);
    window.dispatchEvent(new Event("purchaseOrdersUpdated"));
  };

  const deleteSelectedOrdersInDatabase = async () => {
    if (!selectedOrders.length) {
      return;
    }

    await Promise.all(
      selectedOrders.map((orderId) => purchaseOrdersAPI.delete(orderId))
    );

    await loadPurchaseOrders();
    setSelectedOrders([]);
    window.dispatchEvent(new Event("purchaseOrdersUpdated"));
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadPurchaseOrders();
  };

  const handleViewSelect = (view: string) => {
    setSelectedView(view);
    setSelectedOrders([]);
  };

  const handleSortChange = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleDeleteSelected = () => {
    if (selectedOrders.length === 0) {
      alert("Please select at least one purchase order to delete.");
      return;
    }

    setShowDeleteModal(true);
  };

  const handleBulkUpdate = () => {
    if (selectedOrders.length === 0) {
      alert("Please select at least one purchase order to update.");
      return;
    }

    setShowBulkUpdateModal(true);
  };

  const handleExportPdfSelected = () => {
    try {
      if (selectedOrders.length === 0) {
        alert("Please select at least one purchase order to export as PDF.");
        return;
      }

      const selectedPurchaseOrders = purchaseOrders.filter((order) =>
        selectedOrders.includes(String(order.id ?? order._id ?? ""))
      );

      if (selectedPurchaseOrders.length === 0) {
        alert("No selected purchase orders were found.");
        return;
      }

      const pdf = new jsPDF("p", "mm", "a4");
      const margin = 14;
      const pageHeight = pdf.internal.pageSize.getHeight();
      const lineHeight = 7;

      const getVendorName = (order: any) =>
        order.vendorName ||
        order.vendor?.displayName ||
        order.vendor?.name ||
        order.vendor?.vendorName ||
        "";

      const getAmount = (order: any) => {
        const amount = Number.parseFloat(order.amount ?? order.total ?? 0) || 0;
        return `${displayCurrencySymbol}${amount.toFixed(2)}`;
      };

      const truncate = (value: string, maxChars = 90) => {
        const text = String(value ?? "");
        return text.length > maxChars ? `${text.slice(0, maxChars - 3)}...` : text;
      };

      let cursorY = margin;
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(16);
      pdf.text("Purchase Orders", margin, cursorY);
      cursorY += 8;

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.text(`Exported on ${new Date().toLocaleDateString()}`, margin, cursorY);
      cursorY += 12;

      selectedPurchaseOrders.forEach((order: any, index: number) => {
        if (index > 0) {
          cursorY += 4;
          if (cursorY > pageHeight - margin - 40) {
            pdf.addPage();
            cursorY = margin;
          }
        }

        const lines = [
          { label: "Purchase Order", value: order.purchaseOrderNumber || order.purchase_order_number || order.number || "" },
          { label: "Date", value: formatPurchaseOrderDate(order.date) },
          { label: "Reference #", value: order.referenceNumber || order.reference_number || order.reference || "" },
          { label: "Vendor Name", value: getVendorName(order) },
          { label: "Status", value: String(order.status || "") },
          { label: "Billed Status", value: String(order.billedStatus || "") },
          { label: "Amount", value: getAmount(order) },
          { label: "Delivery Date", value: formatPurchaseOrderDate(order.deliveryDate || order.expectedDate) },
        ];

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(12);
        pdf.text(truncate(`Purchase Order: ${lines[0].value}`), margin, cursorY);
        cursorY += 10;

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);
        lines.slice(1).forEach(({ label, value }) => {
          if (cursorY > pageHeight - margin) {
            pdf.addPage();
            cursorY = margin;
          }

          pdf.text(truncate(`${label}: ${value}`, 110), margin, cursorY);
          cursorY += lineHeight;
        });
      });

      const fileName = "purchaseorders.pdf";
      pdf.save(fileName);
    } catch (error) {
      console.error("Failed to download purchase orders PDF:", error);
      alert(`Failed to generate purchase orders PDF. ${error instanceof Error ? error.message : ""}`.trim());
    }
  };

  const handlePrintSelected = () => {
    try {
      if (selectedOrders.length === 0) {
        alert("Please select at least one purchase order to print.");
        return;
      }

      const selectedPurchaseOrders = purchaseOrders.filter((order) =>
        selectedOrders.includes(String(order.id ?? order._id ?? ""))
      );

      if (selectedPurchaseOrders.length === 0) {
        alert("No selected purchase orders were found.");
        return;
      }

      const escapeHtml = (value: any) =>
        String(value ?? "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#39;");

      const getVendorName = (order: any) =>
        order.vendorName ||
        order.vendor?.displayName ||
        order.vendor?.name ||
        order.vendor?.vendorName ||
        "";

      const rowsHtml = selectedPurchaseOrders
        .map((order: any) => {
          const amount = Number.parseFloat(order.amount ?? order.total ?? 0) || 0;
          return `
            <tr>
              <td>${escapeHtml(formatPurchaseOrderDate(order.date))}</td>
              <td>${escapeHtml(order.purchaseOrderNumber || order.purchase_order_number || order.number || "")}</td>
              <td>${escapeHtml(order.referenceNumber || order.reference_number || order.reference || "")}</td>
              <td>${escapeHtml(getVendorName(order))}</td>
              <td>${escapeHtml(order.status || "")}</td>
              <td>${escapeHtml(order.billedStatus || "")}</td>
              <td>${escapeHtml(`${displayCurrencySymbol}${amount.toFixed(2)}`)}</td>
              <td>${escapeHtml(formatPurchaseOrderDate(order.deliveryDate || order.expectedDate))}</td>
            </tr>
          `;
        })
        .join("");

      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      iframe.style.opacity = "0";
      document.body.appendChild(iframe);

      const printHtml = `
        <!doctype html>
        <html>
          <head>
            <title>Purchase Orders Print</title>
            <style>
              @page {
                size: auto;
                margin: 14mm;
              }
              body {
                font-family: Arial, sans-serif;
                color: #111827;
                margin: 0;
                padding: 0;
              }
              .page {
                padding: 0;
              }
              h1 {
                font-size: 18px;
                margin: 0 0 12px;
              }
              .meta {
                font-size: 12px;
                color: #6b7280;
                margin-bottom: 18px;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                font-size: 12px;
              }
              th, td {
                border: 1px solid #d1d5db;
                padding: 8px;
                text-align: left;
                vertical-align: top;
              }
              th {
                background: #f9fafb;
                font-weight: 700;
              }
            </style>
          </head>
          <body>
            <div class="page">
              <h1>Purchase Orders</h1>
              <div class="meta">Printed on ${escapeHtml(new Date().toLocaleString())}</div>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>PO #</th>
                    <th>Reference #</th>
                    <th>Vendor Name</th>
                    <th>Status</th>
                    <th>Billed Status</th>
                    <th>Amount</th>
                    <th>Delivery Date</th>
                  </tr>
                </thead>
                <tbody>
                  ${rowsHtml}
                </tbody>
              </table>
            </div>
          </body>
        </html>
      `;

      const cleanup = () => {
        window.removeEventListener("afterprint", cleanup);
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      };

      iframe.onload = () => {
        const doc = iframe.contentDocument;
        const win = iframe.contentWindow;
        if (!doc || !win) {
          cleanup();
          window.print();
          return;
        }

        doc.open();
        doc.write(printHtml);
        doc.close();

        window.addEventListener("afterprint", cleanup);

        window.setTimeout(() => {
          try {
            win.focus();
            win.print();
          } catch (printError) {
            console.error("Print preview failed:", printError);
            cleanup();
            alert("Failed to open print preview.");
          }
        }, 300);
      };

      iframe.src = "about:blank";
    } catch (error) {
      console.error("Failed to print purchase orders:", error);
      alert("Failed to generate purchase orders print preview.");
    }
  };

  const handleEmailSelected = () => {
    if (selectedOrders.length === 0) {
      alert("Please select at least one purchase order to email.");
      return;
    }

    if (selectedOrders.length > 1) {
      alert("Please select only one purchase order to email at a time.");
      return;
    }

    const selectedOrder = purchaseOrders.find(
      (order) => selectedOrders.includes(String(order.id ?? order._id ?? ""))
    );

    if (!selectedOrder) {
      alert("No selected purchase order was found.");
      return;
    }

    const orderId = String(selectedOrder.id ?? selectedOrder._id ?? "");
    navigate(`/purchases/purchase-orders/${orderId}/email`, {
      state: { purchaseOrder: selectedOrder },
    });
  };

  const handleConvertToBill = () => {
    if (selectedOrders.length === 0) {
      alert("Please select at least one purchase order to convert to bill.");
      return;
    }

    if (selectedOrders.length > 1) {
      alert("Please select only one purchase order to convert to a bill at a time.");
      return;
    }

    const selectedOrder = purchaseOrders.find(
      (order) => order.id === selectedOrders[0] || order._id === selectedOrders[0]
    );

    if (selectedOrder) {
      navigate("/purchases/bills/new", {
        state: {
          fromPurchaseOrder: true,
          purchaseOrder: selectedOrder,
        },
      });
    }
  };

  const handleMarkAsIssued = () => {
    if (selectedOrders.length === 0) {
      alert("Please select at least one purchase order to mark as issued.");
      return;
    }

    setShowMarkAsIssuedModal(true);
  };

  const handleMarkAsReceived = () => {
    if (selectedOrders.length === 0) {
      alert("Please select at least one purchase order to mark as received.");
      return;
    }

    setShowMarkAsReceivedModal(true);
  };

  const handleMarkAsUnreceived = async () => {
    if (selectedOrders.length === 0) {
      alert("Please select at least one purchase order to mark as unreceived.");
      return;
    }

    const count = selectedOrders.length;

    try {
      await updateSelectedOrdersInDatabase({ status: "ISSUED" });
      showNotification(
        count === 1
          ? "Purchase order marked as unreceived successfully."
          : "Purchase orders marked as unreceived successfully."
      );
    } catch (error: any) {
      console.error("Failed to mark purchase orders as unreceived:", error);
      alert(error?.message || "Failed to mark purchase orders as unreceived.");
    }
  };

  const handleBulkCancelItems = () => {
    if (selectedOrders.length === 0) {
      alert("Please select at least one purchase order to cancel.");
      return;
    }

    setShowBulkCancelItemsModal(true);
  };

  const handleClearSelection = () => {
    setSelectedOrders([]);
  };

  const handleBulkUpdateSubmit = async (selectedField: string, fieldValue: string) => {
    const count = selectedOrders.length;

    try {
      await updateSelectedOrdersInDatabase(
        buildPurchaseOrderBulkUpdatePayload(selectedField, fieldValue)
      );
      showNotification(`Successfully updated ${count} purchase order(s)`);
    } catch (error: any) {
      console.error("Bulk update failed for purchase orders:", error);
      alert(error?.message || "Failed to update selected purchase orders.");
    }
  };

  const handleMarkAsIssuedConfirm = async () => {
    const count = selectedOrders.length;

    try {
      await updateSelectedOrdersInDatabase({ status: "ISSUED" });
      showNotification(`Successfully marked ${count} purchase order(s) as issued`);
      setShowMarkAsIssuedModal(false);
    } catch (error: any) {
      console.error("Failed to mark purchase orders as issued:", error);
      alert(error?.message || "Failed to mark selected purchase orders as issued.");
    }
  };

  const handleMarkAsReceivedConfirm = async () => {
    const count = selectedOrders.length;

    try {
      await updateSelectedOrdersInDatabase({ status: "RECEIVED" });
      showNotification(`Successfully marked ${count} purchase order(s) as received`);
      setShowMarkAsReceivedModal(false);
    } catch (error: any) {
      console.error("Failed to mark purchase orders as received:", error);
      alert(error?.message || "Failed to mark selected purchase orders as received.");
    }
  };

  const handleBulkCancelItemsConfirm = async () => {
    const count = selectedOrders.length;

    try {
      await updateSelectedOrdersInDatabase({ status: "CANCELLED" });
      showNotification(`Successfully cancelled ${count} purchase order item(s)`);
      setShowBulkCancelItemsModal(false);
    } catch (error: any) {
      console.error("Failed to cancel selected purchase orders:", error);
      alert(error?.message || "Failed to cancel selected purchase orders.");
    }
  };

  const handleReopenCancelled = async () => {
    const count = selectedOrders.length;

    try {
      await updateSelectedOrdersInDatabase({ status: "ISSUED" });
      showNotification(`Successfully reopened ${count} cancelled purchase order(s)`);
    } catch (error: any) {
      console.error("Failed to reopen cancelled purchase orders:", error);
      alert(error?.message || "Failed to reopen cancelled purchase orders.");
    }
  };

  const handleDeleteConfirmed = async () => {
    const count = selectedOrders.length;

    try {
      await deleteSelectedOrdersInDatabase();
      showNotification(
        `The selected purchase order${count > 1 ? "s have" : " has"} been deleted.`
      );
    } catch (error: any) {
      console.error("Failed to delete selected purchase orders:", error);
      alert(error?.message || "Failed to delete selected purchase orders.");
    }
  };

  const filteredPurchaseOrders = filterPurchaseOrdersByView(purchaseOrders, selectedView);
  const sortedPurchaseOrders = sortPurchaseOrders(
    filteredPurchaseOrders,
    sortField,
    sortDirection
  );

  const styles = {
    container: {
      width: "100%",
      backgroundColor: "#ffffff",
      minHeight: "100vh",
    },
    header: {
      padding: "16px 24px",
      borderBottom: "1px solid #e5e7eb",
      backgroundColor: "#ffffff",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      position: "sticky",
      top: 0,
      zIndex: 20,
    },
    headerContent: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "16px",
      width: "100%",
    },
    headerLeft: {
      display: "flex",
      alignItems: "center",
      gap: "16px",
      flex: 1,
    },
    dropdownWrapper: {
      position: "relative",
      display: "inline-block",
    },
    title: {
      fontSize: "24px",
      fontWeight: "700",
      color: "#111827",
      margin: 0,
      display: "flex",
      alignItems: "center",
      gap: "4px",
    },
    statusText: {
      display: "inline-flex",
      alignItems: "center",
      gap: "4px",
      color: "#111827",
      fontWeight: "700",
    },
    chevronButton: {
      background: "none",
      border: "none",
      padding: 0,
      margin: 0,
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      color: "#156372",
    },
    headerRight: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    newButton: {
      padding: "8px 16px",
      backgroundColor: "#156372",
      color: "#ffffff",
      fontSize: "14px",
      fontWeight: "500",
      borderRadius: "6px",
      border: "none",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "4px",
    },
    moreButton: {
      padding: "8px",
      color: "#6b7280",
      backgroundColor: "#f3f4f6",
      border: "none",
      borderRadius: "6px",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: "36px",
      height: "36px",
    },
    moreDropdown: {
      position: "absolute",
      top: "100%",
      right: 0,
      marginTop: "8px",
      backgroundColor: "#ffffff",
      borderRadius: "8px",
      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
      border: "1px solid #e5e7eb",
      minWidth: "220px",
      zIndex: 100,
      padding: "4px 0",
    },
    moreDropdownItem: {
      display: "flex",
      alignItems: "center",
      padding: "8px 16px",
      fontSize: "14px",
      color: "#111827",
      cursor: "pointer",
      border: "none",
      background: "none",
      width: "100%",
      textAlign: "left",
      gap: "12px",
    },
    moreDropdownItemHighlighted: {
      backgroundColor: "#156372",
      color: "#ffffff",
    },
    moreDropdownItemIcon: {
      width: "16px",
      height: "16px",
      flexShrink: 0,
    },
    moreDropdownItemText: {
      flex: 1,
    },
    moreDropdownItemChevron: {
      width: "16px",
      height: "16px",
      flexShrink: 0,
    },
    iconButton: {
      padding: "8px",
      color: "#6b7280",
      backgroundColor: "transparent",
      border: "none",
      borderRadius: "6px",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: "36px",
      height: "36px",
    },
    dropdown: {
      position: "absolute",
      top: "100%",
      left: 0,
      marginTop: "8px",
      backgroundColor: "#ffffff",
      borderRadius: "8px",
      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
      border: "1px solid #e5e7eb",
      minWidth: "220px",
      zIndex: 100,
      padding: "4px 0",
      maxHeight: "400px",
      overflowY: "auto",
    },
    dropdownItem: {
      padding: "8px 16px",
      fontSize: "14px",
      color: "#111827",
      backgroundColor: "transparent",
      border: "none",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      width: "100%",
      textAlign: "left",
    },
    dropdownItemSelected: {
      backgroundColor: "#eff6ff",
      color: "#111827",
      borderLeft: "3px solid #156372",
      paddingLeft: "13px",
    },
    dropdownItemText: {
      flex: 1,
    },
    dropdownStar: {
      color: "#9ca3af",
      marginLeft: "8px",
    },
    dropdownDivider: {
      height: "1px",
      backgroundColor: "#e5e7eb",
      margin: "4px 0",
    },
    dropdownNewView: {
      padding: "8px 16px",
      fontSize: "14px",
      color: "#111827",
      backgroundColor: "transparent",
      border: "none",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "8px",
      width: "100%",
    },
    content: {
      padding: "24px 0",
    },
    contentHeader: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: "16px",
    },
    contentTitle: {
      fontSize: "24px",
      fontWeight: "700",
      color: "#111827",
      margin: 0,
    },
    filterBar: {
      display: "flex",
      alignItems: "center",
      gap: "12px",
      marginBottom: "16px",
    },
    filterIcon: {
      padding: "8px",
      color: "#6b7280",
      backgroundColor: "transparent",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    tableWrapper: {
      overflowX: "auto",
      border: "1px solid #e5e7eb",
      borderRadius: 0,
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
      minWidth: "1200px",
    },
    tableHeader: {
      backgroundColor: "#f9fafb",
      borderBottom: "1px solid #e5e7eb",
    },
    tableHeaderCell: {
      padding: "12px 16px",
      textAlign: "left",
      fontSize: "12px",
      fontWeight: "600",
      color: "#6b7280",
      textTransform: "uppercase",
      whiteSpace: "nowrap",
    },
    tableHeaderCellWithCheckbox: {
      padding: "12px 8px",
      textAlign: "left",
      fontSize: "12px",
      fontWeight: "600",
      color: "#6b7280",
      textTransform: "uppercase",
      width: "44px",
    },
    tableRow: {
      borderBottom: "1px solid #e5e7eb",
      cursor: "pointer",
    },
    tableCell: {
      padding: "12px 16px",
      fontSize: "14px",
      color: "#111827",
      whiteSpace: "nowrap",
    },
    tableCheckbox: {
      width: "16px",
      height: "16px",
      cursor: "pointer",
    },
    purchaseOrderLink: {
      color: "#156372",
      textDecoration: "none",
      fontWeight: "500",
      cursor: "pointer",
    },
    statusDraft: {
      color: "#6b7280",
      fontSize: "14px",
    },
    statusClosed: {
      color: "#16a34a",
      fontSize: "14px",
    },
    statusIssued: {
      color: "#156372",
      fontSize: "14px",
    },
    billedStatusBilled: {
      color: "#16a34a",
      fontSize: "14px",
      fontWeight: "500",
    },
    billedStatusYetToBeBilled: {
      color: "#f6ad55",
      fontSize: "14px",
      fontWeight: "500",
    },
    amount: {
      fontWeight: "500",
      fontSize: "14px",
    },
    overdueText: {
      color: "#156372",
      fontSize: "12px",
      marginTop: "4px",
    },
    skeletonCell: {
      height: "16px",
      backgroundColor: "#e5e7eb",
      borderRadius: "4px",
      animation: "pulse 1.5s ease-in-out infinite",
    },
    skeletonCheckbox: {
      width: "16px",
      height: "16px",
      backgroundColor: "#e5e7eb",
      borderRadius: "4px",
      animation: "pulse 1.5s ease-in-out infinite",
    },
  };

  return (
    <div style={styles.container}>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `,
        }}
      />

      <div className="w-full flex flex-col">
        {selectedOrders.length === 0 ? (
          <PurchaseOrdersHeader
            isRefreshing={isRefreshing}
            onOpenCustomView={() => setShowCustomViewModal(true)}
            onOpenExport={(type) => {
              setExportType(type);
              setShowExportModal(true);
            }}
            onOpenSearch={() => setShowSearchModal(true)}
            onRefresh={handleRefresh}
            onSortChange={handleSortChange}
            onViewSelect={handleViewSelect}
            selectedView={selectedView}
            sortDirection={sortDirection}
            sortField={sortField}
            styles={styles}
          />
        ) : (
          <PurchaseOrdersSelectionBar
          onBulkCancelItems={handleBulkCancelItems}
          onBulkUpdate={handleBulkUpdate}
          onClearSelection={handleClearSelection}
          onConvertToBill={handleConvertToBill}
          onDeleteSelected={handleDeleteSelected}
          onEmail={handleEmailSelected}
          onExportPdf={handleExportPdfSelected}
          onMarkAsIssued={handleMarkAsIssued}
          onMarkAsReceived={handleMarkAsReceived}
          onMarkAsUnreceived={handleMarkAsUnreceived}
          onReopenCancelled={handleReopenCancelled}
          onPrint={handlePrintSelected}
          onViewSelect={handleViewSelect}
          selectedOrdersCount={selectedOrders.length}
        />
        )}

        <PurchaseOrdersTable
          displayCurrencySymbol={displayCurrencySymbol}
          isRefreshing={isRefreshing}
          onOpenCustomizeColumns={() => setShowCustomizeColumnsModal(true)}
          onOpenSearch={() => setShowSearchModal(true)}
          orders={sortedPurchaseOrders}
          selectedOrders={selectedOrders}
          setSelectedOrders={setSelectedOrders}
          styles={styles}
          visibleOrderIds={filteredPurchaseOrders.map((purchaseOrder) => purchaseOrder.id)}
          visibleColumns={visibleColumns}
        />

        <PurchaseOrdersCustomizeColumnsModal
          open={showCustomizeColumnsModal}
          columns={PURCHASE_ORDER_COLUMN_OPTIONS}
          value={visibleColumns}
          onClose={() => setShowCustomizeColumnsModal(false)}
          onSave={(nextVisibleColumns) => {
            setVisibleColumns(nextVisibleColumns);
            setShowCustomizeColumnsModal(false);
          }}
        />

        {showCustomViewModal && (
          <PurchaseOrdersCustomViewModal
            onClose={() => setShowCustomViewModal(false)}
            onSave={(customView) => {
              console.log("Custom view saved:", customView);
              setShowCustomViewModal(false);
            }}
          />
        )}

        <PurchaseOrdersModals
          displayCurrencyCode={displayCurrencyCode}
          onBulkCancelItemsConfirm={handleBulkCancelItemsConfirm}
          onBulkUpdate={handleBulkUpdateSubmit}
          onMarkAsIssuedConfirm={handleMarkAsIssuedConfirm}
          onMarkAsReceivedConfirm={handleMarkAsReceivedConfirm}
          purchaseOrders={purchaseOrders}
          selectedOrders={selectedOrders}
          setShowBulkCancelItemsModal={setShowBulkCancelItemsModal}
          setShowBulkUpdateModal={setShowBulkUpdateModal}
          setShowEmailModal={setShowEmailModal}
          setShowMarkAsIssuedModal={setShowMarkAsIssuedModal}
          setShowMarkAsReceivedModal={setShowMarkAsReceivedModal}
          setShowPrintModal={setShowPrintModal}
          setShowUploadModal={setShowUploadModal}
          showBulkCancelItemsModal={showBulkCancelItemsModal}
          showBulkUpdateModal={showBulkUpdateModal}
          showEmailModal={showEmailModal}
          showMarkAsIssuedModal={showMarkAsIssuedModal}
          showMarkAsReceivedModal={showMarkAsReceivedModal}
          showPrintModal={showPrintModal}
          showUploadModal={showUploadModal}
        />

        {showExportModal && (
          <ExportPurchaseOrders
            onClose={() => setShowExportModal(false)}
            exportType={exportType}
            data={exportType === "current-view" ? sortedPurchaseOrders : purchaseOrders}
          />
        )}

        <DeleteConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteConfirmed}
          entityName="purchase order(s)"
          count={selectedOrders.length}
        />

        <SearchPurchaseOrdersModal
          isOpen={showSearchModal}
          onClose={() => setShowSearchModal(false)}
          onSearch={(searchData) => {
            console.log("Search data:", searchData);
          }}
        />

        <PurchaseOrdersNotification notification={notification} />
      </div>
    </div>
  );
}
