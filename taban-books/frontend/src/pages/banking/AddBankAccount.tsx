import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function AddBankAccount() {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPayPalModalOpen, setIsPayPalModalOpen] = useState(false);
  const [payPalStep, setPayPalStep] = useState(1); // 1 = account type selection, 2 = confirmation
  const [payPalAccountType, setPayPalAccountType] = useState(""); // "bank" or "credit"
  const [selectedProvider, setSelectedProvider] = useState("Yodlee");
  const [isProviderDropdownOpen, setIsProviderDropdownOpen] = useState(false);
  const [agreedToEULA, setAgreedToEULA] = useState(false);
  const providerDropdownRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        providerDropdownRef.current &&
        event.target instanceof Node &&
        !providerDropdownRef.current.contains(event.target)
      ) {
        setIsProviderDropdownOpen(false);
      }
    };

    if (isProviderDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isProviderDropdownOpen]);

  const providers = ["Yodlee", "Plaid", "Finicity"];

  const handleProceed = () => {
    if (agreedToEULA) {
      // Handle proceed logic here
      setIsModalOpen(false);
      setAgreedToEULA(false);
    }
  };

  const supportedBanks = [
    {
      id: 1,
      name: "PayPal",
      type: "bank",
      logo: "paypal"
    },
    {
      id: 2,
      name: "Bank of America (US) - Bank",
      type: "bank",
      logo: "boa"
    },
    {
      id: 3,
      name: "Commonwealth Bank (Australia)",
      type: "bank",
      logo: "cba"
    },
    {
      id: 4,
      name: "ANZ (Australia) - Banking",
      type: "bank",
      logo: "anz"
    },
    {
      id: 5,
      name: "TD Bank EasyWeb (Canada) - Banking",
      type: "bank",
      logo: "td"
    },
    {
      id: 6,
      name: "Scotiabank (Canada)",
      type: "bank",
      logo: "scotiabank"
    },
    {
      id: 7,
      name: "Bank of America (US) - Credit Card",
      type: "credit",
      logo: "boa"
    },
    {
      id: 8,
      name: "Discover (US) - Credit Card",
      type: "credit",
      logo: "discover"
    },
    {
      id: 9,
      name: "TD Bank EasyWeb (Canada) - Credit Card",
      type: "credit",
      logo: "td"
    }
  ];

  return (
    <div style={{ 
      minHeight: "calc(100vh - 60px)", 
      backgroundColor: "#f7f8fc", 
      paddingRight: "24px",
      paddingBottom: "24px"
    }}>
      <div style={{
        backgroundColor: "white",
        minHeight: "calc(100vh - 60px)",
        padding: "24px"
      }}>
        {/* Header */}
        <div style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: "32px",
          paddingBottom: "20px",
          borderBottom: "1px solid #e5e7eb"
        }}>
          <div style={{ flex: 1 }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "12px"
            }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 2L12.09 7.26L18 8.27L14 12.14L14.91 18.02L10 15.77L5.09 18.02L6 12.14L2 8.27L7.91 7.26L10 2Z" fill="#156372" fillOpacity="0.2"/>
                <path d="M10 2L11.18 5.18L14.5 5.59L12 8L12.68 11.5L10 9.68L7.32 11.5L8 8L5.5 5.59L8.82 5.18L10 2Z" fill="#156372"/>
              </svg>
              <h1 style={{
                fontSize: "24px",
                fontWeight: "600",
                color: "#111827",
                margin: 0
              }}>
                Connect and Add Your Bank Accounts or Credit Cards
              </h1>
            </div>
            <p style={{
              fontSize: "14px",
              color: "#6b7280",
              lineHeight: "1.6",
              margin: 0,
              maxWidth: "800px"
            }}>
              Connect your bank accounts to fetch the bank feeds using one of our third-party bank feeds service providers. Or, you can add your bank accounts manually and import bank feeds.
            </p>
          </div>
          <button
            onClick={() => navigate("/banking")}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "4px",
              marginLeft: "16px"
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f3f4f6"}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M15 5L5 15M5 5l10 10" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Automatic Bank Feeds Section */}
        <div style={{
          marginBottom: "40px"
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "12px"
          }}>
            <div>
              <h2 style={{
                fontSize: "18px",
                fontWeight: "600",
                color: "#111827",
                margin: "0 0 8px 0"
              }}>
                Automatic Bank Feeds Supported Banks
              </h2>
              <p style={{
                fontSize: "14px",
                color: "#6b7280",
                margin: 0
              }}>
                Connect your bank accounts and fetch the bank feeds using one of our third-party bank feeds service providers.
              </p>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              style={{
                padding: "10px 20px",
                backgroundColor: "#156372",
                color: "white",
                border: "none",
                borderRadius: "6px",
                fontSize: "14px",
                fontWeight: "500",
                cursor: "pointer",
                transition: "background-color 0.2s ease",
                whiteSpace: "nowrap",
                outline: "none"
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#0e4a5e"}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#156372"}
              onFocus={(e) => e.currentTarget.style.outline = "none"}
            >
              Connect Now
            </button>
          </div>

          {/* Bank Cards Grid */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "16px",
            marginBottom: "16px"
          }}>
            {supportedBanks.map((bank) => (
              <div
                key={bank.id}
                onClick={() => {
                  if (bank.name === "PayPal") {
                    setIsPayPalModalOpen(true);
                  } else {
                    setIsModalOpen(true);
                  }
                }}
                style={{
                  backgroundColor: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  padding: "20px",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  cursor: "pointer",
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#156372";
                  e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#e5e7eb";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                {/* Bank Logo Placeholder */}
                <div style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "8px",
                  backgroundColor: bank.logo === "paypal" ? "#0070ba" :
                                   bank.logo === "boa" ? "#e31837" :
                                   bank.logo === "cba" ? "#ffcc00" :
                                   bank.logo === "anz" ? "#0174c3" :
                                   bank.logo === "td" ? "#00a550" :
                                   bank.logo === "scotiabank" ? "#e31837" :
                                   bank.logo === "discover" ? "#ff6000" : "#f3f4f6",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}>
                  {bank.logo === "paypal" ? (
                    <span style={{ color: "white", fontWeight: "600", fontSize: "12px" }}>PP</span>
                  ) : bank.logo === "boa" ? (
                    <span style={{ color: "white", fontWeight: "600", fontSize: "12px" }}>BOA</span>
                  ) : bank.logo === "cba" ? (
                    <span style={{ color: "#111827", fontWeight: "600", fontSize: "12px" }}>CBA</span>
                  ) : bank.logo === "anz" ? (
                    <span style={{ color: "white", fontWeight: "600", fontSize: "12px" }}>ANZ</span>
                  ) : bank.logo === "td" ? (
                    <span style={{ color: "white", fontWeight: "600", fontSize: "12px" }}>TD</span>
                  ) : bank.logo === "scotiabank" ? (
                    <span style={{ color: "white", fontWeight: "600", fontSize: "12px" }}>SB</span>
                  ) : bank.logo === "discover" ? (
                    <span style={{ color: "white", fontWeight: "600", fontSize: "12px" }}>D</span>
                  ) : (
                    <span style={{ color: "#6b7280", fontWeight: "600", fontSize: "12px" }}>B</span>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "#111827",
                    marginBottom: "4px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px"
                  }}>
                    <span style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap"
                    }}>
                      {bank.name}
                    </span>
                    {bank.type === "credit" && (
                      <div style={{
                        width: "20px",
                        height: "20px",
                        borderRadius: "50%",
                        backgroundColor: "#156372",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0
                      }}>
                        <span style={{
                          color: "white",
                          fontSize: "12px",
                          fontWeight: "600"
                        }}>C</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Credit Card Legend */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "14px",
            color: "#6b7280"
          }}>
            <span>→</span>
            <span>Credit Card</span>
          </div>
        </div>

        {/* Manual Add Section */}
        <div style={{
          backgroundColor: "#f9fafb",
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
          padding: "24px"
        }}>
          <div style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "16px"
          }}>
            <div style={{ flex: 1 }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "8px"
              }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M4 4h12v12H4V4z" stroke="#6b7280" strokeWidth="1.5" fill="none"/>
                  <path d="M4 8h12M8 4v12" stroke="#6b7280" strokeWidth="1.5"/>
                </svg>
                <h3 style={{
                  fontSize: "16px",
                  fontWeight: "600",
                  color: "#111827",
                  margin: 0
                }}>
                  Add bank or credit card account manually
                </h3>
              </div>
              <p style={{
                fontSize: "14px",
                color: "#6b7280",
                lineHeight: "1.6",
                margin: 0
              }}>
                Unable to connect your bank or credit card account using our Service Provider? Add the accounts manually using your account details.
              </p>
            </div>
            <button
              onClick={() => navigate("/banking/add-account/form")}
              style={{
                padding: "10px 20px",
                backgroundColor: "#156372",
                color: "white",
                border: "none",
                borderRadius: "6px",
                fontSize: "14px",
                fontWeight: "500",
                cursor: "pointer",
                transition: "background-color 0.2s ease",
                whiteSpace: "nowrap",
                alignSelf: "flex-start",
                outline: "none"
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#0e4a5e"}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#156372"}
              onFocus={(e) => e.currentTarget.style.outline = "none"}
            >
              Add Account
            </button>
          </div>
        </div>
      </div>

      {/* Connect Modal */}
      {isModalOpen && (
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
            zIndex: 10000
          }}
          onClick={() => setIsModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "12px",
              width: "90%",
              maxWidth: "600px",
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              padding: "24px",
              borderBottom: "1px solid #e5e7eb"
            }}>
              <div style={{ flex: 1, paddingRight: "16px" }}>
                <h2 style={{
                  fontSize: "20px",
                  fontWeight: "600",
                  color: "#111827",
                  margin: "0 0 8px 0"
                }}>
                  Connect and add your bank or credit card accounts
                </h2>
                <p style={{
                  fontSize: "14px",
                  color: "#6b7280",
                  lineHeight: "1.6",
                  margin: 0
                }}>
                  Choose the bank feeds service provider, and read and agree to the End User License Agreement to connnect your bank.
                </p>
              </div>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setAgreedToEULA(false);
                }}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "4px",
                  flexShrink: 0
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f3f4f6"}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M15 5L5 15M5 5l10 10" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div style={{
              padding: "24px",
              overflowY: "auto",
              flex: 1
            }}>
              {/* Top Section - Horizontal Layout */}
              <div style={{
                display: "flex",
                gap: "24px",
                marginBottom: "24px",
                alignItems: "flex-start"
              }}>
                {/* Bank Feeds Service Provider */}
                <div style={{ flex: 1 }}>
                  <label style={{
                    display: "block",
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "#111827",
                    marginBottom: "8px"
                  }}>
                    Bank Feeds Service Provider:
                  </label>
                  <div style={{ position: "relative" }} ref={providerDropdownRef}>
                    <button
                      onClick={() => setIsProviderDropdownOpen(!isProviderDropdownOpen)}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        border: isProviderDropdownOpen ? "1px solid #156372" : "1px solid #d1d5db",
                        borderRadius: "8px",
                        fontSize: "14px",
                        background: "#f9fafb",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        color: "#111827",
                        transition: "all 0.2s ease"
                      }}
                    >
                      <span style={{ color: "#156372", fontWeight: "500" }}>{selectedProvider}</span>
                      <svg 
                        width="14" 
                        height="14" 
                        viewBox="0 0 14 14" 
                        fill="none"
                        style={{
                          transform: isProviderDropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                          transition: "transform 0.2s ease"
                        }}
                      >
                        <path d="M3.5 5.25l3.5 3.5 3.5-3.5" stroke="#156372" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>

                    {isProviderDropdownOpen && (
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
                        onClick={(e) => e.stopPropagation()}
                      >
                        {providers.map((provider) => (
                          <div
                            key={provider}
                            onClick={() => {
                              setSelectedProvider(provider);
                              setIsProviderDropdownOpen(false);
                            }}
                            style={{
                              padding: "10px 14px",
                              cursor: "pointer",
                              fontSize: "14px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              backgroundColor: selectedProvider === provider ? "#eff6ff" : "transparent",
                              color: selectedProvider === provider ? "#156372" : "#111827",
                              transition: "all 0.15s ease"
                            }}
                            onMouseEnter={(e) => {
                              if (selectedProvider !== provider) {
                                e.currentTarget.style.backgroundColor = "#f9fafb";
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (selectedProvider !== provider) {
                                e.currentTarget.style.backgroundColor = "transparent";
                              }
                            }}
                          >
                            <span>{provider}</span>
                            {selectedProvider === provider && (
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path 
                                  d="M13 4l-6 6-3-3" 
                                  stroke="#156372" 
                                  strokeWidth="2" 
                                  strokeLinecap="round" 
                                  strokeLinejoin="round"
                                />
                              </svg>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* EULA Section */}
                <div style={{
                  flex: 1,
                  backgroundColor: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  borderRadius: "8px",
                  padding: "16px"
                }}>
                  <div style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "12px"
                  }}>
                    <div style={{
                      width: "24px",
                      height: "24px",
                      borderRadius: "50%",
                      backgroundColor: "#156372",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0
                    }}>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M7 3.5v4.5M7 10.5h.01" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                        <circle cx="7" cy="7" r="6" stroke="white" strokeWidth="1.5" fill="none"/>
                      </svg>
                    </div>
                    <p style={{
                      fontSize: "14px",
                      color: "#1e40af",
                      lineHeight: "1.6",
                      margin: 0,
                      flex: 1
                    }}>
                      The End User License Agreement (EULA) describes the terms and conditions under which you may use the Automatic Bank Feeds for the selected bank feeds service provider. Kindly read and agree to all the end user terms to proceed.
                    </p>
                  </div>
                </div>
              </div>

              {/* Agreement Checkbox */}
              <div style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "12px"
              }}>
                <input
                  type="checkbox"
                  id="eula-checkbox"
                  checked={agreedToEULA}
                  onChange={(e) => setAgreedToEULA(e.target.checked)}
                  style={{
                    width: "18px",
                    height: "18px",
                    cursor: "pointer",
                    marginTop: "2px",
                    flexShrink: 0
                  }}
                />
                <label
                  htmlFor="eula-checkbox"
                  style={{
                    fontSize: "14px",
                    color: "#111827",
                    lineHeight: "1.6",
                    cursor: "pointer",
                    flex: 1
                  }}
                >
                  I have read and agree to all the{" "}
                  <span
                    style={{
                      color: "#156372",
                      textDecoration: "underline",
                      cursor: "pointer"
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      // Handle link click - could open EULA in new tab
                    }}
                  >
                    end user terms for automatic bank feeds
                  </span>
                  .
                </label>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              display: "flex",
              justifyContent: "flex-start",
              gap: "12px",
              padding: "20px 24px",
              borderTop: "1px solid #e5e7eb"
            }}>
              <button
                onClick={handleProceed}
                disabled={!agreedToEULA}
                style={{
                  padding: "10px 24px",
                  backgroundColor: agreedToEULA ? "#156372" : "#9ca3af",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "14px",
                  fontWeight: "500",
                  cursor: agreedToEULA ? "pointer" : "not-allowed",
                  transition: "background-color 0.2s ease"
                }}
                onMouseOver={(e) => {
                  if (agreedToEULA) {
                    e.currentTarget.style.backgroundColor = "#0e4a5e";
                  }
                }}
                onMouseOut={(e) => {
                  if (agreedToEULA) {
                    e.currentTarget.style.backgroundColor = "#156372";
                  }
                }}
              >
                Proceed
              </button>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setAgreedToEULA(false);
                }}
                style={{
                  padding: "10px 24px",
                  backgroundColor: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: "6px",
                  fontSize: "14px",
                  fontWeight: "500",
                  cursor: "pointer",
                  color: "#6b7280",
                  transition: "background-color 0.2s ease, border-color 0.2s ease"
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = "#f9fafb";
                  e.currentTarget.style.borderColor = "#d1d5db";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = "white";
                  e.currentTarget.style.borderColor = "#e5e7eb";
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PayPal Integration Modal */}
      {isPayPalModalOpen && (
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
            zIndex: 10000
          }}
          onClick={() => setIsPayPalModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "12px",
              width: "90%",
              maxWidth: "500px",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "20px 24px",
              borderBottom: "1px solid #e5e7eb"
            }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "12px"
              }}>
                {payPalStep === 2 && (
                  <div style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "6px",
                    backgroundColor: "#0070ba",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M10 2C5.6 2 2 5.6 2 10s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm0 14c-3.3 0-6-2.7-6-6s2.7-6 6-6 6 2.7 6 6-2.7 6-6 6z" fill="white"/>
                      <path d="M10 6v4M10 12h.01" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </div>
                )}
                <h2 style={{
                  fontSize: "18px",
                  fontWeight: "600",
                  color: "#111827",
                  margin: 0
                }}>
                  Proceed To Paypal
                </h2>
              </div>
              <button
                onClick={() => {
                  setIsPayPalModalOpen(false);
                  setPayPalStep(1);
                  setPayPalAccountType("");
                }}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "4px"
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f3f4f6"}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M15 5L5 15M5 5l10 10" stroke="#111827" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            {payPalStep === 1 ? (
              <div style={{
                padding: "24px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center"
              }}>
                {/* PayPal Logo */}
                <div style={{
                  marginBottom: "24px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <div style={{
                    width: "80px",
                    height: "80px",
                    borderRadius: "12px",
                    backgroundColor: "#0070ba",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative"
                  }}>
                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                      <path d="M24 8C15.2 8 8 15.2 8 24s7.2 16 16 16 16-7.2 16-16S32.8 8 24 8zm0 28c-6.6 0-12-5.4-12-12S17.4 12 24 12s12 5.4 12 12-5.4 12-12 12z" fill="white"/>
                      <path d="M20 18h8v2h-8v-2zm0 4h8v2h-8v-2zm0 4h6v2h-6v-2z" fill="white"/>
                    </svg>
                  </div>
                </div>

                {/* Description Text */}
                <p style={{
                  fontSize: "16px",
                  color: "#111827",
                  lineHeight: "1.6",
                  marginBottom: "32px",
                  maxWidth: "400px"
                }}>
                  Initiate automatic bank feeds. Now directly from PayPal.
                  <br />
                  Stop worrying about sharing your credentials to fetch transactions!
                  <br />
                  Let PayPal do it all for you.
                </p>

                {/* Account Type Selection */}
                <div style={{
                  display: "flex",
                  gap: "16px",
                  width: "100%",
                  maxWidth: "400px"
                }}>
                  {/* Bank Account Button */}
                  <button
                    onClick={() => {
                      setPayPalAccountType("bank");
                      setPayPalStep(2);
                    }}
                    style={{
                      flex: 1,
                      padding: "24px 20px",
                      backgroundColor: "white",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "12px",
                      transition: "all 0.2s ease"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "#156372";
                      e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.1)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "#e5e7eb";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    <div style={{
                      width: "48px",
                      height: "48px",
                      borderRadius: "8px",
                      backgroundColor: "#eff6ff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}>
                      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                        <rect x="4" y="10" width="24" height="18" rx="2" stroke="#156372" strokeWidth="2" fill="none"/>
                        <path d="M4 16h24" stroke="#156372" strokeWidth="2"/>
                        <path d="M8 10V6a8 8 0 0 1 16 0v4" stroke="#156372" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </div>
                    <span style={{
                      fontSize: "14px",
                      fontWeight: "500",
                      color: "#111827"
                    }}>
                      Bank Account
                    </span>
                  </button>

                  {/* Credit Card Button */}
                  <button
                    onClick={() => {
                      setPayPalAccountType("credit");
                      setPayPalStep(2);
                    }}
                    style={{
                      flex: 1,
                      padding: "24px 20px",
                      backgroundColor: "white",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "12px",
                      transition: "all 0.2s ease"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "#156372";
                      e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.1)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "#e5e7eb";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    <div style={{
                      width: "48px",
                      height: "48px",
                      borderRadius: "8px",
                      backgroundColor: "#eff6ff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}>
                      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                        <rect x="4" y="8" width="24" height="18" rx="2" stroke="#156372" strokeWidth="2" fill="none"/>
                        <rect x="8" y="14" width="16" height="2" rx="1" fill="#156372"/>
                        <rect x="8" y="18" width="12" height="2" rx="1" fill="#156372"/>
                        <circle cx="24" cy="20" r="2" stroke="#156372" strokeWidth="2" fill="none"/>
                      </svg>
                    </div>
                    <span style={{
                      fontSize: "14px",
                      fontWeight: "500",
                      color: "#111827"
                    }}>
                      Credit Card
                    </span>
                  </button>
                </div>
              </div>
            ) : (
              /* Step 2: Confirmation */
              <div style={{
                padding: "24px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center"
              }}>
                {/* Question */}
                <p style={{
                  fontSize: "16px",
                  color: "#111827",
                  lineHeight: "1.6",
                  marginBottom: "32px",
                  maxWidth: "400px"
                }}>
                  Would you like to add your Paypal account to receive {payPalAccountType === "bank" ? "bank feeds" : "credit card feeds"}?
                </p>

                {/* Action Buttons */}
                <div style={{
                  display: "flex",
                  gap: "12px",
                  width: "100%",
                  maxWidth: "400px"
                }}>
                  <button
                    onClick={() => {
                      // Redirect to PayPal connection page
                      window.open("https://paypal.com/bizsignup/partner#/checkAccount", "_blank");
                      setIsPayPalModalOpen(false);
                      setPayPalStep(1);
                      setPayPalAccountType("");
                    }}
                    style={{
                      flex: 1,
                      padding: "10px 20px",
                      backgroundColor: "#156372",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      fontSize: "14px",
                      fontWeight: "500",
                      cursor: "pointer",
                      transition: "background-color 0.2s ease",
                      outline: "none"
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#0e4a5e"}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#156372"}
                    onFocus={(e) => e.currentTarget.style.outline = "none"}
                  >
                    Yes, Configure {payPalAccountType === "bank" ? "bank account" : "Credit Card"}
                  </button>
                  <button
                    onClick={() => {
                      setIsPayPalModalOpen(false);
                      setPayPalStep(1);
                      setPayPalAccountType("");
                    }}
                    style={{
                      flex: 1,
                      padding: "10px 20px",
                      backgroundColor: "white",
                      color: "#111827",
                      border: "1px solid #e5e7eb",
                      borderRadius: "6px",
                      fontSize: "14px",
                      fontWeight: "500",
                      cursor: "pointer",
                      transition: "background-color 0.2s ease, border-color 0.2s ease"
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = "#f9fafb";
                      e.currentTarget.style.borderColor = "#d1d5db";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = "white";
                      e.currentTarget.style.borderColor = "#e5e7eb";
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

