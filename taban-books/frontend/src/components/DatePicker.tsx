import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";

/**
 * DatePicker component
 * @param {string} value - Date value in dd/MM/yyyy format
 * @param {function} onChange - Callback function that receives date in dd/MM/yyyy format
 * @param {string} placeholder - Placeholder text
 * @param {boolean} disabled - Whether the picker is disabled
 * @param {Date} minDate - Minimum selectable date
 * @param {Date} maxDate - Maximum selectable date
 */
interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  placeholder?: string;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
}

export default function DatePicker({ value, onChange, placeholder = "Select date", disabled = false, minDate, maxDate }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const [calendarPosition, setCalendarPosition] = useState({ top: 0, left: 0, width: 280 });
  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    if (value && value.includes("/")) {
      const parts = value.split("/");
      // Handle both d/m/yyyy and dd/mm/yyyy
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]);
      const year = parseInt(parts[2]);
      return new Date(year, month - 1, 1);
    }
    return new Date();
  });
  const pickerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  // Parse value to Date object
  const selectedDate = value && value.includes("/") ? (() => {
    const parts = value.split("/");
    const day = parseInt(parts[0]);
    const month = parseInt(parts[1]);
    const year = parseInt(parts[2]);
    return new Date(year, month - 1, day);
  })() : null;

  // Close picker when clicking outside and determine if it should open upward
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(event.target as Node) &&
        calendarRef.current &&
        !calendarRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen && inputRef.current) {
      document.addEventListener("mousedown", handleClickOutside);

      // Calculate position for calendar
      const rect = inputRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const calendarHeight = 350; // Approximate calendar height
      const shouldOpenUpward = spaceBelow < calendarHeight && spaceAbove > spaceBelow;

      setOpenUpward(shouldOpenUpward);

      // Set calendar position using fixed positioning with boundary checks
      const calendarWidth = Math.max(rect.width, 280);
      let topPosition = shouldOpenUpward
        ? rect.top - calendarHeight - 4
        : rect.bottom + 4;
      let leftPosition = rect.left;

      // Ensure calendar doesn't go off-screen
      if (topPosition < 0) {
        topPosition = 4;
      } else if (topPosition + calendarHeight > window.innerHeight) {
        topPosition = window.innerHeight - calendarHeight - 4;
      }

      if (leftPosition + calendarWidth > window.innerWidth) {
        leftPosition = window.innerWidth - calendarWidth - 4;
      } else if (leftPosition < 0) {
        leftPosition = 4;
      }

      setCalendarPosition({
        top: topPosition,
        left: leftPosition,
        width: calendarWidth
      });
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const handleDateSelect = (day: number) => {
    const formatted = `${String(day).padStart(2, "0")}/${String(currentMonth.getMonth() + 1).padStart(2, "0")}/${currentMonth.getFullYear()}`;
    onChange(formatted);
    setIsOpen(false);
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const isSelected = (day: number) => {
    if (!selectedDate) return false;
    return (
      selectedDate.getDate() === day &&
      selectedDate.getMonth() === currentMonth.getMonth() &&
      selectedDate.getFullYear() === currentMonth.getFullYear()
    );
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      today.getDate() === day &&
      today.getMonth() === currentMonth.getMonth() &&
      today.getFullYear() === currentMonth.getFullYear()
    );
  };

  const isDisabled = (day: number) => {
    const dateToCheck = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    // Reset time components for accurate date comparison
    dateToCheck.setHours(0, 0, 0, 0);

    if (minDate) {
      const min = new Date(minDate);
      min.setHours(0, 0, 0, 0);
      if (dateToCheck < min) return true;
    }

    if (maxDate) {
      const max = new Date(maxDate);
      max.setHours(0, 0, 0, 0);
      if (dateToCheck > max) return true;
    }

    return false;
  };

  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Generate calendar days
  const days = [];
  // Previous month days
  const prevMonthDays = getDaysInMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  for (let i = firstDay - 1; i >= 0; i--) {
    days.push({
      day: prevMonthDays - i,
      isCurrentMonth: false
    });
  }
  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({
      day: i,
      isCurrentMonth: true
    });
  }
  // Next month days
  const remainingDays = 42 - days.length;
  for (let i = 1; i <= remainingDays; i++) {
    days.push({
      day: i,
      isCurrentMonth: false
    });
  }

  return (
    <div ref={pickerRef} style={{ position: "relative", width: "100%" }}>
      <div style={{ position: "relative", width: "100%" }}>
        <input
          ref={inputRef}
          type="text"
          value={value || ""}
          onChange={(e) => {
            // Allow manual input
            onChange(e.target.value);
          }}
          onFocus={() => !disabled && setIsOpen(true)}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={false}
          style={{
            width: "100%",
            padding: "8px 12px",
            paddingRight: "36px",
            border: "1px solid #d1d5db",
            borderRadius: "6px",
            backgroundColor: disabled ? "#f3f4f6" : "#ffffff",
            cursor: disabled ? "not-allowed" : "text",
            fontSize: "14px",
            color: value ? "#111827" : "#9ca3af",
            outline: "none",
            boxSizing: "border-box"
          }}
        />
        <Calendar
          size={16}
          style={{
            position: "absolute",
            right: "12px",
            top: "50%",
            transform: "translateY(-50%)",
            color: "#9ca3af",
            pointerEvents: "none"
          }}
        />
      </div>

      {isOpen && !disabled && typeof document !== "undefined" && document.body && createPortal(
        <div
          ref={calendarRef}
          style={{
            position: "fixed",
            top: `${calendarPosition.top}px`,
            left: `${calendarPosition.left}px`,
            width: `${calendarPosition.width}px`,
            backgroundColor: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
            zIndex: 10001,
            padding: "16px",
            minWidth: "280px"
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <button
              onClick={handlePrevMonth}
              style={{
                padding: "4px",
                border: "none",
                backgroundColor: "transparent",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "4px",
                color: "#6b7280"
              }}
              onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => (e.currentTarget.style.backgroundColor = "#f3f4f6")}
              onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              <ChevronLeft size={20} />
            </button>
            <div style={{ fontSize: "16px", fontWeight: "600", color: "#111827" }}>
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </div>
            <button
              onClick={handleNextMonth}
              style={{
                padding: "4px",
                border: "none",
                backgroundColor: "transparent",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "4px",
                color: "#6b7280"
              }}
              onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => (e.currentTarget.style.backgroundColor = "#f3f4f6")}
              onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Day names */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px", marginBottom: "8px" }}>
            {dayNames.map((day) => (
              <div
                key={day}
                style={{
                  textAlign: "center",
                  fontSize: "12px",
                  fontWeight: "500",
                  color: (day === "Sun" || day === "Sat") ? "#ef4444" : "#111827",
                  padding: "4px"
                }}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px" }}>
            {days.map(({ day, isCurrentMonth }, index) => {
              const isSelectedDay = isCurrentMonth && isSelected(day);
              const isTodayDay = isCurrentMonth && isToday(day);
              const disabledDay = isCurrentMonth ? isDisabled(day) : true;

              return (
                <button
                  key={index}
                  onClick={() => isCurrentMonth && !disabledDay && handleDateSelect(day)}
                  disabled={!isCurrentMonth || disabledDay}
                  style={{
                    padding: "8px",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "14px",
                    cursor: isCurrentMonth && !disabledDay ? "pointer" : "not-allowed",
                    backgroundColor: isSelectedDay
                      ? "#ef4444"
                      : isTodayDay
                        ? "#fee2e2"
                        : "transparent",
                    color: isSelectedDay
                      ? "#ffffff" // Selected text is always white
                      : disabledDay
                        ? "#d1d5db"
                        : !isCurrentMonth
                          ? "#d1d5db"
                          : isTodayDay
                            ? "#ef4444"
                            : "#111827",
                    fontWeight: isSelectedDay || isTodayDay ? "600" : "400",
                    opacity: disabledDay ? 0.5 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (isCurrentMonth && !isSelectedDay && !disabledDay) {
                      e.currentTarget.style.backgroundColor = "#f3f4f6";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (isCurrentMonth && !isSelectedDay && !disabledDay) {
                      e.currentTarget.style.backgroundColor = isTodayDay ? "#fee2e2" : "transparent";
                    }
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
        , document.body
      )}
    </div>
  );
}
