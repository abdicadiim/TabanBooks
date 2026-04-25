type FindAccountModalProps = {
  accountCode: string;
  accountName: string;
  isOpen: boolean;
  onAccountCodeChange: (value: string) => void;
  onAccountNameChange: (value: string) => void;
  onClose: () => void;
  onSearch: () => void;
};

export function FindAccountModal({
  accountCode,
  accountName,
  isOpen,
  onAccountCodeChange,
  onAccountNameChange,
  onClose,
  onSearch,
}: FindAccountModalProps) {
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
        justifyContent: "center",
        zIndex: 10000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "12px",
          width: "90%",
          maxWidth: "400px",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow:
            "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 24px",
            borderBottom: "1px solid #e5e7eb",
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
            Find Your Account
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
              <path
                d="M15 5L5 15M5 5l10 10"
                stroke="#ef4444"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div style={{ padding: "24px", flex: 1, overflowY: "auto" }}>
          <div style={{ marginBottom: "20px" }}>
            <label
              style={{
                display: "block",
                fontSize: "14px",
                fontWeight: "500",
                color: "#111827",
                marginBottom: "8px",
              }}
            >
              Account Name
            </label>
            <input
              type="text"
              value={accountName}
              onChange={(event) => onAccountNameChange(event.target.value)}
              placeholder="Enter account name"
              style={{
                width: "100%",
                padding: "10px 14px",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "14px",
                outline: "none",
              }}
              onFocus={(event) => {
                event.currentTarget.style.borderColor = "#156372";
                event.currentTarget.style.boxShadow =
                  "0 0 0 3px rgba(38, 99, 235, 0.1)";
              }}
              onBlur={(event) => {
                event.currentTarget.style.borderColor = "#d1d5db";
                event.currentTarget.style.boxShadow = "none";
              }}
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label
              style={{
                display: "block",
                fontSize: "14px",
                fontWeight: "500",
                color: "#111827",
                marginBottom: "8px",
              }}
            >
              Account Code
            </label>
            <input
              type="text"
              value={accountCode}
              onChange={(event) => onAccountCodeChange(event.target.value)}
              placeholder="Enter account code"
              style={{
                width: "100%",
                padding: "10px 14px",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "14px",
                outline: "none",
              }}
              onFocus={(event) => {
                event.currentTarget.style.borderColor = "#156372";
                event.currentTarget.style.boxShadow =
                  "0 0 0 3px rgba(38, 99, 235, 0.1)";
              }}
              onBlur={(event) => {
                event.currentTarget.style.borderColor = "#d1d5db";
                event.currentTarget.style.boxShadow = "none";
              }}
            />
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "12px",
            padding: "16px 24px",
            borderTop: "1px solid #e5e7eb",
          }}
        >
          <button
            onClick={onSearch}
            style={{
              padding: "10px 20px",
              backgroundColor: "#ef4444",
              color: "white",
              border: "none",
              borderRadius: "6px",
              fontSize: "14px",
              fontWeight: "500",
              cursor: "pointer",
              transition: "background-color 0.2s ease",
            }}
            onMouseOver={(event) => {
              event.currentTarget.style.backgroundColor = "#dc2626";
            }}
            onMouseOut={(event) => {
              event.currentTarget.style.backgroundColor = "#ef4444";
            }}
          >
            Search
          </button>
          <button
            onClick={onClose}
            style={{
              padding: "10px 20px",
              backgroundColor: "white",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              fontSize: "14px",
              fontWeight: "500",
              cursor: "pointer",
              color: "#111827",
              transition: "background-color 0.2s ease, border-color 0.2s ease",
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
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
