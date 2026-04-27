import React, { useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle } from "lucide-react";

export default function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  entityName = "item(s)",
  count = 1,
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      await onConfirm();
    } finally {
      setIsSubmitting(false);
    }
  };

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
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "8px",
          width: "90%",
          maxWidth: "500px",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
          position: "relative",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Content */}
        <div style={{ padding: "24px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "16px",
              marginBottom: "24px",
            }}
          >
            {/* Warning Icon */}
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "8px",
                backgroundColor: "#fef3c7",
                border: "2px solid #f59e0b",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                position: "relative",
              }}
            >
              <AlertTriangle
                size={24}
                style={{ color: "#f59e0b" }}
                strokeWidth={2.5}
              />
              {/* Small spark/lightning icon above */}
              <div
                style={{
                  position: "absolute",
                  top: "-4px",
                  right: "-4px",
                  width: "12px",
                  height: "12px",
                  backgroundColor: "#fbbf24",
                  borderRadius: "50%",
                  boxShadow: "0 0 4px rgba(251, 191, 36, 0.6)",
                }}
              />
            </div>

            {/* Warning Message */}
            <div style={{ flex: 1 }}>
              <p
                style={{
                  fontSize: "14px",
                  color: "#111827",
                  margin: 0,
                  lineHeight: "1.5",
                }}
              >
                The selected {entityName} will be deleted and cannot be retrieved later. Are you sure about deleting {count === 1 ? "it" : "them"}?
              </p>
            </div>
          </div>

          {/* Separator */}
          <div
            style={{
              height: "1px",
              backgroundColor: "#156372",
              marginBottom: "16px",
            }}
          />

          {/* Action Buttons */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <button
              onClick={handleConfirm}
              disabled={isSubmitting}
              style={{
                padding: "8px 16px",
                fontSize: "14px",
                fontWeight: "500",
                backgroundColor: isSubmitting ? "#7aaab3" : "#156372",
                color: "#ffffff",
                borderRadius: "6px",
                border: "none",
                cursor: isSubmitting ? "not-allowed" : "pointer",
                opacity: isSubmitting ? 0.8 : 1,
              }}
              onMouseEnter={(e) => {
                if (!isSubmitting) {
                  e.target.style.backgroundColor = "#0D4A52";
                }
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = isSubmitting ? "#7aaab3" : "#156372";
              }}
            >
              {isSubmitting ? "Deleting..." : "Delete"}
            </button>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: "8px 16px",
                fontSize: "14px",
                fontWeight: "500",
                backgroundColor: "#ffffff",
                color: "#374151",
                borderRadius: "6px",
                border: "1px solid #d1d5db",
                cursor: isSubmitting ? "not-allowed" : "pointer",
                opacity: isSubmitting ? 0.7 : 1,
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = "#f9fafb";
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = "#ffffff";
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

