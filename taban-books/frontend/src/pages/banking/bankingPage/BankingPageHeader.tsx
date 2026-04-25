type BankingPageHeaderProps = {
  onAddBankAccount: () => void;
  onOpenBankStatements: () => void;
};

export function BankingPageHeader({
  onAddBankAccount,
  onOpenBankStatements,
}: BankingPageHeaderProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "24px",
        paddingBottom: "20px",
        borderBottom: "1px solid #e5e7eb",
      }}
    >
      <h1
        style={{
          fontSize: "24px",
          fontWeight: "600",
          color: "#111827",
          margin: 0,
        }}
      >
        Banking Overview
      </h1>
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <button
          onClick={onOpenBankStatements}
          style={{
            background: "none",
            border: "none",
            color: "#156372",
            fontSize: "14px",
            fontWeight: "500",
            cursor: "pointer",
            padding: "8px 12px",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
          onMouseEnter={(event) => {
            event.currentTarget.style.textDecoration = "underline";
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.textDecoration = "none";
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect
              x="2"
              y="4"
              width="12"
              height="10"
              rx="1"
              stroke="#156372"
              strokeWidth="1.5"
              fill="none"
            />
            <path d="M2 8h12M6 4v10" stroke="#156372" strokeWidth="1.5" />
          </svg>
          Bank Statements
        </button>
        <button
          onClick={onAddBankAccount}
          style={{
            padding: "8px 16px",
            backgroundColor: "#156372",
            color: "white",
            border: "none",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: "500",
            cursor: "pointer",
            transition: "background-color 0.2s ease",
          }}
          onMouseOver={(event) => {
            event.currentTarget.style.backgroundColor = "#0e4a5e";
          }}
          onMouseOut={(event) => {
            event.currentTarget.style.backgroundColor = "#156372";
          }}
        >
          Add Bank or Credit Card
        </button>
      </div>
    </div>
  );
}
