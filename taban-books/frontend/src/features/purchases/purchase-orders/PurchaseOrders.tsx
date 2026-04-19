// @ts-nocheck
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import DeleteConfirmationModal from "../shared/DeleteConfirmationModal";
import SearchPurchaseOrdersModal from "./SearchPurchaseOrdersModal";
import ExportPurchaseOrders from "./ExportPurchaseOrders";
import PurchaseOrdersCustomViewModal from "./PurchaseOrdersCustomViewModal";
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
  sortPurchaseOrders,
} from "./PurchaseOrders.utils";

export default function PurchaseOrders() {
  const navigate = useNavigate();
  const notificationTimeoutRef = useRef(null);
  const { code: baseCurrencyCode, symbol: baseCurrencySymbol } = useCurrency();
  const displayCurrencyCode = baseCurrencyCode || "USD";
  const displayCurrencySymbol = baseCurrencySymbol || displayCurrencyCode;
  const [selectedView, setSelectedView] = useState("All");
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [showCustomViewModal, setShowCustomViewModal] = useState(false);
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

  const handleUpload = () => {
    setShowUploadModal(true);
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
      padding: "24px",
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
      borderRadius: "8px",
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
      padding: "12px 16px",
      textAlign: "left",
      fontSize: "12px",
      fontWeight: "600",
      color: "#6b7280",
      textTransform: "uppercase",
      width: "40px",
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
            onMarkAsIssued={handleMarkAsIssued}
            onMarkAsReceived={handleMarkAsReceived}
            onMarkAsUnreceived={handleMarkAsUnreceived}
            onReopenCancelled={handleReopenCancelled}
            onUpload={handleUpload}
            onViewSelect={handleViewSelect}
            selectedOrdersCount={selectedOrders.length}
          />
        )}

        <PurchaseOrdersTable
          displayCurrencySymbol={displayCurrencySymbol}
          isRefreshing={isRefreshing}
          onOpenSearch={() => setShowSearchModal(true)}
          orders={sortedPurchaseOrders}
          selectedOrders={selectedOrders}
          setSelectedOrders={setSelectedOrders}
          styles={styles}
          visibleOrderIds={filteredPurchaseOrders.map((purchaseOrder) => purchaseOrder.id)}
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
