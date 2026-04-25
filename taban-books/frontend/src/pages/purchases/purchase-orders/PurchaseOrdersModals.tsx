// @ts-nocheck
import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Mail, Printer, Upload, X } from "lucide-react";
import BulkUpdateModal from "../shared/BulkUpdateModal";
import { getPurchaseOrderBulkUpdateFieldOptions } from "./PurchaseOrders.constants";
import { isDraftPurchaseOrder } from "./PurchaseOrders.utils";

export default function PurchaseOrdersModals({
  displayCurrencyCode,
  onBulkCancelItemsConfirm,
  onBulkUpdate,
  onMarkAsIssuedConfirm,
  onMarkAsReceivedConfirm,
  purchaseOrders,
  selectedOrders,
  showBulkCancelItemsModal,
  showBulkUpdateModal,
  showEmailModal,
  showMarkAsIssuedModal,
  showMarkAsReceivedModal,
  showPrintModal,
  showUploadModal,
  setShowBulkCancelItemsModal,
  setShowBulkUpdateModal,
  setShowEmailModal,
  setShowMarkAsIssuedModal,
  setShowMarkAsReceivedModal,
  setShowPrintModal,
  setShowUploadModal,
}) {
  const bulkUpdateFieldOptions = useMemo(
    () => getPurchaseOrderBulkUpdateFieldOptions(displayCurrencyCode),
    [displayCurrencyCode]
  );

  const hasNonDraftOrders = purchaseOrders.some(
    (order) => selectedOrders.includes(order.id) && !isDraftPurchaseOrder(order.status)
  );

  return (
    <>
      <BulkUpdateModal
        isOpen={showBulkUpdateModal}
        onClose={() => setShowBulkUpdateModal(false)}
        title="Bulk Update Purchase Orders"
        fieldOptions={bulkUpdateFieldOptions}
        onUpdate={onBulkUpdate}
        entityName="purchase orders"
      />

      <PrintPurchaseOrdersModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        selectedOrders={selectedOrders}
      />

      <EmailPurchaseOrdersModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        selectedOrders={selectedOrders}
      />

      <ConfirmActionModal
        isOpen={showMarkAsIssuedModal}
        onClose={() => setShowMarkAsIssuedModal(false)}
        title="Mark as Issued"
        confirmLabel="Yes, Mark as Issued"
        onConfirm={onMarkAsIssuedConfirm}
        confirmDisabled={hasNonDraftOrders}
        headerIcon={
          <div style={warningIconWrapperStyle}>
            <AlertTriangle size={18} style={{ color: "#d97706" }} />
          </div>
        }
      >
        {hasNonDraftOrders ? (
          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
            <div style={warningIconWrapperStyle}>
              <AlertTriangle size={18} style={{ color: "#d97706" }} />
            </div>
            <div style={{ flex: 1 }}>
              <p
                style={{
                  fontSize: "14px",
                  color: "#374151",
                  marginBottom: "12px",
                  lineHeight: "1.5",
                  fontWeight: "500",
                }}
              >
                You can only select purchase orders in &apos;DRAFT&apos; status.
              </p>
              <p
                style={{
                  fontSize: "14px",
                  color: "#6b7280",
                  margin: 0,
                  lineHeight: "1.5",
                }}
              >
                Please unselect the other purchase orders and try again.
              </p>
            </div>
          </div>
        ) : (
          <p
            style={{
              fontSize: "14px",
              color: "#374151",
              marginBottom: "24px",
              lineHeight: "1.5",
            }}
          >
            Are you sure about marking the selected purchase orders as issued?
          </p>
        )}
      </ConfirmActionModal>

      <ConfirmActionModal
        isOpen={showMarkAsReceivedModal}
        onClose={() => setShowMarkAsReceivedModal(false)}
        title="Mark as Received"
        confirmLabel="Yes, Mark as Received"
        onConfirm={onMarkAsReceivedConfirm}
      >
        <p
          style={{
            fontSize: "14px",
            color: "#374151",
            marginBottom: "24px",
            lineHeight: "1.5",
          }}
        >
          Are you sure you want to mark the selected purchase orders as received?
        </p>
      </ConfirmActionModal>

      <ConfirmActionModal
        isOpen={showBulkCancelItemsModal}
        onClose={() => setShowBulkCancelItemsModal(false)}
        title="Bulk Cancel Items"
        confirmLabel="Yes, Cancel Items"
        onConfirm={onBulkCancelItemsConfirm}
      >
        <p
          style={{
            fontSize: "14px",
            color: "#374151",
            marginBottom: "24px",
            lineHeight: "1.5",
          }}
        >
          Are you sure you want to cancel the selected purchase order items?
        </p>
      </ConfirmActionModal>

      <UploadPurchaseOrdersModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
      />
    </>
  );
}

