import type { ReactNode } from "react";

type MoneyInOverlayShellProps = {
  title: string;
  onClose: () => void;
  footer: ReactNode;
  children: ReactNode;
};

export function MoneyInOverlayShell({
  title,
  onClose,
  footer,
  children,
}: MoneyInOverlayShellProps) {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        bottom: 0,
        width: "500px",
        backgroundColor: "white",
        boxShadow: "-4px 0 6px rgba(0, 0, 0, 0.1)",
        zIndex: 10001,
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
      }}
    >
      <div
        style={{
          padding: "24px",
          borderBottom: "1px solid #e5e7eb",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <h2
          style={{
            fontSize: "20px",
            fontWeight: "600",
            color: "#111827",
            margin: 0,
          }}
        >
          {title}
        </h2>
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
            borderRadius: "4px",
          }}
          onMouseEnter={(event) => {
            event.currentTarget.style.backgroundColor = "#f3f4f6";
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.backgroundColor = "transparent";
          }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M15 5L5 15M5 5l10 10" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div
        style={{
          padding: "24px",
          flex: 1,
          overflowY: "auto",
        }}
      >
        {children}
      </div>

      <div
        style={{
          padding: "24px",
          borderTop: "1px solid #e5e7eb",
          display: "flex",
          justifyContent: "flex-end",
          gap: "12px",
        }}
      >
        {footer}
      </div>
    </div>
  );
}
