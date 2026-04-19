import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useBankAccountCurrencies, useCurrency } from "../../hooks/useCurrency";
import { bankAccountsAPI } from "../../services/api";

export default function AddBankForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const isEditMode = location.state?.isEdit || false;
  const accountData = location.state?.account || null;

  // Fetch currencies from database
  const { currencies: currenciesData, loading: currenciesLoading } = useBankAccountCurrencies();
  const { baseCurrency } = useCurrency();

  const [formData, setFormData] = useState({
    accountType: accountData?.accountType || "Bank",
    accountName: accountData?.accountName || "",
    accountCode: accountData?.accountCode || "",
    currency: accountData?.currencyCode || "",
    accountNumber: accountData?.accountNumber || "",
    bankName: accountData?.bankName || "",
    bankIdentifierCode: accountData?.routingNumber || "",
    description: accountData?.description || "",
    isPrimary: accountData?.isPrimaryAccount || false
  });

  const [submitting, setSubmitting] = useState(false);

  const [isCurrencyDropdownOpen, setIsCurrencyDropdownOpen] = useState(false);
  const currencyDropdownRef = useRef(null);
  const [errors, setErrors] = useState<any>({});
  const [touched, setTouched] = useState<any>({});

  // Resolve default currency for new accounts:
  // - Prefer the organization base currency (from `useCurrency`)
  // - Fall back to the first currency returned for bank accounts
  // - Finally fall back to USD
  useEffect(() => {
    if (isEditMode || accountData?.currencyCode) return;
    if (touched?.currency) return;

    const preferredCurrency =
      baseCurrency?.code || currenciesData[0]?.code || "USD";

    setFormData(prev => {
      if (prev.currency === preferredCurrency) return prev;
      if (baseCurrency?.code) return { ...prev, currency: baseCurrency.code };
      if (!prev.currency) return { ...prev, currency: preferredCurrency };
      if (prev.currency === "USD" && preferredCurrency !== "USD") {
        return { ...prev, currency: preferredCurrency };
      }
      return prev;
    });
  }, [accountData?.currencyCode, baseCurrency?.code, currenciesData, isEditMode, touched?.currency]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (currencyDropdownRef.current && !(currencyDropdownRef.current as any).contains(event.target)) {
        setIsCurrencyDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const validateField = (name: string, value: any) => {
    const newErrors = { ...errors };
    if (name === "accountName" && (!value || value.trim() === "")) {
      newErrors[name] = "This field is required";
    } else if (name === "accountName" && value && value.trim() !== "") {
      delete newErrors[name];
    }
    setErrors(newErrors);
  };

  const handleBlur = (name: string, value: any) => {
    setTouched({ ...touched, [name]: true });
    validateField(name, value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || submitting) return;

    try {
      setSubmitting(true);
      const payload = {
        account_name: formData.accountName,
        account_type: formData.accountType, // backend uses 'bank' or 'credit_card'
        account_number: formData.accountNumber,
        account_code: formData.accountCode,
        currency_code: formData.currency,
        description: formData.description,
        bank_name: formData.bankName,
        routing_number: formData.bankIdentifierCode,
        is_primary_account: formData.isPrimary,
      };

      // Map account_type to lowercase for backend enum if needed
      if (payload.account_type === "Bank") payload.account_type = "bank";
      if (payload.account_type === "Credit Card") payload.account_type = "credit_card";

      if (isEditMode && accountData?._id) {
        await bankAccountsAPI.update(accountData._id, payload);
      } else {
        await bankAccountsAPI.create(payload);
      }

      navigate("/banking");
    } catch (error) {
      console.error("Failed to save bank account:", error);
      alert("Failed to save bank account. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Form is valid if all required fields are filled
  const isFormValid = formData.accountType &&
    formData.accountName &&
    formData.accountName.trim() !== "" &&
    formData.currency;

  return (
    <div style={{
      minHeight: "calc(100vh - 60px)",
      background: "#f9fafb",
      width: "100%",
      padding: "24px",
      position: "relative"
    }}>
      <div style={{
        backgroundColor: "white",
        borderRadius: "16px",
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
        maxWidth: "900px",
        margin: "0 auto",
        overflow: "hidden"
      }}>
        {/* Header */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "24px 32px",
          borderBottom: "1px solid #e5e7eb",
          background: "#156372"
        }}>
          <h1 style={{
            fontSize: "24px",
            fontWeight: "600",
            color: "white",
            margin: 0
          }}>
            {isEditMode ? "Edit Account" : "Add Bank or Credit Card"}
          </h1>
          <button
            onClick={() => {
              if (isEditMode) {
                navigate("/banking/account/" + (accountData?._id || ""), {
                  state: { account: accountData }
                });
              } else {
                navigate("/banking");
              }
            }}
            type="button"
            aria-label="Close"
            style={{
              background: "rgba(255, 255, 255, 0.2)",
              border: "none",
              cursor: "pointer",
              padding: "10px",
              display: "flex",
              alignItems: "center",
              borderRadius: "8px",
              transition: "all 0.3s ease"
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.backgroundColor = "rgba(255, 255, 255, 0.3)";
              (e.target as HTMLElement).style.transform = "rotate(90deg)";
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.backgroundColor = "rgba(255, 255, 255, 0.2)";
              (e.target as HTMLElement).style.transform = "rotate(0deg)";
            }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M15 5L5 15M5 5l10 10" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {submitting && (
          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(255, 255, 255, 0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10,
            borderRadius: "16px"
          }}>
            <div style={{ color: "#156372", fontWeight: "600" }}>Saving account details...</div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: "32px" }}>
          {/* Select Account Type - Only show when not in edit mode */}
          {!isEditMode && (
            <div style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              marginBottom: "24px"
            }}>
              <label
                htmlFor="account-type"
                style={{
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#111827",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px"
                }}
              >
                Select Account Type<span style={{ color: "#ef4444" }}>*</span>
              </label>
              <div style={{ flex: 1 }}>
                <div style={{
                  display: "flex",
                  gap: "24px"
                }}>
                  <label style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    cursor: "pointer",
                    fontSize: "14px",
                    color: "#111827"
                  }}>
                    <input
                      type="radio"
                      name="accountType"
                      value="Bank"
                      checked={formData.accountType === "Bank"}
                      onChange={(e) => setFormData(prev => ({ ...prev, accountType: e.target.value }))}
                      style={{
                        width: "18px",
                        height: "18px",
                        cursor: "pointer"
                      }}
                    />
                    Bank
                  </label>
                  <label style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    cursor: "pointer",
                    fontSize: "14px",
                    color: "#111827"
                  }}>
                    <input
                      type="radio"
                      name="accountType"
                      value="Credit Card"
                      checked={formData.accountType === "Credit Card"}
                      onChange={(e) => setFormData(prev => ({ ...prev, accountType: e.target.value }))}
                      style={{
                        width: "18px",
                        height: "18px",
                        cursor: "pointer"
                      }}
                    />
                    Credit Card
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Account Name */}
          <div style={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            marginBottom: "24px"
          }}>
            <label
              htmlFor="account-name"
              style={{
                fontSize: "14px",
                fontWeight: "500",
                color: "#111827",
                display: "flex",
                alignItems: "center",
                gap: "4px"
              }}
            >
              Account Name<span style={{ color: "#ef4444" }}>*</span>
            </label>
            <div style={{ position: "relative", flex: 1 }}>
              <input
                id="account-name"
                type="text"
                value={formData.accountName}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, accountName: e.target.value }));
                  if (touched.accountName) validateField("accountName", e.target.value);
                }}
                onBlur={(e) => {
                  handleBlur("accountName", e.target.value);
                  if (errors.accountName && touched.accountName) {
                    e.target.style.borderColor = "#ef4444";
                  } else if (formData.accountName && !errors.accountName) {
                    e.target.style.borderColor = "#10b981";
                  } else {
                    e.target.style.borderColor = "#e5e7eb";
                  }
                }}
                placeholder="Enter account name"
                required
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  border: errors.accountName && touched.accountName
                    ? "2px solid #ef4444"
                    : formData.accountName && !errors.accountName
                      ? "2px solid #10b981"
                      : "2px solid #e5e7eb",
                  borderRadius: "12px",
                  fontSize: "15px",
                  outline: "none",
                  background: "white",
                  color: "#111827",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
                }}
              />
              {errors.accountName && touched.accountName && (
                <div style={{
                  marginTop: "6px",
                  fontSize: "13px",
                  color: "#ef4444",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px"
                }}>
                  {errors.accountName}
                </div>
              )}
            </div>
          </div>

          {/* Account Code */}
          <div style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "24px",
            marginBottom: "24px"
          }}>
            <label style={{
              fontSize: "14px",
              fontWeight: "500",
              color: "#111827",
              minWidth: "200px",
              paddingTop: "10px"
            }}>
              Account Code
            </label>
            <div style={{ flex: 1 }}>
              <input
                type="text"
                value={formData.accountCode}
                onChange={(e) => setFormData(prev => ({ ...prev, accountCode: e.target.value }))}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  fontSize: "14px",
                  outline: "none",
                  background: "white",
                  color: "#111827"
                }}
              />
            </div>
          </div>

          {/* Currency - Only show when not in edit mode */}
          {!isEditMode && (
            <div style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "24px",
              marginBottom: "24px"
            }}>
              <label style={{
                fontSize: "14px",
                fontWeight: "500",
                color: "#111827",
                minWidth: "200px",
                paddingTop: "10px"
              }}>
                Currency<span style={{ color: "#ef4444", marginLeft: "4px" }}>*</span>
              </label>
              <div style={{ flex: 1, position: "relative" }} ref={currencyDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsCurrencyDropdownOpen(!isCurrencyDropdownOpen)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    border: isCurrencyDropdownOpen ? "1px solid #156372" : "1px solid #d1d5db",
                    borderRadius: "8px",
                    fontSize: "14px",
                    background: "white",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    color: "#111827"
                  }}
                >
                  <span>{formData.currency}</span>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="none"
                    style={{
                      transform: isCurrencyDropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.2s ease"
                    }}
                  >
                    <path d="M3.5 5.25l3.5 3.5 3.5-3.5" stroke="#6b7280" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                {isCurrencyDropdownOpen && (
                  <div
                    style={{
                      position: "absolute",
                      top: "calc(100% + 4px)",
                      left: 0,
                      right: 0,
                      backgroundColor: "white",
                      border: "1px solid #d1d5db",
                      borderRadius: "8px",
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                      zIndex: 1000,
                      maxHeight: "200px",
                      overflowY: "auto"
                    }}
                  >
                    {currenciesLoading ? (
                      <div style={{ padding: "10px 14px", fontSize: "14px", color: "#6b7280" }}>Loading...</div>
                    ) : (
                      currenciesData.map((currency) => (
                        <div
                          key={currency.code}
                          onClick={() => {
                            setFormData(prev => ({ ...prev, currency: currency.code }));
                            setTouched((prev: any) => ({ ...prev, currency: true }));
                            setIsCurrencyDropdownOpen(false);
                          }}
                          style={{
                            padding: "10px 14px",
                            cursor: "pointer",
                            fontSize: "14px",
                            backgroundColor: formData.currency === currency.code ? "#eff6ff" : "transparent"
                          }}
                        >
                          {currency.code}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Account Number */}
          {!isEditMode && formData.accountType === "Bank" && (
            <div style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "24px",
              marginBottom: "24px"
            }}>
              <label style={{
                fontSize: "14px",
                fontWeight: "500",
                color: "#111827",
                minWidth: "200px",
                paddingTop: "10px"
              }}>
                Account Number
              </label>
              <div style={{ flex: 1 }}>
                <input
                  type="text"
                  value={formData.accountNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, accountNumber: e.target.value }))}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    border: "1px solid #d1d5db",
                    borderRadius: "8px",
                    fontSize: "14px",
                    outline: "none",
                    background: "white",
                    color: "#111827"
                  }}
                />
              </div>
            </div>
          )}

          {/* Bank Name */}
          {!isEditMode && (
            <div style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "24px",
              marginBottom: "24px"
            }}>
              <label style={{
                fontSize: "14px",
                fontWeight: "500",
                color: "#111827",
                minWidth: "200px",
                paddingTop: "10px"
              }}>
                Bank Name
              </label>
              <div style={{ flex: 1 }}>
                <input
                  type="text"
                  value={formData.bankName}
                  onChange={(e) => setFormData(prev => ({ ...prev, bankName: e.target.value }))}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    border: "1px solid #d1d5db",
                    borderRadius: "8px",
                    fontSize: "14px",
                    outline: "none",
                    background: "white",
                    color: "#111827"
                  }}
                />
              </div>
            </div>
          )}

          {/* Bank Identifier Code */}
          {!isEditMode && formData.accountType === "Bank" && (
            <div style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "24px",
              marginBottom: "24px"
            }}>
              <label style={{
                fontSize: "14px",
                fontWeight: "500",
                color: "#111827",
                minWidth: "200px",
                paddingTop: "10px"
              }}>
                Bank Identifier Code
              </label>
              <div style={{ flex: 1 }}>
                <input
                  type="text"
                  value={formData.bankIdentifierCode}
                  onChange={(e) => setFormData(prev => ({ ...prev, bankIdentifierCode: e.target.value }))}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    border: "1px solid #d1d5db",
                    borderRadius: "8px",
                    fontSize: "14px",
                    outline: "none",
                    background: "white",
                    color: "#111827"
                  }}
                />
              </div>
            </div>
          )}

          {/* Description */}
          <div style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "24px",
            marginBottom: "24px"
          }}>
            <label style={{
              fontSize: "14px",
              fontWeight: "500",
              color: "#111827",
              minWidth: "200px",
              paddingTop: "10px"
            }}>
              Description
            </label>
            <div style={{ flex: 1 }}>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Max. 500 characters"
                maxLength={500}
                rows={4}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  fontSize: "14px",
                  outline: "none",
                  background: "white",
                  color: "#111827",
                  resize: "vertical"
                }}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "12px",
            paddingTop: "32px",
            borderTop: "1px solid #e5e7eb",
            marginTop: "24px"
          }}>
            <button
              type="button"
              onClick={() => navigate("/banking")}
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
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isFormValid || submitting}
              style={{
                padding: "12px 32px",
                background: isFormValid && !submitting ? "#156372" : "#d1d5db",
                border: "none",
                borderRadius: "12px",
                fontSize: "15px",
                fontWeight: "600",
                cursor: isFormValid && !submitting ? "pointer" : "not-allowed",
                color: "white"
              }}
            >
              {submitting ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