function PortalModal({
  children,
  isOpen,
  maxWidth = "500px",
  onClose,
}) {
  if (!isOpen || typeof document === "undefined" || !document.body) {
    return null;
  }

  return createPortal(
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "8px",
          width: "90%",
          maxWidth,
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
          display: "flex",
          flexDirection: "column",
          maxHeight: "90vh",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}

function ConfirmActionModal({
  children,
  confirmDisabled = false,
  confirmLabel,
  headerIcon,
  isOpen,
  onClose,
  onConfirm,
  title,
}) {
  return (
    <PortalModal isOpen={isOpen} onClose={onClose} maxWidth="450px">
      <div
        style={{
          padding: "20px 24px",
          borderBottom: "1px solid #e5e7eb",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {headerIcon}
          <h2
            style={{
              fontSize: "18px",
              fontWeight: "600",
              color: "#111827",
              margin: 0,
            }}
          >
            {title}
          </h2>
        </div>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "4px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <X size={20} style={{ color: "#156372" }} strokeWidth={2} />
        </button>
      </div>

      <div style={{ padding: "24px" }}>{children}</div>

      <div
        style={{
          padding: "16px 24px",
          borderTop: "1px solid #e5e7eb",
          backgroundColor: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: "12px",
        }}
      >
        <button
          onClick={onConfirm}
          disabled={confirmDisabled}
          style={{
            padding: "8px 16px",
            fontSize: "14px",
            fontWeight: "500",
            backgroundColor: confirmDisabled ? "#9ca3af" : "#156372",
            color: "#ffffff",
            borderRadius: "6px",
            border: "none",
            cursor: confirmDisabled ? "not-allowed" : "pointer",
          }}
          onMouseEnter={(event) => {
            if (!confirmDisabled) {
              event.currentTarget.style.backgroundColor = "#0D4A52";
            }
          }}
          onMouseLeave={(event) => {
            if (!confirmDisabled) {
              event.currentTarget.style.backgroundColor = "#156372";
            }
          }}
        >
          {confirmLabel}
        </button>
        <button
          onClick={onClose}
          style={{
            padding: "8px 16px",
            fontSize: "14px",
            fontWeight: "500",
            backgroundColor: "#ffffff",
            color: "#374151",
            borderRadius: "6px",
            border: "1px solid #d1d5db",
            cursor: "pointer",
          }}
          onMouseEnter={(event) => {
            event.currentTarget.style.backgroundColor = "#f9fafb";
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.backgroundColor = "#ffffff";
          }}
        >
          Cancel
        </button>
      </div>
    </PortalModal>
  );
}

function PrintPurchaseOrdersModal({ isOpen, onClose, selectedOrders }) {
  const [printDateRange, setPrintDateRange] = useState({
    startDate: "",
    endDate: "",
  });

  useEffect(() => {
    if (!isOpen) {
      setPrintDateRange({ startDate: "", endDate: "" });
    }
  }, [isOpen]);

  return (
    <PortalModal isOpen={isOpen} onClose={onClose}>
      <div style={modalHeaderStyle}>
        <h2 style={modalTitleStyle}>Print Purchase Orders</h2>
        <ModalCloseButton onClick={onClose} />
      </div>

      <div style={modalBodyStyle}>
        <p style={modalDescriptionStyle}>
          You can print your purchase orders for the selected date range.
        </p>

        <div style={{ marginBottom: "20px" }}>
          <label style={modalFieldLabelStyle}>Start Date</label>
          <input
            type="date"
            value={printDateRange.startDate}
            onChange={(event) =>
              setPrintDateRange((prev) => ({
                ...prev,
                startDate: event.target.value,
              }))
            }
            style={modalInputStyle}
          />
        </div>

        <div style={{ marginBottom: "24px" }}>
          <label style={modalFieldLabelStyle}>End Date</label>
          <input
            type="date"
            value={printDateRange.endDate}
            onChange={(event) =>
              setPrintDateRange((prev) => ({
                ...prev,
                endDate: event.target.value,
              }))
            }
            style={modalInputStyle}
          />
        </div>
      </div>

      <div style={modalFooterStyle}>
        <button
          onClick={() => {
            console.log(
              "Printing purchase orders:",
              printDateRange,
              "Selected orders:",
              selectedOrders
            );
            onClose();
          }}
          style={primaryActionButtonStyle}
          onMouseEnter={(event) => {
            event.currentTarget.style.backgroundColor = "#0D4A52";
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.backgroundColor = "#156372";
          }}
        >
          <Printer size={18} strokeWidth={2} />
          Print Orders
        </button>
        <SecondaryActionButton onClick={onClose}>Cancel</SecondaryActionButton>
      </div>
    </PortalModal>
  );
}

function EmailPurchaseOrdersModal({ isOpen, onClose, selectedOrders }) {
  const [formState, setFormState] = useState({
    email: "",
    subject: "Purchase Order from TABAN ENTERPRISES",
    message: "",
  });

  useEffect(() => {
    if (!isOpen) {
      setFormState({
        email: "",
        subject: "Purchase Order from TABAN ENTERPRISES",
        message: "",
      });
    }
  }, [isOpen]);

  return (
    <PortalModal isOpen={isOpen} onClose={onClose} maxWidth="700px">
      <div style={modalHeaderStyle}>
        <h2 style={modalTitleStyle}>Email Purchase Orders</h2>
        <ModalCloseButton onClick={onClose} />
      </div>

      <div style={modalBodyStyle}>
        <p style={modalDescriptionStyle}>
          Send purchase orders via email to the selected vendors.
        </p>

        <div style={{ marginBottom: "20px" }}>
          <label style={modalFieldLabelStyle}>Send To</label>
          <input
            type="email"
            placeholder="Enter email address"
            value={formState.email}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, email: event.target.value }))
            }
            style={modalInputStyle}
          />
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label style={modalFieldLabelStyle}>Subject</label>
          <input
            type="text"
            placeholder="Purchase Order from TABAN ENTERPRISES"
            value={formState.subject}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, subject: event.target.value }))
            }
            style={modalInputStyle}
          />
        </div>

        <div style={{ marginBottom: "24px" }}>
          <label style={modalFieldLabelStyle}>Message</label>
          <textarea
            rows={6}
            placeholder="Enter your message here..."
            value={formState.message}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, message: event.target.value }))
            }
            style={{
              ...modalInputStyle,
              resize: "vertical",
              fontFamily: "inherit",
            }}
          />
        </div>
      </div>

      <div style={modalFooterStyle}>
        <button
          onClick={() => {
            console.log("Sending email for purchase orders:", selectedOrders, formState);
            onClose();
          }}
          style={primaryActionButtonStyle}
          onMouseEnter={(event) => {
            event.currentTarget.style.backgroundColor = "#0D4A52";
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.backgroundColor = "#156372";
          }}
        >
          <Mail size={18} strokeWidth={2} />
          Send
        </button>
        <SecondaryActionButton onClick={onClose}>Cancel</SecondaryActionButton>
      </div>
    </PortalModal>
  );
}

