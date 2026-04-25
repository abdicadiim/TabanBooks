import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { deleteJournalTemplate, getJournalTemplates } from "./accountantModel";

function JournalTemplates() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const response: any = await getJournalTemplates({ limit: 200, sortBy: "createdAt", sortOrder: "desc" });
      if (response?.success) {
        setTemplates(response.data || []);
      } else {
        setTemplates([]);
      }
    } catch {
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this template?")) return;
    const ok = await deleteJournalTemplate(id);
    if (ok) loadTemplates();
  };

  return (
    <div style={{ minHeight: "calc(100vh - 60px)", backgroundColor: "#f7f8fc", padding: "20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
        <button
          onClick={() => navigate("/accountant/manual-journals")}
          style={{ background: "none", border: "none", cursor: "pointer", padding: "8px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "4px" }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12.5 15L7.5 10l5-5" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div>
          <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>Manual Journals</div>
          <h1 style={{ fontSize: "24px", fontWeight: "600", margin: 0, color: "#111827" }}>Journal Templates</h1>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 24, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8 }}>Loading templates...</div>
      ) : templates.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 20px", minHeight: "calc(100vh - 200px)" }}>
          <h2 style={{ fontSize: "28px", fontWeight: "600", color: "#111827", marginBottom: "12px", textAlign: "center" }}>Create Templates to Record Transactions</h2>
          <p style={{ fontSize: "15px", color: "#6b7280", marginBottom: "32px", textAlign: "center", maxWidth: "500px", lineHeight: "1.6" }}>
            Quickly record journal entries for your frequent actions with journal templates. Go ahead and create your first template.
          </p>
          <button
            onClick={() => navigate("/accountant/manual-journals/templates/new")}
            style={{ padding: "12px 24px", backgroundColor: "#dc2626", color: "white", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: "500", cursor: "pointer" }}
          >
            New Template
          </button>
        </div>
      ) : (
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontWeight: 600, color: "#111827" }}>Templates ({templates.length})</div>
            <button
              onClick={() => navigate("/accountant/manual-journals/templates/new")}
              style={{ padding: "8px 14px", backgroundColor: "#dc2626", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 500 }}
            >
              New Template
            </button>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 12, color: "#6b7280" }}>Template Name</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 12, color: "#6b7280" }}>Reference#</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 12, color: "#6b7280" }}>Reporting Method</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 12, color: "#6b7280" }}>Currency</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 12, color: "#6b7280" }}>Created By</th>
                <th style={{ textAlign: "right", padding: "10px 12px", fontSize: 12, color: "#6b7280" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((t) => (
                <tr key={t._id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "10px 12px", color: "#111827" }}>{t.name}</td>
                  <td style={{ padding: "10px 12px", color: "#4b5563" }}>{t.referenceNumber || "-"}</td>
                  <td style={{ padding: "10px 12px", color: "#4b5563" }}>{t.reportingMethod || "accrual-and-cash"}</td>
                  <td style={{ padding: "10px 12px", color: "#4b5563" }}>{t.currency || "USD"}</td>
                  <td style={{ padding: "10px 12px", color: "#4b5563" }}>{t.createdBy?.name || t.createdBy?.email || "System"}</td>
                  <td style={{ padding: "10px 12px", textAlign: "right" }}>
                    <button
                      onClick={() => navigate("/accountant/manual-journals/new", { state: { templateData: t } })}
                      style={{ marginRight: 8, border: "1px solid #d1d5db", background: "#fff", borderRadius: 6, padding: "6px 10px", cursor: "pointer" }}
                    >
                      Use
                    </button>
                    <button
                      onClick={() => navigate("/accountant/manual-journals/templates/new", { state: { templateData: t } })}
                      style={{ marginRight: 8, border: "1px solid #d1d5db", background: "#fff", borderRadius: 6, padding: "6px 10px", cursor: "pointer" }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(t._id)}
                      style={{ border: "1px solid #fecaca", color: "#b91c1c", background: "#fff", borderRadius: 6, padding: "6px 10px", cursor: "pointer" }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default JournalTemplates;
