import React, { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

import { toast } from "react-hot-toast";
import { accountantAPI } from "../../services/api";

function EditCurrencyAdjustment() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isCurrencyDropdownOpen, setIsCurrencyDropdownOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [formData, setFormData] = useState({
    currency: "",
    date: "",
    exchangeRate: "",
    notes: ""
  });
  const [dateCalendar, setDateCalendar] = useState(new Date());
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const currencyDropdownRef = useRef(null);
  const datePickerRef = useRef(null);

  const currencies = [
    "AED - UAE Dirham",
    "USD - US Dollar",
    "EUR - Euro",
    "GBP - British Pound",
    "AMD - Armenian Dram"
  ];

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  useEffect(() => {
    const fetchAdjustment = async () => {
      try {
        const response = await accountantAPI.getCurrencyAdjustmentById(id);
        if (response && response.success) {
          const found = response.data;
          setFormData({
            currency: found.currency,
            date: found.date,
            exchangeRate: found.exchangeRate,
            notes: found.notes || ""
          });

          // Parse date for calendar
          // stored as "dd MMM yyyy" e.g. "12 Oct 2023" or similar from frontend format
          // The formatDate function uses "dd MMM yyyy" format in this file (line 68)
          const dateParts = found.date.split(" ");
          if (dateParts.length === 3) {
            const monthIndex = months.indexOf(dateParts[1]);
            if (monthIndex !== -1) {
              setDateCalendar(new Date(parseInt(dateParts[2]), monthIndex, parseInt(dateParts[0])));
            }
          }
        } else {
          toast.error("Adjustment not found");
          navigate("/accountant/currency-adjustments");
        }
      } catch (error) {
        console.error("Error loading adjustment:", error);
        toast.error("Failed to load adjustment");
        navigate("/accountant/currency-adjustments");
      }
    };

    if (id) {
      fetchAdjustment();
    }
  }, [id, navigate]);

  const formatDate = (date) => {
    if (!date) return "";
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, "0");
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    const prevMonth = new Date(year, month - 1, 0);
    const prevMonthDays = prevMonth.getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: prevMonthDays - i,
        month: "prev",
        fullDate: new Date(year, month - 1, prevMonthDays - i)
      });
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: i,
        month: "current",
        fullDate: new Date(year, month, i)
      });
    }
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        date: i,
        month: "next",
        fullDate: new Date(year, month + 1, i)
      });
    }
    return days;
  };

  const handleDateSelect = (date) => {
    const formatted = formatDate(date);
    setFormData(prev => ({ ...prev, date: formatted }));
    setIsDatePickerOpen(false);
    setDateCalendar(date);
  };

  const navigateMonth = (direction) => {
    const newDate = new Date(dateCalendar);
    if (direction === "prev") {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setDateCalendar(newDate);
  };

  const validateField = (name, value) => {
    const newErrors = { ...errors };
    if ((name === "currency" || name === "date" || name === "exchangeRate" || name === "notes") && (!value || value.trim() === "")) {
      newErrors[name] = "This field is required";
    } else if (name === "exchangeRate" && value && isNaN(parseFloat(value))) {
      newErrors[name] = "Please enter a valid number";
    } else {
      delete newErrors[name];
    }
    setErrors(newErrors);
  };

  const handleBlur = (name, value) => {
    setTouched({ ...touched, [name]: true });
    validateField(name, value);
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (currencyDropdownRef.current && !currencyDropdownRef.current.contains(event.target)) {
        setIsCurrencyDropdownOpen(false);
      }
      if (datePickerRef.current && !datePickerRef.current.contains(event.target)) {
        setIsDatePickerOpen(false);
      }
    }

    if (isCurrencyDropdownOpen || isDatePickerOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isCurrencyDropdownOpen, isDatePickerOpen]);

  const handleSave = async () => {
    // Validate all fields
    const allFieldsValid = formData.currency && formData.date && formData.exchangeRate && formData.notes;
    if (!allFieldsValid) {
      alert("Please fill in all required fields");
      return;
    }

    // Calculate gain or loss
    const exchangeRate = parseFloat(formData.exchangeRate);
    const baseRate = 1;
    const gainOrLoss = exchangeRate - baseRate;

    try {
      const updateData = {
        currency: formData.currency,
        date: formData.date,
        exchangeRate: parseFloat(formData.exchangeRate),
        gainOrLoss: gainOrLoss,
        notes: formData.notes
      };

      const response = await accountantAPI.updateCurrencyAdjustment(id, updateData);

      if (response && response.success) {
        toast.success("Currency adjustment updated successfully");
        navigate(`/accountant/currency-adjustments/${id}`);
      }
    } catch (error) {
      console.error("Error updating adjustment:", error);
      toast.error(error.message || "Failed to update currency adjustment");
    }
  };

  return (
    <div style={{ minHeight: "calc(100vh - 60px)", backgroundColor: "#f7f8fc" }}>
      {/* Top Navigation Bar */}
      <div style={{
        backgroundColor: "white",
        borderBottom: "1px solid #e5e7eb",
        padding: "12px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
        <button
          onClick={() => navigate(`/accountant/currency-adjustments/${id}`)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "6px 12px",
            backgroundColor: "transparent",
            border: "1px solid #e5e7eb",
            borderRadius: "6px",
            fontSize: "13px",
            color: "#6b7280",
            cursor: "pointer"
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = "#f9fafb"}
          onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
        >
          ← Back
        </button>
        <h1 style={{ fontSize: "20px", fontWeight: "600", margin: 0, color: "#111827" }}>
          Edit Currency Adjustment
        </h1>
        <div style={{ width: "80px" }}></div>
      </div>

      {/* Form Content */}
      <div style={{ padding: "32px", maxWidth: "600px", margin: "0 auto" }}>
        {/* Currency Field */}
        <div style={{ marginBottom: "24px" }}>
          <label style={{
            display: "block",
            fontSize: "14px",
            fontWeight: "500",
            color: "#111827",
            marginBottom: "8px"
          }}>
            Currency <span style={{ color: "#ef4444" }}>*</span>
          </label>
          <div ref={currencyDropdownRef} style={{ position: "relative" }}>
            <div
              onClick={() => setIsCurrencyDropdownOpen(!isCurrencyDropdownOpen)}
              style={{
                padding: "14px 16px",
                border: errors.currency && touched.currency ? "2px solid #ef4444" : "2px solid #e5e7eb",
                borderRadius: "12px",
                fontSize: "15px",
                background: "white",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                color: formData.currency ? "#111827" : "#9ca3af"
              }}
            >
              <span>{formData.currency || "Select Currency"}</span>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ transform: isCurrencyDropdownOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.3s ease" }}>
                <path d="M3.5 5.25l3.5 3.5 3.5-3.5" stroke="#6b7280" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            {isCurrencyDropdownOpen && (
              <div style={{
                position: "absolute",
                top: "calc(100% + 4px)",
                left: 0,
                right: 0,
                backgroundColor: "white",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                zIndex: 1000,
                maxHeight: "200px",
                overflowY: "auto"
              }}>
                {currencies.map((currency) => (
                  <div
                    key={currency}
                    onClick={() => {
                      setFormData(prev => ({ ...prev, currency }));
                      setIsCurrencyDropdownOpen(false);
                      validateField("currency", currency);
                      setTouched({ ...touched, currency: true });
                    }}
                    style={{
                      padding: "10px 14px",
                      cursor: "pointer",
                      fontSize: "13px",
                      backgroundColor: formData.currency === currency ? "#156372" : "transparent",
                      color: formData.currency === currency ? "white" : "#111827"
                    }}
                    onMouseEnter={(e) => {
                      if (formData.currency !== currency) {
                        e.target.style.backgroundColor = "#f3f4f6";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (formData.currency !== currency) {
                        e.target.style.backgroundColor = "transparent";
                      }
                    }}
                  >
                    {currency}
                  </div>
                ))}
              </div>
            )}
          </div>
          {errors.currency && touched.currency && (
            <div style={{ marginTop: "6px", fontSize: "13px", color: "#ef4444" }}>
              {errors.currency}
            </div>
          )}
        </div>

        {/* Date Field */}
        <div style={{ marginBottom: "24px" }}>
          <label style={{
            display: "block",
            fontSize: "14px",
            fontWeight: "500",
            color: "#111827",
            marginBottom: "8px"
          }}>
            Date of Adjustment <span style={{ color: "#ef4444" }}>*</span>
          </label>
          <div ref={datePickerRef} style={{ position: "relative" }}>
            <input
              type="text"
              placeholder="dd MMM yyyy"
              value={formData.date}
              readOnly
              onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
              style={{
                width: "100%",
                padding: "14px 16px",
                border: errors.date && touched.date ? "2px solid #ef4444" : "2px solid #e5e7eb",
                borderRadius: "12px",
                fontSize: "15px",
                outline: "none",
                cursor: "pointer",
                backgroundColor: "white",
                color: "#111827"
              }}
            />
            {isDatePickerOpen && (
              <div style={{
                position: "absolute",
                top: "calc(100% + 4px)",
                left: 0,
                backgroundColor: "white",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                zIndex: 1000,
                padding: "16px",
                minWidth: "280px"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <button
                    onClick={() => navigateMonth("prev")}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: "4px",
                      color: "#6b7280",
                      fontSize: "16px"
                    }}
                  >
                    «
                  </button>
                  <div style={{ fontSize: "14px", fontWeight: "600", color: "#111827" }}>
                    {months[dateCalendar.getMonth()]} {dateCalendar.getFullYear()}
                  </div>
                  <button
                    onClick={() => navigateMonth("next")}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: "4px",
                      color: "#6b7280",
                      fontSize: "16px"
                    }}
                  >
                    »
                  </button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px", marginBottom: "8px" }}>
                  {daysOfWeek.map((day) => (
                    <div key={day} style={{
                      textAlign: "center",
                      fontSize: "11px",
                      fontWeight: "500",
                      color: (day === "Sun" || day === "Sat") ? "#ef4444" : "#6b7280",
                      padding: "4px"
                    }}>
                      {day}
                    </div>
                  ))}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px" }}>
                  {getDaysInMonth(dateCalendar).map((day, index) => {
                    const isSelected = formData.date && formatDate(day.fullDate) === formData.date;
                    const isCurrentMonth = day.month === "current";
                    return (
                      <button
                        key={index}
                        onClick={() => handleDateSelect(day.fullDate)}
                        style={{
                          padding: "8px 4px",
                          border: isSelected ? "2px solid #f97316" : "1px solid transparent",
                          borderRadius: "4px",
                          fontSize: "13px",
                          cursor: "pointer",
                          backgroundColor: "transparent",
                          color: isCurrentMonth ? "#111827" : "#9ca3af",
                          minHeight: "32px"
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            e.target.style.backgroundColor = "#f3f4f6";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            e.target.style.backgroundColor = "transparent";
                          }
                        }}
                      >
                        {day.date}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          {errors.date && touched.date && (
            <div style={{ marginTop: "6px", fontSize: "13px", color: "#ef4444" }}>
              {errors.date}
            </div>
          )}
        </div>

        {/* Exchange Rate Field */}
        <div style={{ marginBottom: "24px" }}>
          <label style={{
            display: "block",
            fontSize: "14px",
            fontWeight: "500",
            color: "#111827",
            marginBottom: "8px"
          }}>
            Exchange Rate <span style={{ color: "#ef4444" }}>*</span>
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{
              fontSize: "15px",
              color: "#6b7280",
              padding: "14px 16px",
              backgroundColor: "#f9fafb",
              border: "2px solid #e5e7eb",
              borderRadius: "12px",
              whiteSpace: "nowrap"
            }}>
              1 {formData.currency.split(" - ")[0] || "AED"} =
            </span>
            <input
              type="number"
              value={formData.exchangeRate}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, exchangeRate: e.target.value }));
                if (touched.exchangeRate) validateField("exchangeRate", e.target.value);
              }}
              onBlur={(e) => handleBlur("exchangeRate", e.target.value)}
              placeholder="0.00"
              step="0.000000000001"
              style={{
                flex: 1,
                padding: "14px 16px",
                border: errors.exchangeRate && touched.exchangeRate ? "2px solid #ef4444" : "2px solid #e5e7eb",
                borderRadius: "12px",
                fontSize: "15px",
                outline: "none",
                backgroundColor: "white",
                color: "#111827"
              }}
            />
            <div style={{
              padding: "14px 16px",
              border: "2px solid #e5e7eb",
              borderRadius: "12px",
              fontSize: "15px",
              backgroundColor: "#f9fafb",
              color: "#6b7280",
              minWidth: "70px",
              textAlign: "center",
              fontWeight: "500"
            }}>
              AMD
            </div>
          </div>
          {errors.exchangeRate && touched.exchangeRate && (
            <div style={{ marginTop: "6px", fontSize: "13px", color: "#ef4444" }}>
              {errors.exchangeRate}
            </div>
          )}
        </div>

        {/* Notes Field */}
        <div style={{ marginBottom: "24px" }}>
          <label style={{
            display: "block",
            fontSize: "14px",
            fontWeight: "500",
            color: "#111827",
            marginBottom: "8px"
          }}>
            Notes <span style={{ color: "#ef4444" }}>*</span>
          </label>
          <div style={{ position: "relative" }}>
            <textarea
              value={formData.notes}
              onChange={(e) => {
                if (e.target.value.length <= 500) {
                  setFormData(prev => ({ ...prev, notes: e.target.value }));
                  if (touched.notes) validateField("notes", e.target.value);
                }
              }}
              onBlur={(e) => handleBlur("notes", e.target.value)}
              placeholder="Max. 500 characters"
              rows={4}
              style={{
                width: "100%",
                padding: "14px 16px",
                border: errors.notes && touched.notes ? "2px solid #ef4444" : "2px solid #e5e7eb",
                borderRadius: "12px",
                fontSize: "15px",
                outline: "none",
                resize: "vertical",
                fontFamily: "inherit",
                backgroundColor: "white",
                color: "#111827"
              }}
            />
            <div style={{
              position: "absolute",
              bottom: "12px",
              right: "12px",
              fontSize: "13px",
              color: formData.notes.length >= 500 ? "#ef4444" : "#6b7280"
            }}>
              {formData.notes.length}/500
            </div>
          </div>
          {errors.notes && touched.notes && (
            <div style={{ marginTop: "6px", fontSize: "13px", color: "#ef4444" }}>
              {errors.notes}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: "12px",
          paddingTop: "24px",
          borderTop: "1px solid #e5e7eb"
        }}>
          <button
            onClick={() => navigate(`/accountant/currency-adjustments/${id}`)}
            style={{
              padding: "12px 24px",
              backgroundColor: "transparent",
              border: "2px solid #e5e7eb",
              borderRadius: "12px",
              fontSize: "15px",
              fontWeight: "600",
              cursor: "pointer",
              color: "#6b7280"
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = "#f9fafb";
              e.target.style.borderColor = "#d1d5db";
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = "transparent";
              e.target.style.borderColor = "#e5e7eb";
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: "12px 32px",
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              border: "none",
              borderRadius: "12px",
              fontSize: "15px",
              fontWeight: "600",
              cursor: "pointer",
              color: "white",
              boxShadow: "0 4px 6px rgba(102, 126, 234, 0.4)"
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = "translateY(-2px) scale(1.02)";
              e.target.style.boxShadow = "0 8px 12px rgba(102, 126, 234, 0.5)";
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "translateY(0) scale(1)";
              e.target.style.boxShadow = "0 4px 6px rgba(102, 126, 234, 0.4)";
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default EditCurrencyAdjustment;

