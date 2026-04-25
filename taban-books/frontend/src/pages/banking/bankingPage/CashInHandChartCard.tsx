import { buildChartDates, getCashInHandChartPoints } from "./helpers";

type CashInHandChartCardProps = {
  chartVisible: boolean;
  onHideChart: () => void;
  onShowChart: () => void;
};

const chartDates = buildChartDates();
const chartPoints = getCashInHandChartPoints(chartDates);

export function CashInHandChartCard({
  chartVisible,
  onHideChart,
  onShowChart,
}: CashInHandChartCardProps) {
  if (!chartVisible) {
    return (
      <div style={{ marginBottom: "16px" }}>
        <button
          onClick={onShowChart}
          style={{
            background: "none",
            border: "none",
            color: "#156372",
            fontSize: "14px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "4px",
            padding: "8px 0",
          }}
          onMouseEnter={(event) => {
            event.currentTarget.style.textDecoration = "underline";
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.textDecoration = "none";
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M2 12l4-4-4-4"
              stroke="#156372"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M6 8h8" stroke="#156372" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Show Chart
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: "white",
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        padding: "20px",
        marginBottom: "24px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "20px",
        }}
      >
        <h3
          style={{
            fontSize: "16px",
            fontWeight: "600",
            color: "#111827",
            margin: 0,
          }}
        >
          Cash In Hand
        </h3>
        <button
          onClick={onHideChart}
          style={{
            background: "none",
            border: "none",
            color: "#156372",
            fontSize: "14px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
          onMouseEnter={(event) => {
            event.currentTarget.style.textDecoration = "underline";
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.textDecoration = "none";
          }}
        >
          Hide Chart
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M3.5 10.5l3.5-3.5-3.5-3.5"
              stroke="#156372"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      <div
        style={{
          position: "relative",
          height: "300px",
          borderBottom: "1px solid #e5e7eb",
          borderLeft: "1px solid #e5e7eb",
          paddingLeft: "40px",
          paddingBottom: "30px",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: "0",
            top: "0",
            bottom: "30px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "40px",
            paddingRight: "8px",
            alignItems: "flex-end",
          }}
        >
          {[3.5, 3, 2.5, 2, 1.5, 1, 0.5, 0].map((value) => (
            <span
              key={value}
              style={{
                fontSize: "12px",
                color: "#6b7280",
              }}
            >
              {value === 0 ? "0" : value === 3.5 ? "3.5 K" : `${value} K`}
            </span>
          ))}
        </div>

        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
          }}
        >
          {[0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5].map((value, index) => (
            <div
              key={value}
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: `${(7 - index) * (100 / 7)}%`,
                borderTop: "1px solid #f3f4f6",
                height: "1px",
              }}
            />
          ))}

          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: "100%",
              height: "100%",
              pointerEvents: "none",
            }}
          >
            <polyline
              points={chartPoints}
              fill="none"
              stroke="#9ca3af"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: "8px",
            paddingLeft: "40px",
          }}
        >
          {chartDates.map((date, index) => (
            <span
              key={`${date}-${index}`}
              style={{
                fontSize: "11px",
                color: "#6b7280",
                width: `${100 / chartDates.length}%`,
                textAlign: "center",
              }}
            >
              {date}
            </span>
          ))}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: "24px",
          marginTop: "16px",
          paddingLeft: "40px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "12px",
              height: "12px",
              backgroundColor: "#9ca3af",
              borderRadius: "2px",
            }}
          />
          <span style={{ fontSize: "14px", color: "#6b7280" }}>
            Cash In Hand
          </span>
        </div>
      </div>
    </div>
  );
}
