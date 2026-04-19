// @ts-nocheck
import React from "react";
import { Check } from "lucide-react";

export default function PurchaseOrdersNotification({ notification }) {
  if (!notification) {
    return null;
  }

  return (
    <div
      style={{
        position: "fixed",
        top: "20px",
        right: "20px",
        backgroundColor: "#d1fae5",
        border: "1px solid #10b981",
        borderRadius: "8px",
        padding: "12px 16px",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        zIndex: 10001,
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
      }}
    >
      <div
        style={{
          width: "24px",
          height: "24px",
          borderRadius: "4px",
          backgroundColor: "#10b981",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Check size={16} style={{ color: "#ffffff" }} />
      </div>
      <span
        style={{
          fontSize: "14px",
          color: "#065f46",
          fontWeight: "500",
        }}
      >
        {notification}
      </span>
    </div>
  );
}