function UploadPurchaseOrdersModal({ isOpen, onClose }) {
  return (
    <PortalModal isOpen={isOpen} onClose={onClose} maxWidth="600px">
      <div style={modalHeaderStyle}>
        <h2 style={modalTitleStyle}>Upload Purchase Orders</h2>
        <ModalCloseButton onClick={onClose} />
      </div>

      <div style={modalBodyStyle}>
        <p style={modalDescriptionStyle}>
          You can import purchase orders from a CSV or XLS file.
        </p>

        <div
          style={{
            border: "2px dashed #d1d5db",
            borderRadius: "8px",
            padding: "40px",
            textAlign: "center",
            backgroundColor: "#f9fafb",
            cursor: "pointer",
            marginBottom: "24px",
          }}
          onDragOver={(event) => {
            event.preventDefault();
            event.currentTarget.style.borderColor = "#156372";
            event.currentTarget.style.backgroundColor = "#eff6ff";
          }}
          onDragLeave={(event) => {
            event.currentTarget.style.borderColor = "#d1d5db";
            event.currentTarget.style.backgroundColor = "#f9fafb";
          }}
          onDrop={(event) => {
            event.preventDefault();
            event.currentTarget.style.borderColor = "#d1d5db";
            event.currentTarget.style.backgroundColor = "#f9fafb";
            const files = event.dataTransfer.files;
            if (files.length > 0) {
              console.log("Files dropped:", files);
            }
          }}
        >
          <Upload size={48} style={{ color: "#6b7280", marginBottom: "16px" }} />
          <div
            style={{
              fontSize: "16px",
              fontWeight: "500",
              color: "#111827",
              marginBottom: "8px",
            }}
          >
            Drag and drop file to upload
          </div>
          <div
            style={{
              fontSize: "14px",
              color: "#6b7280",
              marginBottom: "16px",
            }}
          >
            or
          </div>
          <button
            type="button"
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.accept = ".csv,.xls,.xlsx";
              input.onchange = (event) => {
                const files = event.target.files;
                if (files && files.length > 0) {
                  console.log("Files selected:", files);
                }
              };
              input.click();
            }}
            style={{
              padding: "8px 16px",
              fontSize: "14px",
              fontWeight: "500",
              backgroundColor: "#156372",
              color: "#ffffff",
              borderRadius: "6px",
              border: "none",
              cursor: "pointer",
            }}
          >
            Choose File
          </button>
          <div
            style={{
              fontSize: "12px",
              color: "#6b7280",
              marginTop: "12px",
            }}
          >
            Maximum File Size: 25 MB - File Format: CSV or XLS
          </div>
        </div>
      </div>

      <div style={modalFooterStyle}>
        <SecondaryActionButton onClick={onClose}>Cancel</SecondaryActionButton>
      </div>
    </PortalModal>
  );
}

function ModalCloseButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "transparent",
        border: "none",
        cursor: "pointer",
        padding: "4px",
        borderRadius: "4px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "24px",
        height: "24px",
      }}
    >
      <X size={16} style={{ color: "#156372" }} strokeWidth={2} />
    </button>
  );
}

function SecondaryActionButton({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 16px",
        fontSize: "14px",
        fontWeight: "500",
        backgroundColor: "#ffffff",
        color: "#374151",
        borderRadius: "6px",
        border: "1px solid #d1d5db",
        cursor: "pointer",
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.backgroundColor = "#f9fafb";
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.backgroundColor = "#ffffff";
      }}
    >
      {children}
    </button>
  );
}

const modalHeaderStyle = {
  padding: "20px 24px",
  borderBottom: "1px solid #e5e7eb",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};

const modalTitleStyle = {
  fontSize: "18px",
  fontWeight: "600",
  color: "#111827",
  margin: 0,
};

const modalBodyStyle = {
  padding: "24px",
  overflowY: "auto",
  flex: 1,
};

const modalDescriptionStyle = {
  fontSize: "14px",
  color: "#6b7280",
  marginBottom: "24px",
  lineHeight: "1.5",
};

const modalFieldLabelStyle = {
  display: "block",
  fontSize: "14px",
  fontWeight: "500",
  color: "#374151",
  marginBottom: "8px",
};

const modalInputStyle = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid #d1d5db",
  borderRadius: "6px",
  fontSize: "14px",
  outline: "none",
  boxSizing: "border-box",
};

const modalFooterStyle = {
  padding: "16px 24px",
  borderTop: "1px solid #e5e7eb",
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: "12px",
};

const primaryActionButtonStyle = {
  padding: "8px 16px",
  fontSize: "14px",
  fontWeight: "500",
  backgroundColor: "#156372",
  color: "#ffffff",
  borderRadius: "6px",
  border: "none",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: "8px",
};

const warningIconWrapperStyle = {
  width: "40px",
  height: "40px",
  borderRadius: "50%",
  backgroundColor: "#fef3c7",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};
