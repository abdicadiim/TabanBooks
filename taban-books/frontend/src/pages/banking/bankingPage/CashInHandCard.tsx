import { formatKesCurrency } from "./helpers";

type CashInHandCardProps = {
  totalBalance: number;
};

export function CashInHandCard({ totalBalance }: CashInHandCardProps) {
  return (
    <div
      style={{
        backgroundColor: "white",
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        padding: "20px",
        display: "flex",
        alignItems: "center",
        gap: "16px",
        marginBottom: "16px",
      }}
    >
      <div
        style={{
          width: "48px",
          height: "48px",
          borderRadius: "8px",
          backgroundColor: "#f3f4f6",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"
            fill="#9ca3af"
            opacity="0.2"
          />
          <path
            d="M8 10c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2v2c0 1.1-.9 2-2 2h-4c-1.1 0-2-.9-2-2v-2z"
            fill="#6b7280"
          />
          <path
            d="M10 8v6M14 8v6"
            stroke="#6b7280"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <circle cx="10" cy="11" r="1" fill="#f3f4f6" />
          <circle cx="14" cy="11" r="1" fill="#f3f4f6" />
        </svg>
      </div>
      <div>
        <div
          style={{
            fontSize: "14px",
            color: "#6b7280",
            marginBottom: "4px",
          }}
        >
          Cash In Hand
        </div>
        <div
          style={{
            fontSize: "20px",
            fontWeight: "600",
            color: "#111827",
          }}
        >
          {formatKesCurrency(totalBalance)}
        </div>
      </div>
    </div>
  );
}
