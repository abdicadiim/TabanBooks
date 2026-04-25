import { TIME_PERIOD_OPTIONS } from "./constants";
import { AccountsTableCard } from "./AccountsTableCard";
import { CashInHandCard } from "./CashInHandCard";
import { CashInHandChartCard } from "./CashInHandChartCard";
import type { BankingPageController } from "./types";

type AllAccountsSectionProps = {
  controller: BankingPageController;
};

export function AllAccountsSection({ controller }: AllAccountsSectionProps) {
  return (
    <div style={{ marginBottom: "24px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <h2
            style={{
              fontSize: "18px",
              fontWeight: "600",
              color: "#111827",
              margin: 0,
            }}
          >
            All Accounts
          </h2>
          <button
            onClick={() =>
              controller.setAllAccountsSectionOpen(
                !controller.allAccountsSectionOpen,
              )
            }
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "4px",
              display: "flex",
              alignItems: "center",
              borderRadius: "4px",
              transition: "background-color 0.2s ease",
            }}
            onMouseEnter={(event) => {
              event.currentTarget.style.backgroundColor = "#f3f4f6";
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              style={{
                transform: controller.allAccountsSectionOpen
                  ? "rotate(180deg)"
                  : "rotate(0deg)",
                transition: "transform 0.2s ease",
              }}
            >
              <path
                d="M3.5 5.25l3.5 3.5 3.5-3.5"
                stroke="#156372"
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        <div style={{ position: "relative" }} ref={controller.timePeriodDropdownRef}>
          <button
            onClick={() =>
              controller.setTimePeriodDropdownOpen(
                !controller.timePeriodDropdownOpen,
              )
            }
            style={{
              padding: "8px 12px",
              backgroundColor: "white",
              border: controller.timePeriodDropdownOpen
                ? "1px solid #156372"
                : "1px solid #d1d5db",
              borderRadius: "6px",
              fontSize: "14px",
              color: "#111827",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              minWidth: "150px",
              transition: "all 0.2s ease",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect
                x="2"
                y="3"
                width="12"
                height="11"
                rx="1"
                stroke="#6b7280"
                strokeWidth="1.5"
                fill="none"
              />
              <path
                d="M2 6h12M5 3V1M11 3V1"
                stroke="#6b7280"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            <span>{controller.selectedTimePeriod}</span>
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              style={{
                transform: controller.timePeriodDropdownOpen
                  ? "rotate(180deg)"
                  : "rotate(0deg)",
                transition: "transform 0.2s ease",
              }}
            >
              <path
                d="M3.5 5.25l3.5 3.5 3.5-3.5"
                stroke="#6b7280"
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {controller.timePeriodDropdownOpen && (
            <div
              style={{
                position: "absolute",
                bottom: "calc(100% + 4px)",
                right: 0,
                backgroundColor: "white",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                boxShadow:
                  "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                zIndex: 1000,
                minWidth: "180px",
                overflow: "hidden",
              }}
              onClick={(event) => event.stopPropagation()}
            >
              {TIME_PERIOD_OPTIONS.map((option) => {
                const isSelected = controller.selectedTimePeriod === option;
                return (
                  <div
                    key={option}
                    onClick={() => {
                      controller.setSelectedTimePeriod(option);
                      controller.setTimePeriodDropdownOpen(false);
                    }}
                    style={{
                      padding: "10px 14px",
                      cursor: "pointer",
                      fontSize: "14px",
                      color: isSelected ? "white" : "#111827",
                      transition: "background-color 0.15s ease",
                      backgroundColor: isSelected ? "#156372" : "transparent",
                    }}
                    onMouseEnter={(event) => {
                      if (!isSelected) {
                        event.currentTarget.style.backgroundColor = "#f9fafb";
                      }
                    }}
                    onMouseLeave={(event) => {
                      if (!isSelected) {
                        event.currentTarget.style.backgroundColor = "transparent";
                      }
                    }}
                  >
                    {option}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {controller.allAccountsSectionOpen && (
        <>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "16px",
            }}
          >
            <div
              style={{
                position: "relative",
                flex: 1,
                maxWidth: "300px",
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                style={{
                  position: "absolute",
                  left: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  pointerEvents: "none",
                }}
              >
                <circle cx="7" cy="7" r="5" stroke="#9ca3af" strokeWidth="1.5" fill="none" />
                <path
                  d="M11 11l-3-3"
                  stroke="#9ca3af"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              <input
                type="text"
                placeholder="Search"
                value={controller.searchTerm}
                onChange={(event) => controller.setSearchTerm(event.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px 8px 36px",
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

            <div style={{ position: "relative" }} ref={controller.allAccountsDropdownRef}>
              <button
                onClick={() =>
                  controller.setAllAccountsOpen(!controller.allAccountsOpen)
                }
                style={{
                  padding: "8px 12px",
                  backgroundColor:
                    controller.selectedAccount === "All Accounts"
                      ? "#eff6ff"
                      : "white",
                  border: controller.allAccountsOpen
                    ? "1px solid #156372"
                    : "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "14px",
                  color:
                    controller.selectedAccount === "All Accounts"
                      ? "#2563eb"
                      : "#111827",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "8px",
                  minWidth: "160px",
                }}
              >
                <span>{controller.selectedAccount}</span>
                {controller.selectedAccount === "All Accounts" && (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M13 4l-6 6-3-3"
                      stroke="#2563eb"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  style={{
                    transform: controller.allAccountsOpen
                      ? "rotate(180deg)"
                      : "rotate(0deg)",
                    transition: "transform 0.2s ease",
                  }}
                >
                  <path
                    d="M3.5 5.25l3.5 3.5 3.5-3.5"
                    stroke="#6b7280"
                    strokeWidth="1.5"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              {controller.allAccountsOpen && (
                <div
                  style={{
                    position: "absolute",
                    bottom: "calc(100% + 4px)",
                    left: 0,
                    backgroundColor: "white",
                    border: "1px solid #d1d5db",
                    borderRadius: "8px",
                    boxShadow:
                      "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                    zIndex: 1000,
                    minWidth: "220px",
                    overflow: "hidden",
                  }}
                  onClick={(event) => event.stopPropagation()}
                >
                  {controller.accountOptions.map((accountName) => {
                    const isSelected = controller.selectedAccount === accountName;
                    return (
                      <div
                        key={accountName}
                        onClick={() => {
                          controller.setSelectedAccount(accountName);
                          controller.setAllAccountsOpen(false);
                        }}
                        style={{
                          padding: "10px 14px",
                          cursor: "pointer",
                          fontSize: "14px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          backgroundColor: isSelected ? "#eff6ff" : "transparent",
                          color: isSelected ? "#2563eb" : "#111827",
                          transition: "all 0.15s ease",
                        }}
                        onMouseEnter={(event) => {
                          if (!isSelected) {
                            event.currentTarget.style.backgroundColor = "#f9fafb";
                          }
                        }}
                        onMouseLeave={(event) => {
                          if (!isSelected) {
                            event.currentTarget.style.backgroundColor = "transparent";
                          }
                        }}
                      >
                        <span>{accountName}</span>
                        {isSelected && (
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path
                              d="M13 4l-6 6-3-3"
                              stroke="#2563eb"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <CashInHandCard totalBalance={Number(controller.summary.totalBalance || 0)} />
          <CashInHandChartCard
            chartVisible={controller.chartVisible}
            onHideChart={() => controller.setChartVisible(false)}
            onShowChart={() => controller.setChartVisible(true)}
          />
          <AccountsTableCard controller={controller} />
        </>
      )}
    </div>
  );
}
