import type { RefObject } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";

import {
  ACCENT_GRADIENT,
  CALENDAR_DAY_LABELS,
} from "./constants";
import type { CalendarMonthDirection } from "./types";
import { getDaysInMonth, parseDate } from "./utils";

type SearchDatePickerProps = {
  value: string;
  open: boolean;
  pickerRef: RefObject<HTMLDivElement | null>;
  calendarMonth: Date;
  onToggle: () => void;
  onNavigate: (direction: CalendarMonthDirection) => void;
  onSelect: (date: Date) => void;
};

export function SearchDatePicker({
  value,
  open,
  pickerRef,
  calendarMonth,
  onToggle,
  onNavigate,
  onSelect,
}: SearchDatePickerProps) {
  const selectedDate = parseDate(value);
  const today = new Date();

  return (
    <div style={{ flex: 1, position: "relative" }} ref={pickerRef}>
      <input
        type="text"
        value={value}
        readOnly
        onClick={onToggle}
        style={{
          width: "100%",
          padding: "8px 12px",
          paddingRight: "36px",
          fontSize: "14px",
          border: open ? "1px solid #156372" : "1px solid #e5e7eb",
          borderRadius: "6px",
          outline: "none",
          cursor: "pointer",
          backgroundColor: "#ffffff",
        }}
        placeholder="dd/MM/yyyy"
      />

      <Calendar
        size={16}
        style={{
          position: "absolute",
          right: "12px",
          top: "50%",
          transform: "translateY(-50%)",
          pointerEvents: "none",
          color: "#9ca3af",
        }}
      />

      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            marginTop: "4px",
            backgroundColor: "#ffffff",
            border: "1px solid #d1d5db",
            borderRadius: "6px",
            boxShadow:
              "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
            zIndex: 1000,
            width: "100%",
            minWidth: "280px",
          }}
        >
          <div style={{ padding: "12px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "12px",
              }}
            >
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onNavigate("prev");
                }}
                style={{
                  padding: "4px 8px",
                  backgroundColor: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "#6b7280",
                }}
              >
                <ChevronLeft size={16} />
              </button>

              <span
                style={{
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#111827",
                }}
              >
                {calendarMonth.toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </span>

              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onNavigate("next");
                }}
                style={{
                  padding: "4px 8px",
                  backgroundColor: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "#6b7280",
                }}
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7, 1fr)",
                gap: "4px",
                marginBottom: "8px",
              }}
            >
              {CALENDAR_DAY_LABELS.map((day) => (
                <div
                  key={day}
                  style={{
                    fontSize: "11px",
                    fontWeight: "600",
                    textAlign: "center",
                    padding: "4px",
                    color: "#156372",
                  }}
                >
                  {day}
                </div>
              ))}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7, 1fr)",
                gap: "4px",
              }}
            >
              {getDaysInMonth(calendarMonth).map((day) => {
                const isSelected =
                  day.month === "current" &&
                  selectedDate?.toDateString() === day.fullDate.toDateString();
                const isToday =
                  day.month === "current" &&
                  day.fullDate.toDateString() === today.toDateString();

                return (
                  <button
                    key={day.fullDate.toISOString()}
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      if (day.month === "current") {
                        onSelect(day.fullDate);
                      }
                    }}
                    style={{
                      fontSize: "12px",
                      padding: "8px 4px",
                      borderRadius: "4px",
                      border: "none",
                      cursor:
                        day.month === "current" ? "pointer" : "default",
                      color:
                        day.month !== "current"
                          ? "#d1d5db"
                          : isSelected || isToday
                            ? "#ffffff"
                            : "#111827",
                      fontWeight:
                        isSelected || isToday ? "600" : "normal",
                      background:
                        isSelected || isToday
                          ? ACCENT_GRADIENT
                          : "transparent",
                    }}
                    onMouseEnter={(event) => {
                      if (day.month === "current" && !isSelected && !isToday) {
                        event.currentTarget.style.backgroundColor = "#f3f4f6";
                      }
                    }}
                    onMouseLeave={(event) => {
                      if (day.month === "current" && !isSelected && !isToday) {
                        event.currentTarget.style.backgroundColor =
                          "transparent";
                      }
                    }}
                  >
                    {day.date}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
