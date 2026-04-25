import React, { useState } from "react";

interface Approver {
  id: string | number;
  name: string;
  email: string;
}

interface ApprovalLevel {
  id: number;
  approver: string;
}

function JournalApprovals() {
  const [approvalType, setApprovalType] = useState("no-approval");
  const [approvers, setApprovers] = useState<Approver[]>([]);
  const [approvalLevels, setApprovalLevels] = useState<ApprovalLevel[]>([]);
  const [sendNotifications, setSendNotifications] = useState(false);
  const [notifySubmitter, setNotifySubmitter] = useState(false);
  const [notifyAllApprovers, setNotifyAllApprovers] = useState("non-approver");

  return (
    <div>
      {/* Approval Type */}
      <div style={{ marginBottom: "32px" }}>
        <h2 style={{
          fontSize: "18px",
          fontWeight: "600",
          marginBottom: "16px",
          color: "#111827"
        }}>
          Approval Type
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {[
            {
              value: "no-approval",
              label: "No Approval",
              description: "Create Journal and perform further actions without approval."
            },
            {
              value: "simple-approval",
              label: "Simple Approval",
              description: "Any user with approve permission can approve the Journal."
            },
            {
              value: "multi-level-approval",
              label: "Multi-Level Approval",
              description: "Set many levels of approval. The Journal will be approved only when all the approvers approve."
            }
          ].map((option) => (
            <label
              key={option.value}
              onClick={() => setApprovalType(option.value)}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "12px",
                padding: "16px",
                border: approvalType === option.value ? "2px solid #156372" : "1px solid #e5e7eb",
                borderRadius: "8px",
                cursor: "pointer",
                backgroundColor: approvalType === option.value ? "#eff6ff" : "white",
                transition: "all 0.2s"
              }}
            >
              <input
                type="radio"
                name="approvalType"
                value={option.value}
                checked={approvalType === option.value}
                onChange={() => setApprovalType(option.value)}
                style={{ marginTop: "2px", accentColor: "#156372" }}
              />
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: "15px",
                  fontWeight: "500",
                  color: "#111827",
                  marginBottom: "4px"
                }}>
                  {option.label}
                </div>
                <div style={{
                  fontSize: "13px",
                  color: "#6b7280"
                }}>
                  {option.description}
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Simple Approval - Approvers */}
      {approvalType === "simple-approval" && (
        <div style={{ marginBottom: "32px" }}>
          <h2 style={{
            fontSize: "18px",
            fontWeight: "600",
            marginBottom: "16px",
            color: "#111827"
          }}>
            Approvers
          </h2>
          {approvers.length === 0 ? (
            <p style={{ color: "#6b7280", fontSize: "14px" }}>No approvers added yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {approvers.map((approver) => (
                <div
                  key={approver.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "12px",
                    backgroundColor: "#f9fafb",
                    borderRadius: "6px"
                  }}
                >
                  <div style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    backgroundColor: "#10b981",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "600",
                    fontSize: "16px"
                  }}>
                    {approver.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "14px", fontWeight: "500", color: "#111827" }}>
                      {approver.name}
                    </div>
                    <div style={{ fontSize: "13px", color: "#6b7280" }}>
                      {approver.email}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Multi-Level Approval */}
      {approvalType === "multi-level-approval" && (
        <div style={{ marginBottom: "32px" }}>
          <h2 style={{
            fontSize: "18px",
            fontWeight: "600",
            marginBottom: "16px",
            color: "#111827"
          }}>
            SET THE APPROVAL HIERARCHY
          </h2>
          <div style={{
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            overflow: "hidden"
          }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ backgroundColor: "#f9fafb" }}>
                <tr>
                  <th style={{
                    padding: "12px 16px",
                    textAlign: "left",
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "#374151",
                    textTransform: "uppercase",
                    borderBottom: "1px solid #e5e7eb"
                  }}>
                    PRIORITY
                  </th>
                  <th style={{
                    padding: "12px 16px",
                    textAlign: "left",
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "#374151",
                    textTransform: "uppercase",
                    borderBottom: "1px solid #e5e7eb"
                  }}>
                    APPROVER NAME
                  </th>
                </tr>
              </thead>
              <tbody>
                {approvalLevels.length === 0 ? (
                  <tr>
                    <td colSpan={2} style={{ padding: "16px", textAlign: "center", color: "#6b7280" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                        <span>Level 1 : Approver</span>
                        <select
                          style={{
                            padding: "8px 12px",
                            border: "1px solid #e5e7eb",
                            borderRadius: "6px",
                            fontSize: "14px",
                            outline: "none"
                          }}
                        >
                          <option>Select approver</option>
                        </select>
                      </div>
                    </td>
                  </tr>
                ) : (
                  approvalLevels.map((level, index) => (
                    <tr key={level.id}>
                      <td style={{ padding: "12px 16px", fontSize: "14px", color: "#111827" }}>
                        Level {index + 1} : Approver
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <select
                          value={level.approver}
                          onChange={(e) => {
                            const updated = [...approvalLevels];
                            updated[index].approver = e.target.value;
                            setApprovalLevels(updated);
                          }}
                          style={{
                            padding: "8px 12px",
                            border: "1px solid #e5e7eb",
                            borderRadius: "6px",
                            fontSize: "14px",
                            outline: "none",
                            width: "100%"
                          }}
                        >
                          <option>Select approver</option>
                        </select>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <button
            onClick={() => {
              setApprovalLevels([...approvalLevels, { id: Date.now(), approver: "" }]);
            }}
            style={{
              marginTop: "12px",
              padding: "8px 16px",
              backgroundColor: "transparent",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
              fontSize: "14px",
              color: "#156372",
              cursor: "pointer"
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.backgroundColor = "#f3f4f6";
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.backgroundColor = "transparent";
            }}
          >
            + Add New Level
          </button>

          {/* NOTE Section */}
          <div style={{
            marginTop: "24px",
            padding: "16px",
            backgroundColor: "#f9fafb",
            borderRadius: "8px",
            border: "1px solid #e5e7eb"
          }}>
            <div style={{
              fontSize: "14px",
              fontWeight: "600",
              color: "#111827",
              marginBottom: "12px"
            }}>
              NOTE:
            </div>
            <ol style={{
              margin: 0,
              paddingLeft: "20px",
              fontSize: "13px",
              color: "#6b7280",
              lineHeight: "1.6"
            }}>
              <li style={{ marginBottom: "8px" }}>
                The approvers you select here can approve transactions directly from <strong>Taban Books Inventory</strong> if they are approvers in Taban Books Inventory as well.
              </li>
              <li>
                Admins can bypass multiple levels of approval and approve transactions once and for all. They can do this by selecting the transaction &gt; More &gt; Final Approve.
              </li>
            </ol>
          </div>
        </div>
      )}

      {/* Notification Preferences */}
      <div style={{
        marginTop: "32px",
        paddingTop: "32px",
        borderTop: "1px solid #e5e7eb"
      }}>
        <h2 style={{
          fontSize: "18px",
          fontWeight: "600",
          marginBottom: "16px",
          color: "#111827"
        }}>
          Notification Preferences
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={sendNotifications}
              onChange={(e) => setSendNotifications(e.target.checked)}
              style={{ accentColor: "#156372" }}
            />
            <span style={{ fontSize: "14px", color: "#111827" }}>
              Send email and in-app notifications when transactions are submitted for approval
            </span>
          </label>

          {sendNotifications && (
            <div style={{ paddingLeft: "24px", display: "flex", flexDirection: "column", gap: "12px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                <input
                  type="radio"
                  name="notifyApprovers"
                  value="non-approver"
                  checked={notifyAllApprovers === "non-approver"}
                  onChange={(e) => setNotifyAllApprovers(e.target.value)}
                  style={{ accentColor: "#156372" }}
                />
                <span style={{ fontSize: "14px", color: "#111827" }}>
                  Notify all approvers when a non-approver submits a transaction.
                </span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                <input
                  type="radio"
                  name="notifyApprovers"
                  value="all"
                  checked={notifyAllApprovers === "all"}
                  onChange={(e) => setNotifyAllApprovers(e.target.value)}
                  style={{ accentColor: "#156372" }}
                />
                <span style={{ fontSize: "14px", color: "#111827" }}>
                  Notify all approvers when an approver/non-approver submits a transaction.
                </span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                <input
                  type="radio"
                  name="notifyApprovers"
                  value="specific"
                  checked={notifyAllApprovers === "specific"}
                  onChange={(e) => setNotifyAllApprovers(e.target.value)}
                  style={{ accentColor: "#156372" }}
                />
                <span style={{ fontSize: "14px", color: "#111827" }}>
                  Notify a specific email address.
                </span>
              </label>
            </div>
          )}

          <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={notifySubmitter}
              onChange={(e) => setNotifySubmitter(e.target.checked)}
              style={{ accentColor: "#156372" }}
            />
            <span style={{ fontSize: "14px", color: "#111827" }}>
              Notify the submitter when a transaction is approved or rejected
            </span>
          </label>
        </div>
      </div>

      {/* Save Button */}
      <div style={{
        marginTop: "32px",
        paddingTop: "24px",
        borderTop: "1px solid #e5e7eb",
        display: "flex",
        justifyContent: "flex-end"
      }}>
        <button
          onClick={() => {
            // Save settings
            alert("Settings saved!");
          }}
          style={{
            padding: "10px 24px",
            backgroundColor: "#dc2626",
            color: "white",
            border: "none",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: "500",
            cursor: "pointer"
          }}
          onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = "#b91c1c"}
          onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = "#dc2626"}
        >
          Save
        </button>
      </div>
    </div>
  );
}

export default JournalApprovals;


