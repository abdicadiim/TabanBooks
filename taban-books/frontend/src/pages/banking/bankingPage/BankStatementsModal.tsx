import { BANK_STATEMENTS_INBOX_EMAIL } from "./constants";

type BankStatementsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCopy: () => void;
};

export function BankStatementsModal({
  isOpen,
  onClose,
  onCopy,
}: BankStatementsModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
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
        justifyContent: "flex-end",
        zIndex: 10000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "12px 0 0 12px",
          width: "90%",
          maxWidth: "600px",
          maxHeight: "100vh",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          boxShadow:
            "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          style={{
            backgroundColor: "#f9fafb",
            padding: "20px 24px",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTopLeftRadius: "12px",
            borderTopRightRadius: "12px",
          }}
        >
          <h2
            style={{
              fontSize: "18px",
              fontWeight: "600",
              color: "#111827",
              margin: 0,
            }}
          >
            Bank Statements From Inbox
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
              event.currentTarget.style.backgroundColor = "#e5e7eb";
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M15 5L5 15M5 5l10 10"
                stroke="#111827"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div
          style={{
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
          }}
        >
          <div
            style={{
              width: "100%",
              marginBottom: "32px",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
            }}
          >
            <p
              style={{
                fontSize: "14px",
                color: "#6b7280",
                marginBottom: "8px",
                alignSelf: "flex-start",
              }}
            >
              Forward bank statements to
            </p>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                width: "100%",
                justifyContent: "flex-end",
              }}
            >
              <div
                style={{
                  flex: 1,
                  maxWidth: "500px",
                  padding: "10px 14px",
                  backgroundColor: "#f9fafb",
                  border: "1px solid #e5e7eb",
                  borderRadius: "6px",
                  fontSize: "14px",
                  color: "#111827",
                  fontFamily: "monospace",
                  textAlign: "right",
                }}
              >
                {BANK_STATEMENTS_INBOX_EMAIL}
              </div>
              <button
                onClick={onCopy}
                style={{
                  padding: "10px 16px",
                  backgroundColor: "white",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "14px",
                  fontWeight: "500",
                  cursor: "pointer",
                  color: "#111827",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "all 0.2s ease",
                }}
                onMouseOver={(event) => {
                  event.currentTarget.style.backgroundColor = "#f9fafb";
                  event.currentTarget.style.borderColor = "#9ca3af";
                }}
                onMouseOut={(event) => {
                  event.currentTarget.style.backgroundColor = "white";
                  event.currentTarget.style.borderColor = "#d1d5db";
                }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <rect
                    x="4"
                    y="2"
                    width="8"
                    height="8"
                    rx="1"
                    stroke="#111827"
                    strokeWidth="1.5"
                    fill="none"
                  />
                  <rect
                    x="4"
                    y="6"
                    width="8"
                    height="8"
                    rx="1"
                    stroke="#111827"
                    strokeWidth="1.5"
                    fill="none"
                  />
                </svg>
                Copy
              </button>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: "16px",
              width: "100%",
            }}
          >
            <div
              style={{
                position: "relative",
                width: "200px",
                height: "200px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                alignSelf: "flex-end",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  width: "180px",
                  height: "180px",
                  borderRadius: "50%",
                  backgroundColor: "#fed7aa",
                  opacity: 0.6,
                }}
              />

              <div
                style={{
                  position: "relative",
                  zIndex: 1,
                  width: "120px",
                  height: "120px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
                  <path
                    d="M20 40L60 20L100 40V90H20V40Z"
                    fill="#a855f7"
                    stroke="#9333ea"
                    strokeWidth="2"
                  />
                  <path d="M20 40L60 60L100 40" stroke="#9333ea" strokeWidth="2" fill="none" />
                  <path d="M60 20V60" stroke="#9333ea" strokeWidth="2" />
                  <rect x="25" y="45" width="70" height="40" fill="#9333ea" opacity="0.3" />
                </svg>
              </div>
            </div>

            <p
              style={{
                fontSize: "16px",
                fontWeight: "500",
                color: "#111827",
                margin: 0,
                textAlign: "right",
                alignSelf: "flex-end",
              }}
            >
              Looks like you've added all your bank statements!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
