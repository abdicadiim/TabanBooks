import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { jsPDF } from "jspdf";
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  DollarSign,
  FileText,
  Link as LinkIcon,
  Plus,
  Repeat,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { expensesAPI, recurringExpensesAPI } from "../../../services/api";
import { useCurrency } from "../../../hooks/useCurrency";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const normalizeAttachments = (raw: any[] = []) =>
  Array.isArray(raw)
    ? raw
        .map((file: any, index: number) => ({
          id: String(file?.id || file?._id || `att-${Date.now()}-${index}`),
          name: String(file?.name || `Attachment ${index + 1}`),
          size: Number(file?.size || 0),
          type: String(file?.type || ""),
          url: String(file?.url || file?.fileUrl || file?.base64 || "").trim(),
          uploadedAt: file?.uploadedAt || file?.createdAt || new Date().toISOString(),
        }))
        .filter((file) => file.url)
    : [];

const toDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
    reader.readAsDataURL(file);
  });

const formatSize = (bytes: number) => {
  if (!bytes || !Number.isFinite(bytes)) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function RecurringExpenseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { code: baseCurrencyCode, symbol: baseCurrencySymbol } = useCurrency();

  const [profiles, setProfiles] = useState<any[]>([]);
  const [expense, setExpense] = useState<any>(null);
  const [generatedExpenses, setGeneratedExpenses] = useState<any[]>([]);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"Overview" | "All Expenses">("Overview");
  const [loading, setLoading] = useState(true);
  const [loadingGenerated, setLoadingGenerated] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [savingAttachments, setSavingAttachments] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getIdCandidates = (record?: any) =>
    Array.from(new Set([record?._id, record?.id, record?.recurringExpenseId, id].map((value) => String(value || "").trim()).filter(Boolean)));

  const formatDate = (value: string) => {
    if (!value) return "-";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "-";
    return parsed.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };

  const nextExpenseDate = (startDate: string, repeatEvery: string) => {
    const start = new Date(startDate);
    if (Number.isNaN(start.getTime())) return "-";
    const map: Record<string, number> = { Week: 7, "2 Weeks": 14, Month: 30, "2 Months": 60, "3 Months": 90, "6 Months": 180, Year: 365, "2 Years": 730, "3 Years": 1095 };
    start.setDate(start.getDate() + (map[repeatEvery] || 7));
    return formatDate(start.toISOString());
  };

  const fetchProfiles = async () => {
    try {
      const response = await recurringExpensesAPI.getAll({ limit: 1000 });
      const rows = response?.recurring_expenses || [];
      setProfiles(
        rows.map((row: any) => ({
          id: row?._id || row?.recurring_expense_id,
          profileName: row?.profile_name || "",
          expenseAccount: row?.account_name || "",
          amount: row?.amount || 0,
        }))
      );
    } catch (error) {
      console.error("Failed to fetch recurring profile list:", error);
      setProfiles([]);
    }
  };

  const fetchDetail = async () => {
    if (!id) return;
    setLoading(true);
    try {
      let resolved: any = null;
      for (const candidate of getIdCandidates()) {
        try {
          const response = await recurringExpensesAPI.getById(candidate);
          const row = response?.recurring_expense;
          if (row) {
            resolved = {
              id: row?._id || row?.recurring_expense_id,
              _id: row?._id,
              recurringExpenseId: row?.recurring_expense_id,
              profileName: row?.profile_name || "",
              expenseAccount: row?.account_name || "",
              vendor: row?.vendor_name || "",
              customerName: row?.customer_name || "",
              repeatEvery: row?.repeat_every || "Week",
              startDate: row?.start_date || "",
              endDate: row?.end_date || "",
              neverExpire: Boolean(row?.never_expire),
              amount: row?.amount || 0,
              account_id: row?.account_id || row?.account?._id || row?.account?.id || "",
              paid_through_account_id:
                row?.paid_through_account_id
                || row?.paid_through_account?._id
                || row?.paid_through_account?.id
                || "",
              status: String(row?.status || "active").toUpperCase(),
              paidThrough: row?.paid_through_account_name || "",
              notes: row?.notes || row?.description || "",
              vendor_id: row?.vendor_id || row?.vendor?._id || row?.vendor?.id || "",
              customer_id: row?.customer_id || row?.customer?._id || row?.customer?.id || "",
              attachments: normalizeAttachments(row?.attachments || []),
            };
            break;
          }
        } catch {
          // Try next candidate ID.
        }
      }
      setExpense(resolved);
      setAttachments(normalizeAttachments(resolved?.attachments || []));
    } catch (error) {
      console.error("Failed to fetch recurring expense detail:", error);
      setExpense(null);
      setAttachments([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchGenerated = async () => {
    setLoadingGenerated(true);
    try {
      let rows: any[] = [];
      for (const candidate of getIdCandidates(expense)) {
        const response = await expensesAPI.getAll({ recurring_expense_id: candidate });
        const data = response?.expenses || [];
        if (Array.isArray(data) && data.length > 0) {
          rows = data;
          break;
        }
      }
      setGeneratedExpenses(rows);
    } finally {
      setLoadingGenerated(false);
    }
  };

  useEffect(() => {
    void fetchProfiles();
    void fetchDetail();
  }, [id, baseCurrencyCode]);

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setDropdownOpen(false);
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) setMoreMenuOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const exportPdf = () => {
    if (!expense) return;
    const pdf = new jsPDF("p", "mm", "a4");
    const currency = baseCurrencySymbol || baseCurrencyCode || "USD";
    pdf.setFontSize(16);
    pdf.text("Recurring Expense", 14, 16);
    pdf.setFontSize(10);
    pdf.text(`Profile: ${expense.profileName || "-"}`, 14, 28);
    pdf.text(`Amount: ${currency}${Number(expense.amount || 0).toFixed(2)}`, 14, 34);
    pdf.text(`Frequency: ${expense.repeatEvery || "-"}`, 14, 40);
    pdf.text(`Start Date: ${formatDate(expense.startDate)}`, 14, 46);
    pdf.text(`Status: ${expense.status || "-"}`, 14, 52);
    pdf.text(`Expense Account: ${expense.expenseAccount || "-"}`, 14, 58);
    pdf.text(`Paid Through: ${expense.paidThrough || "-"}`, 14, 64);
    pdf.text(`Vendor: ${expense.vendor || "-"}`, 14, 70);
    pdf.text(`Customer: ${expense.customerName || "-"}`, 14, 76);
    pdf.text(`Attachments: ${attachments.length}`, 14, 82);
    pdf.save(`${String(expense.profileName || "recurring-expense").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.pdf`);
  };

  const persistAttachments = async (nextAttachments: any[]) => {
    const payload = normalizeAttachments(nextAttachments);
    let updated = false;
    let lastError: any = null;

    for (const candidate of getIdCandidates(expense)) {
      try {
        const response = await recurringExpensesAPI.update(candidate, { attachments: payload });
        if (response?.code === 0 || response?.success || response?.recurring_expense || response?.data) {
          updated = true;
          break;
        }
      } catch (error) {
        lastError = error;
      }
    }

    if (!updated) {
      throw lastError || new Error("Failed to save attachments.");
    }
    setAttachments(payload);
    setExpense((prev: any) => (prev ? { ...prev, attachments: payload } : prev));
    window.dispatchEvent(new Event("recurringExpensesUpdated"));
  };

  const onUploadFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    const valid = files.filter((file) => file.size <= MAX_FILE_SIZE);
    if (valid.length !== files.length) alert("Some files exceed the 10MB limit and were skipped.");
    if (!valid.length) return;

    const previous = attachments;
    setSavingAttachments(true);
    try {
      const uploaded = await Promise.all(
        valid.map(async (file, index) => ({
          id: `att-${Date.now()}-${index}`,
          name: file.name,
          size: file.size,
          type: file.type || "",
          url: await toDataUrl(file),
          uploadedAt: new Date().toISOString(),
        }))
      );
      await persistAttachments([...attachments, ...uploaded]);
    } catch (error: any) {
      setAttachments(previous);
      alert(error?.message || "Failed to upload file.");
    } finally {
      setSavingAttachments(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeAttachment = async (attachmentId: string) => {
    const previous = attachments;
    const next = attachments.filter((file: any) => file.id !== attachmentId);
    setAttachments(next);
    setSavingAttachments(true);
    try {
      await persistAttachments(next);
    } catch (error: any) {
      setAttachments(previous);
      alert(error?.message || "Failed to delete attachment.");
    } finally {
      setSavingAttachments(false);
    }
  };

  const deleteProfile = async () => {
    if (!expense) return;
    if (!window.confirm("Are you sure you want to delete this recurring expense?")) return;

    let deleted = false;
    let lastError: any = null;
    for (const candidate of getIdCandidates(expense)) {
      try {
        const response = await recurringExpensesAPI.delete(candidate);
        if (response?.code === 0 || response?.success || response === null || typeof response === "object") {
          deleted = true;
          break;
        }
      } catch (error) {
        lastError = error;
      }
    }
    if (!deleted) {
      alert(lastError?.message || "Failed to delete recurring expense.");
      return;
    }
    window.dispatchEvent(new Event("recurringExpensesUpdated"));
    navigate("/purchases/recurring-expenses");
  };

  if (loading) return <div style={{ padding: 24 }}>Loading...</div>;
  if (!expense) return <div style={{ padding: 24 }}>Recurring expense not found.</div>;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", minHeight: "100vh", background: "#fff" }}>
      <aside style={{ borderRight: "1px solid #e5e7eb" }}>
        <div style={{ padding: 16, borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div ref={dropdownRef} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <strong>All Profiles</strong>
            <button onClick={() => setDropdownOpen((prev) => !prev)} style={{ border: "none", background: "transparent", cursor: "pointer" }}>
              {dropdownOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
          <button onClick={() => navigate("/purchases/recurring-expenses/new")} style={{ border: "none", background: "#156372", color: "#fff", borderRadius: 4, padding: 6, cursor: "pointer" }}><Plus size={16} /></button>
        </div>
        <div style={{ overflowY: "auto", maxHeight: "calc(100vh - 60px)" }}>
          {profiles.map((row) => (
            <div key={row.id} onClick={() => navigate(`/purchases/recurring-expenses/${row.id}`)} style={{ padding: 12, borderBottom: "1px solid #f3f4f6", cursor: "pointer", background: row.id === expense.id ? "#eff6ff" : "#fff" }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{row.expenseAccount || "Expense"}</div>
              <div style={{ color: "#6b7280", fontSize: 13 }}>{row.profileName}</div>
            </div>
          ))}
        </div>
      </aside>

      <main style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ borderBottom: "1px solid #e5e7eb", padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1 style={{ margin: 0, fontSize: 22 }}>{expense.profileName}</h1>
            <span style={{ fontSize: 12, padding: "3px 10px", borderRadius: 999, background: expense.status === "ACTIVE" ? "#d1fae5" : "#f3f4f6", color: expense.status === "ACTIVE" ? "#065f46" : "#4b5563" }}>{expense.status}</span>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={() => navigate("/purchases/recurring-expenses/new", { state: { editExpense: expense, isEdit: true } })} style={{ border: "1px solid #d1d5db", background: "#fff", borderRadius: 6, padding: "8px 10px", cursor: "pointer" }}><LinkIcon size={16} /></button>
            <button onClick={exportPdf} style={{ border: "1px solid #d1d5db", background: "#fff", borderRadius: 6, padding: "8px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}><FileText size={16} />PDF</button>
            <div ref={moreMenuRef} style={{ position: "relative" }}>
              <button onClick={() => setMoreMenuOpen((prev) => !prev)} style={{ border: "1px solid #d1d5db", background: "#fff", borderRadius: 6, padding: "8px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>More<ChevronDown size={16} /></button>
              {moreMenuOpen && <button onClick={() => void deleteProfile()} style={{ position: "absolute", right: 0, top: "110%", minWidth: 120, textAlign: "left", padding: "8px 12px", border: "1px solid #d1d5db", background: "#fff", borderRadius: 6, cursor: "pointer" }}>Delete</button>}
            </div>
            <button onClick={() => navigate("/purchases/recurring-expenses")} style={{ border: "none", background: "transparent", cursor: "pointer" }}><X size={20} /></button>
          </div>
        </div>

        <div style={{ borderBottom: "1px solid #e5e7eb", padding: "0 20px", display: "flex", gap: 8 }}>
          {(["Overview", "All Expenses"] as const).map((tab) => (
            <button key={tab} onClick={() => { setActiveTab(tab); if (tab === "All Expenses") void fetchGenerated(); }} style={{ border: "none", borderBottom: activeTab === tab ? "2px solid #156372" : "2px solid transparent", background: "transparent", padding: "12px 10px", cursor: "pointer", color: activeTab === tab ? "#156372" : "#6b7280" }}>{tab}</button>
          ))}
        </div>

        <div style={{ padding: 20, overflowY: "auto", flex: 1 }}>
          {activeTab === "Overview" && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 12, marginBottom: 18 }}>
                <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12 }}><DollarSign size={16} /><div>{(baseCurrencySymbol || baseCurrencyCode || "USD") + Number(expense.amount || 0).toFixed(2)}</div></div>
                <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12 }}><Repeat size={16} /><div>{expense.repeatEvery}</div></div>
                <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12 }}><Calendar size={16} /><div>{nextExpenseDate(expense.startDate, expense.repeatEvery)}</div></div>
              </div>

              <div style={{ marginBottom: 18 }}>
                <div><strong>Expense Account:</strong> {expense.expenseAccount || "-"}</div>
                <div><strong>Paid Through:</strong> {expense.paidThrough || "-"}</div>
                <div><strong>Start On:</strong> {formatDate(expense.startDate)}</div>
                <div><strong>Ends On:</strong> {expense.neverExpire ? "Goes on forever" : formatDate(expense.endDate)}</div>
                <div><strong>Vendor:</strong> {expense.vendor || "-"}</div>
                <div><strong>Customer:</strong> {expense.customerName || "-"}</div>
                <div><strong>Notes:</strong> {expense.notes || "-"}</div>
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <strong>Attachments</strong>
                  <button onClick={() => fileInputRef.current?.click()} disabled={savingAttachments} style={{ border: "1px solid #d1d5db", background: "#fff", borderRadius: 6, padding: "6px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}><Upload size={14} />{savingAttachments ? "Saving..." : "Upload Files"}</button>
                </div>
                <input ref={fileInputRef} type="file" multiple style={{ display: "none" }} onChange={onUploadFiles} />
                <div style={{ border: "1px solid #e5e7eb", borderRadius: 8 }}>
                  {attachments.length === 0 ? (
                    <div style={{ padding: 12, color: "#6b7280" }}>No attachments uploaded.</div>
                  ) : (
                    attachments.map((file: any, index: number) => (
                      <div key={file.id} style={{ padding: 12, borderBottom: index < attachments.length - 1 ? "1px solid #f3f4f6" : "none", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                        <button type="button" onClick={() => window.open(file.url, "_blank", "noopener,noreferrer")} style={{ border: "none", background: "transparent", color: "#156372", textDecoration: "underline", cursor: "pointer", textAlign: "left" }}>{file.name}</button>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: 12, color: "#6b7280" }}>{formatSize(file.size)}</span>
                          <button onClick={() => void removeAttachment(file.id)} disabled={savingAttachments} style={{ border: "none", background: "transparent", color: "#6b7280", cursor: "pointer" }}><Trash2 size={14} /></button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}

          {activeTab === "All Expenses" && (
            loadingGenerated ? <div>Loading expenses...</div> : generatedExpenses.length === 0 ? <div>No generated expenses yet.</div> : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr><th style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb", padding: 8 }}>Date</th><th style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb", padding: 8 }}>Reference</th><th style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb", padding: 8 }}>Account</th><th style={{ textAlign: "right", borderBottom: "1px solid #e5e7eb", padding: 8 }}>Amount</th></tr></thead>
                <tbody>
                  {generatedExpenses.map((row: any, index: number) => (
                    <tr key={row.expense_id || row._id || index} onClick={() => navigate(`/purchases/expenses/${row.expense_id || row._id}`)} style={{ cursor: "pointer" }}>
                      <td style={{ padding: 8, borderBottom: "1px solid #f3f4f6" }}>{formatDate(row.date)}</td>
                      <td style={{ padding: 8, borderBottom: "1px solid #f3f4f6", color: "#156372" }}>{row.reference_number || "-"}</td>
                      <td style={{ padding: 8, borderBottom: "1px solid #f3f4f6" }}>{row.account_name || "-"}</td>
                      <td style={{ padding: 8, borderBottom: "1px solid #f3f4f6", textAlign: "right" }}>{(baseCurrencyCode || row.currency_code || "USD") + Number(row.total || row.amount || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}
        </div>
      </main>
    </div>
  );
}
