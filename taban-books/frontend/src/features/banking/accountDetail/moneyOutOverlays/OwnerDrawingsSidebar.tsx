import type { AccountDetailController } from "../types";

type OwnerDrawingsSidebarProps = Pick<
  AccountDetailController,
  | "ownerDrawingsFormData"
  | "setOwnerDrawingsFormData"
  | "ownerDrawingsToAccountOpen"
  | "setOwnerDrawingsToAccountOpen"
  | "ownerDrawingsToAccountRef"
  | "ownerDrawingsFileInputRef"
  | "transferAccountSelectionOptions"
  | "handleSaveOwnerDrawings"
  | "setShowOwnerDrawingsSidebar"
>;

export function OwnerDrawingsSidebar(props: OwnerDrawingsSidebarProps) {
  const {
    ownerDrawingsFormData,
    setOwnerDrawingsFormData,
    ownerDrawingsToAccountOpen,
    setOwnerDrawingsToAccountOpen,
    ownerDrawingsToAccountRef,
    ownerDrawingsFileInputRef,
    transferAccountSelectionOptions,
    handleSaveOwnerDrawings,
    setShowOwnerDrawingsSidebar,
  } = props;

  return (
<div
          style={{
            position: "fixed",
            top: 0,
            right: 0,
            bottom: 0,
            width: "500px",
            backgroundColor: "white",
            boxShadow: "-4px 0 6px rgba(0, 0, 0, 0.1)",
            zIndex: 10001,
            display: "flex",
            flexDirection: "column",
            overflowY: "auto"
          }}
        >
          {/* Header */}
          <div style={{
            padding: "24px",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}>
            <h2 style={{
              fontSize: "20px",
              fontWeight: "600",
              color: "#111827",
              margin: 0
            }}>
              Owner Drawings
            </h2>
            <button
              onClick={() => setShowOwnerDrawingsSidebar(false)}
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
              onMouseEnter={(e) => e.target.style.backgroundColor = "#f3f4f6"}
              onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M15 5L5 15M5 5l10 10" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* Form Content */}
          <div style={{
            padding: "24px",
            flex: 1,
            overflowY: "auto"
          }}>
            {/* To Account */}
            <div style={{ marginBottom: "24px" }}>
              <label style={{
                display: "block",
                fontSize: "14px",
                fontWeight: "500",
                color: "#111827",
                marginBottom: "8px"
              }}>
                To Account<span style={{ color: "#ef4444" }}>*</span>
              </label>
              <div style={{ position: "relative" }} ref={ownerDrawingsToAccountRef}>
                <button
                  type="button"
                  onClick={() => setOwnerDrawingsToAccountOpen(!ownerDrawingsToAccountOpen)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    fontSize: "14px",
                    background: "white",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    textAlign: "left",
                    color: ownerDrawingsFormData.toAccount ? "#111827" : "#9ca3af"
                  }}
                >
                  <span>{ownerDrawingsFormData.toAccount || "Select an account"}</span>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M3.5 5.25l3.5 3.5 3.5-3.5" stroke="#6b7280" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                {ownerDrawingsToAccountOpen && (
                  <div style={{
                    position: "absolute",
                    top: "calc(100% + 4px)",
                    left: 0,
                    right: 0,
                    backgroundColor: "white",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                    zIndex: 1000,
                    maxHeight: "200px",
                    overflowY: "auto"
                  }}>
                    {transferAccountSelectionOptions.map((acc) => (
                      <div
                        key={acc}
                        onClick={() => {
                          setOwnerDrawingsFormData({ ...ownerDrawingsFormData, toAccount: acc });
                          setOwnerDrawingsToAccountOpen(false);
                        }}
                        style={{
                          padding: "10px 14px",
                          cursor: "pointer",
                          fontSize: "14px",
                          color: "#111827",
                          backgroundColor: ownerDrawingsFormData.toAccount === acc ? "#eff6ff" : "transparent"
                        }}
                        onMouseEnter={(e) => {
                          if (ownerDrawingsFormData.toAccount !== acc) {
                            e.currentTarget.style.backgroundColor = "#f9fafb";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (ownerDrawingsFormData.toAccount !== acc) {
                            e.currentTarget.style.backgroundColor = "transparent";
                          }
                        }}
                      >
                        {acc}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Reporting Tags */}
            <div style={{ marginBottom: "24px" }}>
              <label style={{
                display: "block",
                fontSize: "14px",
                fontWeight: "500",
                color: "#111827",
                marginBottom: "8px"
              }}>
                Reporting Tags
              </label>
              <button
                type="button"
                onClick={() => console.log("Associate Tags")}
                style={{
                  background: "none",
                  border: "none",
                  color: "#156372",
                  fontSize: "12px",
                  cursor: "pointer",
                  padding: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: "4px"
                }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M6 1L7.5 4.5L11 6L7.5 7.5L6 11L4.5 7.5L1 6L4.5 4.5L6 1Z" stroke="#156372" strokeWidth="1.5" fill="none" />
                </svg>
                Associate Tags
              </button>
            </div>

            {/* Date */}
            <div style={{ marginBottom: "24px" }}>
              <label style={{
                display: "block",
                fontSize: "14px",
                fontWeight: "500",
                color: "#111827",
                marginBottom: "8px"
              }}>
                Date<span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                type="text"
                value={ownerDrawingsFormData.date}
                onChange={(e) => setOwnerDrawingsFormData({ ...ownerDrawingsFormData, date: e.target.value })}
                placeholder="dd/MM/yyyy"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "14px",
                  outline: "none"
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#156372";
                  e.target.style.boxShadow = "0 0 0 3px rgba(38, 99, 235, 0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#d1d5db";
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>

            {/* Amount */}
            <div style={{ marginBottom: "24px" }}>
              <label style={{
                display: "block",
                fontSize: "14px",
                fontWeight: "500",
                color: "#111827",
                marginBottom: "8px"
              }}>
                Amount<span style={{ color: "#ef4444" }}>*</span>
              </label>
              <div style={{ display: "flex", gap: "8px" }}>
                <div style={{
                  padding: "10px 14px",
                  backgroundColor: "#f9fafb",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "14px",
                  color: "#6b7280",
                  minWidth: "80px",
                  textAlign: "center",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  {ownerDrawingsFormData.currency}
                </div>
                <input
                  type="text"
                  value={ownerDrawingsFormData.amount}
                  onChange={(e) => setOwnerDrawingsFormData({ ...ownerDrawingsFormData, amount: e.target.value })}
                  placeholder="0.00"
                  style={{
                    flex: 1,
                    padding: "10px 14px",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    fontSize: "14px",
                    outline: "none"
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#156372";
                    e.target.style.boxShadow = "0 0 0 3px rgba(38, 99, 235, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#d1d5db";
                    e.target.style.boxShadow = "none";
                  }}
                />
              </div>
            </div>

            {/* Reference# */}
            <div style={{ marginBottom: "24px" }}>
              <label style={{
                display: "block",
                fontSize: "14px",
                fontWeight: "500",
                color: "#111827",
                marginBottom: "8px"
              }}>
                Reference#
              </label>
              <input
                type="text"
                value={ownerDrawingsFormData.reference}
                onChange={(e) => setOwnerDrawingsFormData({ ...ownerDrawingsFormData, reference: e.target.value })}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "14px",
                  outline: "none"
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#156372";
                  e.target.style.boxShadow = "0 0 0 3px rgba(38, 99, 235, 0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#d1d5db";
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>

            {/* Description */}
            <div style={{ marginBottom: "24px" }}>
              <label style={{
                display: "block",
                fontSize: "14px",
                fontWeight: "500",
                color: "#111827",
                marginBottom: "8px"
              }}>
                Description
              </label>
              <textarea
                value={ownerDrawingsFormData.description}
                onChange={(e) => setOwnerDrawingsFormData({ ...ownerDrawingsFormData, description: e.target.value })}
                placeholder="Max. 500 characters"
                maxLength={500}
                rows={4}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "14px",
                  outline: "none",
                  resize: "vertical",
                  fontFamily: "inherit"
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#156372";
                  e.target.style.boxShadow = "0 0 0 3px rgba(38, 99, 235, 0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#d1d5db";
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>

            {/* Attachments */}
            <div style={{ marginBottom: "24px" }}>
              <label style={{
                display: "block",
                fontSize: "14px",
                fontWeight: "500",
                color: "#111827",
                marginBottom: "8px"
              }}>
                Attachments
              </label>
              <input
                type="file"
                ref={ownerDrawingsFileInputRef}
                multiple
                accept="image/*,.pdf"
                onChange={(e) => {
                  const files = Array.from(e.target.files);
                  setOwnerDrawingsFormData({ ...ownerDrawingsFormData, files: [...ownerDrawingsFormData.files, ...files] });
                }}
                style={{ display: "none" }}
              />
              <button
                type="button"
                onClick={() => ownerDrawingsFileInputRef.current?.click()}
                style={{
                  padding: "10px 16px",
                  backgroundColor: "white",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "14px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  color: "#111827"
                }}
                onMouseEnter={(e) => {
                  e.target.style.borderColor = "#156372";
                  e.target.style.backgroundColor = "#f9fafb";
                }}
                onMouseLeave={(e) => {
                  e.target.style.borderColor = "#d1d5db";
                  e.target.style.backgroundColor = "white";
                }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 2v12M2 8h12" stroke="#156372" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                Upload File
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M3.5 5.25l3.5 3.5 3.5-3.5" stroke="#6b7280" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <p style={{
                fontSize: "12px",
                color: "#6b7280",
                margin: "8px 0 0 0"
              }}>
                You can upload a maximum of 5 files, 10MB each.
              </p>
            </div>
          </div>

          {/* Footer Buttons */}
          <div style={{
            padding: "24px",
            borderTop: "1px solid #e5e7eb",
            display: "flex",
            justifyContent: "flex-end",
            gap: "12px"
          }}>
            <button
              type="button"
              onClick={() => setShowOwnerDrawingsSidebar(false)}
              style={{
                padding: "10px 20px",
                backgroundColor: "white",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "14px",
                fontWeight: "500",
                cursor: "pointer",
                color: "#111827"
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = "#f9fafb";
                e.target.style.borderColor = "#9ca3af";
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = "white";
                e.target.style.borderColor = "#d1d5db";
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                handleSaveOwnerDrawings();
              }}
              style={{
                padding: "10px 20px",
                backgroundColor: "#156372",
                color: "white",
                border: "none",
                borderRadius: "6px",
                fontSize: "14px",
                fontWeight: "500",
                cursor: "pointer"
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = "#0e4a5e"}
              onMouseOut={(e) => e.target.style.backgroundColor = "#156372"}
            >
              Save
            </button>
          </div>
        </div>
  );
}
