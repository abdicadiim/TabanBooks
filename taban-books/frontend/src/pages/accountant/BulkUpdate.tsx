import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { accountantAPI, customersAPI, locationsAPI, vendorsAPI } from "../../services/api";

type Account = {
  _id: string;
  accountName: string;
  accountType: string;
  isActive?: boolean;
};

type TxRow = {
  type: "bill" | "purchase_order" | "expense" | "vendor_credit" | "credit_note";
  transactionId: string;
  displayNumber?: string;
  date?: string;
  amount?: number;
  contactName?: string;
  status?: string;
  updatable?: boolean;
};

type HistoryRow = {
  _id: string;
  fromAccountName: string;
  toAccountName: string;
  updatedCount: number;
  status: "ongoing" | "completed" | "failed";
  createdAt: string;
  description?: string;
  transactions?: TxRow[];
};

type OptionItem = {
  id: string;
  label: string;
  group?: string;
};

const excludedTypes = new Set([
  "accounts_receivable",
  "accounts_payable",
  "fixed_asset",
  "stock",
  "bank",
]);

const excludedNames = new Set(["unearned revenue", "retained earnings"]);

const fmt = (v: number) =>
  new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    Number(v || 0)
  );

const formatAccountType = (value: string) =>
  String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

const resolveDataArray = (res: any): any[] => {
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.data?.data)) return res.data.data;
  return [];
};

const resolveVendorArray = (res: any): any[] => {
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.data?.vendors)) return res.data.vendors;
  if (Array.isArray(res?.vendors)) return res.vendors;
  return [];
};

const resolveCustomerArray = (res: any): any[] => {
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.data?.customers)) return res.data.customers;
  if (Array.isArray(res?.customers)) return res.customers;
  return [];
};

function SearchableSelect({
  label,
  required,
  placeholder,
  value,
  onChange,
  options,
}: {
  label: string;
  required?: boolean;
  placeholder: string;
  value: string;
  onChange: (next: string) => void;
  options: OptionItem[];
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const selected = options.find((o) => o.id === value);
  const filtered = useMemo(
    () =>
      options.filter((o) =>
        o.label.toLowerCase().includes(query.toLowerCase()) || (o.group || "").toLowerCase().includes(query.toLowerCase())
      ),
    [options, query]
  );

  let lastGroup = "";

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      {label ? (
        <label style={{ display: "block", fontSize: 12, color: required ? "#ef4444" : "#156372", marginBottom: 6 }}>
          {label}{required ? "*" : ""}
        </label>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        style={{
          width: "100%",
          height: 34,
          border: "1px solid #cbd5e1",
          borderRadius: 4,
          background: "#fff",
          textAlign: "left",
          padding: "0 10px",
          fontSize: 13,
          color: selected ? "#0f172a" : "#94a3b8",
          cursor: "pointer",
        }}
      >
        <span>{selected?.label || placeholder}</span>
        <span style={{ float: "right", color: "#64748b" }}>?</span>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            zIndex: 50,
            top: 38,
            left: 0,
            right: 0,
            border: "1px solid #dbe3ef",
            borderRadius: 10,
            background: "#fff",
            boxShadow: "0 8px 24px rgba(15, 23, 42, 0.15)",
            overflow: "hidden",
          }}
        >
          <div style={{ padding: 8, borderBottom: "1px solid #eef2f7" }}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              style={{ width: "100%", height: 38, border: "1px solid #cbd5e1", borderRadius: 8, padding: "0 10px" }}
            />
          </div>
          <div style={{ maxHeight: 240, overflowY: "auto", padding: 6 }}>
            {filtered.length === 0 ? (
              <div style={{ padding: "8px 10px", color: "#64748b", fontSize: 13 }}>No results</div>
            ) : (
              filtered.map((o) => {
                const showGroup = o.group && o.group !== lastGroup;
                if (o.group) lastGroup = o.group;
                const isActive = o.id === value;
                return (
                  <React.Fragment key={o.id}>
                    {showGroup && (
                      <div style={{ padding: "6px 10px", fontSize: 12, color: "#334155", fontWeight: 700 }}>{o.group}</div>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        onChange(o.id);
                        setOpen(false);
                        setQuery("");
                      }}
                      onMouseEnter={() => setHoveredId(o.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      style={{
                        width: "100%",
                        border: "none",
                        borderRadius: 6,
                        textAlign: "left",
                        padding: "8px 10px",
                        background: hoveredId === o.id ? "#f1f5f9" : "transparent",
                        color: "#334155",
                        cursor: "pointer",
                        fontSize: 13,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>{o.label}</span>
                      {isActive && <span style={{ fontSize: 14, color: "#1a9b64" }}>✓</span>}
                    </button>
                  </React.Fragment>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function BulkUpdate() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [contacts, setContacts] = useState<OptionItem[]>([]);
  const [locations, setLocations] = useState<OptionItem[]>([]);
  const [history, setHistory] = useState<HistoryRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [replacing, setReplacing] = useState(false);

  const [showFilterModal, setShowFilterModal] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const [filters, setFilters] = useState({
    accountId: "",
    contact: "",
    locationId: "",
    dateFrom: "",
    dateTo: "",
    amountFrom: "",
    amountTo: "",
    includeInactiveAccounts: false,
  });

  const [results, setResults] = useState<TxRow[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [newAccountId, setNewAccountId] = useState("");

  const [selectedHistoryId, setSelectedHistoryId] = useState("");
  const [selectedHistoryDetail, setSelectedHistoryDetail] = useState<HistoryRow | null>(null);

  const selectableAccounts = useMemo(
    () =>
      accounts.filter(
        (a) =>
          !excludedTypes.has(String(a.accountType || "").toLowerCase()) &&
          !excludedNames.has(String(a.accountName || "").toLowerCase())
      ),
    [accounts]
  );

  const accountOptions = useMemo<OptionItem[]>(
    () =>
      selectableAccounts
        .map((a) => ({
          id: a._id,
          label: a.accountName,
          group: formatAccountType(a.accountType),
        }))
        .sort((a, b) => (a.group || "").localeCompare(b.group || "") || a.label.localeCompare(b.label)),
    [selectableAccounts]
  );

  const locationOptions = useMemo<OptionItem[]>(() => [{ id: "", label: "All Locations" }, ...locations], [locations]);

  const selectedAccount = selectableAccounts.find((a) => a._id === filters.accountId);
  const selectedNewAccount = selectableAccounts.find((a) => a._id === newAccountId);
  const selectedLocation = locationOptions.find((l) => l.id === filters.locationId);
  const selectedContact = contacts.find((c) => c.id === filters.contact);

  const loadBase = async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        accountantAPI.getAccounts({ limit: 1000 }),
        accountantAPI.getBulkUpdateHistory(),
        vendorsAPI.getAll({ limit: 1000 }),
        customersAPI.getAll({ limit: 1000 }),
        locationsAPI.getAll(),
      ]);

      const [accountsRes, historyRes, vendorsRes, customersRes, locationsRes] = results.map(r => 
        r.status === 'fulfilled' ? r.value : { success: false, error: r.reason }
      );

      if (accountsRes?.success) {
        setAccounts(resolveDataArray(accountsRes) as Account[]);
      } else {
        console.error("Failed to load accounts:", accountsRes?.error);
      }

      if (historyRes?.success) {
        setHistory(resolveDataArray(historyRes) as HistoryRow[]);
      } else {
        console.error("Failed to load history:", historyRes?.error);
      }

      const vendors = resolveVendorArray(vendorsRes)
        .map((v: any) => v.displayName || v.vendor_name || v.name)
        .filter(Boolean);
      
      const customers = resolveCustomerArray(customersRes)
        .map((c: any) => c.displayName || c.customer_name || c.name)
        .filter(Boolean);

      const uniqueContacts = Array.from(new Set([...vendors, ...customers].map((n) => String(n).trim())))
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b));
      setContacts(uniqueContacts.map((name) => ({ id: name, label: name })));

      const locationsRows = resolveDataArray(locationsRes).map((l: any) => ({
        id: String(l._id || l.id || l.location_id || l.locationId || l.location_name || l.locationName || l.name),
        label: String(l.location_name || l.locationName || l.name || "").trim(),
      }));
      setLocations(
        locationsRows
          .filter((l: OptionItem) => l.id && l.label)
          .sort((a: OptionItem, b: OptionItem) => a.label.localeCompare(b.label))
      );

      // Check for errors to show a single warning if needed
      const failedCount = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value?.success)).length;
      if (failedCount > 0) {
        toast.error(`Some data failed to load (${failedCount} requests failed). Check console for details.`);
      }
    } catch (err: any) {
      console.error("BulkUpdate: LoadBase critical error", err);
      toast.error("Critical error loading page data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBase();
  }, []);

  const searchTransactions = async () => {
    if (!filters.accountId) {
      toast.error("Account is required.");
      return;
    }

    const account = selectableAccounts.find((a) => a._id === filters.accountId);
    if (!account) {
      toast.error("Selected account is not eligible for bulk update.");
      return;
    }

    try {
      setSearching(true);
      const res = await accountantAPI.previewBulkUpdateTransactions({
        accountId: account._id,
        accountName: account.accountName,
        contact: selectedContact?.label || "",
        locationId: filters.locationId || undefined,
        locationName: selectedLocation?.label && filters.locationId ? selectedLocation.label : undefined,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
        amountFrom: filters.amountFrom || undefined,
        amountTo: filters.amountTo || undefined,
        includeInactiveAccounts: filters.includeInactiveAccounts,
      });
      if (!res?.success) {
        toast.error("Failed to search transactions.");
        return;
      }
      setResults(res.data?.transactions || []);
      setSelected([]);
      setHasSearched(true);
      setShowFilterModal(false);
      toast.success(`Found ${res.data?.transactions?.length || 0} transactions.`);
    } catch (error: any) {
      toast.error(error?.message || "Failed to search transactions.");
    } finally {
      setSearching(false);
    }
  };

  const toggleSelected = (key: string) => {
    setSelected((prev) => (prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]));
  };

  const selectAllUpdatable = () => {
    const ids = results
      .filter((r) => r.updatable !== false)
      .slice(0, 50)
      .map((r) => `${r.type}:${r.transactionId}`);
    setSelected(ids);
  };

  const clearSelection = () => setSelected([]);

  const doReplace = async () => {
    if (!selected.length) {
      toast.error("Select at least one transaction.");
      return;
    }
    if (selected.length > 50) {
      toast.error("You can update a maximum of 50 transactions at a time.");
      return;
    }
    if (!newAccountId) {
      toast.error("Select the new account.");
      return;
    }
    if (!selectedAccount || !selectedNewAccount) {
      toast.error("Invalid account selection.");
      return;
    }
    if (selectedAccount._id === selectedNewAccount._id) {
      toast.error("New account must be different from current account.");
      return;
    }

    if (!window.confirm("Bulk updates cannot be undone. Continue?")) return;

    const selectedTx = results
      .filter((r) => selected.includes(`${r.type}:${r.transactionId}`))
      .map((r) => ({ ...r }));

    try {
      setReplacing(true);
      const res = await accountantAPI.executeBulkUpdateTransactions({
        fromAccountId: selectedAccount._id,
        fromAccountName: selectedAccount.accountName,
        toAccountId: selectedNewAccount._id,
        toAccountName: selectedNewAccount.accountName,
        filters: {
          ...filters,
          contact: selectedContact?.label || "",
          locationName: selectedLocation?.label || "",
        },
        transactions: selectedTx,
      });
      if (!res?.success) {
        toast.error("Failed to update selected transactions.");
        return;
      }
      toast.success(res.message || "Bulk update completed.");
      setNewAccountId("");
      setSelected([]);
      await Promise.all([loadBase(), searchTransactions()]);
    } catch (error: any) {
      toast.error(error?.message || "Failed to update selected transactions.");
    } finally {
      setReplacing(false);
    }
  };

  const loadHistoryDetail = async (id: string) => {
    setSelectedHistoryId(id);
    try {
      const res = await accountantAPI.getBulkUpdateHistoryById(id);
      if (res?.success) setSelectedHistoryDetail(res.data);
    } catch {
      setSelectedHistoryDetail(null);
    }
  };

  return (
    <div style={{ minHeight: "calc(100vh - 60px)", background: "#f8fafc", padding: 20 }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", display: "grid", gridTemplateColumns: hasSearched ? "2fr 1fr" : "1fr", gap: 14 }}>
        {!hasSearched ? (
          <section style={{ borderRadius: 12, minHeight: 520, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
            <div style={{ maxWidth: 900, textAlign: "center" }}>
              <div style={{ fontSize: 68, lineHeight: 1, color: "#7c3aed" }}>[=]</div>
              <h2 style={{ margin: "10px 0 6px", fontSize: 40, fontWeight: 600, color: "#111827" }}>Bulk Update Accounts in Transactions</h2>
              <p style={{ margin: "0 0 16px", fontSize: 18, color: "#111827" }}>
                Filter transactions (Invoices, Credit Notes, Purchase Orders, Expenses, Bills, Vendor Credits) and bulk-update its accounts with a new account
              </p>

              <div style={{ maxWidth: 840, margin: "0 auto", borderRadius: 12, background: "#fff7ed", border: "1px solid #fed7aa", padding: "16px 18px", color: "#9a3412", fontSize: 16 }}>
                Bulk-updating accounts in transactions will cause significant changes to the financial data of your business. We recommend that you do this with the assistance of an accountant.
              </div>

              <button
                onClick={() => setShowFilterModal(true)}
                style={{ marginTop: 22, border: "none", borderRadius: 8, background: "#156372", color: "#fff", padding: "10px 18px", fontSize: 18, cursor: "pointer", fontWeight: 600 }}
              >
                Filter and Bulk Update
              </button>
            </div>
          </section>
        ) : (
          <section style={{ borderRadius: 10, padding: 14 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 10 }}>
              <div>
                <h2 style={{ margin: "0 0 6px", fontSize: 22 }}>Bulk Update</h2>
                <p style={{ margin: 0, color: "#64748b", fontSize: 13 }}>
                  Selected Account: <b>{selectedAccount?.accountName || "-"}</b>
                  {selectedContact?.label ? ` | Contact: ${selectedContact.label}` : ""}
                  {selectedLocation?.label && filters.locationId ? ` | Location: ${selectedLocation.label}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowFilterModal(true)}
                style={{ border: "1px solid #dbe3ef", background: "#f8fafc", color: "#0f172a", borderRadius: 8, padding: "8px 12px", cursor: "pointer", fontWeight: 600 }}
              >
                Filter and Bulk Update
              </button>
            </div>

            <div style={{ marginTop: 14, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={selectAllUpdatable} style={{ border: "1px solid #d1d5db", background: "white", borderRadius: 8, padding: "6px 10px", cursor: "pointer" }}>Select Up to 50</button>
                <button onClick={clearSelection} style={{ border: "1px solid #d1d5db", background: "white", borderRadius: 8, padding: "6px 10px", cursor: "pointer" }}>Clear</button>
              </div>
              <div style={{ fontSize: 12, color: "#64748b" }}>
                Selected: {selected.length} / 50
              </div>
            </div>

            <div style={{ marginTop: 10, overflow: "auto", border: "1px solid #e5e7eb", borderRadius: 8 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 860 }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    <th style={{ padding: "10px", textAlign: "left", borderBottom: "1px solid #e5e7eb" }}></th>
                    <th style={{ padding: "10px", textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>Type</th>
                    <th style={{ padding: "10px", textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>Number</th>
                    <th style={{ padding: "10px", textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>Date</th>
                    <th style={{ padding: "10px", textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>Contact</th>
                    <th style={{ padding: "10px", textAlign: "right", borderBottom: "1px solid #e5e7eb" }}>Amount</th>
                    <th style={{ padding: "10px", textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>Status</th>
                    <th style={{ padding: "10px", textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>Eligible</th>
                  </tr>
                </thead>
                <tbody>
                  {results.length === 0 ? (
                    <tr><td colSpan={8} style={{ padding: 14, color: "#64748b" }}>{loading ? "Loading..." : "No transactions found."}</td></tr>
                  ) : (
                    results.map((r) => {
                      const key = `${r.type}:${r.transactionId}`;
                      const checked = selected.includes(key);
                      const disabled = r.updatable === false;
                      return (
                        <tr key={key} style={{ borderBottom: "1px solid #f1f5f9", opacity: disabled ? 0.7 : 1 }}>
                          <td style={{ padding: "8px 10px" }}>
                            <input type="checkbox" checked={checked} disabled={disabled} onChange={() => toggleSelected(key)} />
                          </td>
                          <td style={{ padding: "8px 10px", textTransform: "capitalize" }}>{r.type.replace("_", " ")}</td>
                          <td style={{ padding: "8px 10px" }}>{r.displayNumber || r.transactionId.slice(-6)}</td>
                          <td style={{ padding: "8px 10px" }}>{r.date ? new Date(r.date).toISOString().slice(0, 10) : "-"}</td>
                          <td style={{ padding: "8px 10px" }}>{r.contactName || "-"}</td>
                          <td style={{ padding: "8px 10px", textAlign: "right" }}>{fmt(Number(r.amount || 0))}</td>
                          <td style={{ padding: "8px 10px" }}>{r.status || "-"}</td>
                          <td style={{ padding: "8px 10px", color: disabled ? "#b91c1c" : "#047857", fontWeight: 600 }}>{disabled ? "No" : "Yes"}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "end" }}>
              <SearchableSelect
                label="New Account (Replace With)"
                required
                placeholder="Select new account"
                value={newAccountId}
                onChange={setNewAccountId}
                options={accountOptions}
              />
              <button
                onClick={doReplace}
                disabled={replacing || selected.length === 0}
                style={{ padding: "8px 14px", border: "none", background: selected.length ? "#156372" : "#94a3b8", color: "white", borderRadius: 8, cursor: selected.length ? "pointer" : "not-allowed", fontWeight: 700, height: 42 }}
              >
                {replacing ? "Replacing..." : "Replace"}
              </button>
            </div>
          </section>
        )}

        {hasSearched && (
          <section style={{ borderRadius: 10, padding: 14 }}>
            <h3 style={{ marginTop: 0 }}>Bulk Update History</h3>
            <div style={{ maxHeight: 360, overflow: "auto", border: "1px solid #e5e7eb", borderRadius: 8 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    <th style={{ padding: "8px 10px", textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>Date</th>
                    <th style={{ padding: "8px 10px", textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>Status</th>
                    <th style={{ padding: "8px 10px", textAlign: "right", borderBottom: "1px solid #e5e7eb" }}>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {history.length === 0 ? (
                    <tr><td colSpan={3} style={{ padding: 10, color: "#64748b" }}>No bulk updates yet.</td></tr>
                  ) : (
                    history.map((h) => (
                      <tr key={h._id} onClick={() => loadHistoryDetail(h._id)} style={{ borderBottom: "1px solid #f1f5f9", cursor: "pointer", background: selectedHistoryId === h._id ? "#f8fafc" : "white" }}>
                        <td style={{ padding: "8px 10px" }}>{new Date(h.createdAt).toISOString().slice(0, 10)}</td>
                        <td style={{ padding: "8px 10px", textTransform: "capitalize" }}>{h.status}</td>
                        <td style={{ padding: "8px 10px", textAlign: "right" }}>{h.updatedCount}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {selectedHistoryDetail && (
              <div style={{ marginTop: 12, border: "1px solid #e5e7eb", borderRadius: 8, padding: 10 }}>
                <div style={{ fontSize: 12, color: "#64748b" }}>Description</div>
                <div style={{ fontWeight: 600 }}>{selectedHistoryDetail.description || `${selectedHistoryDetail.fromAccountName} -> ${selectedHistoryDetail.toAccountName}`}</div>
                <div style={{ marginTop: 8, fontSize: 12, color: "#64748b" }}>Status</div>
                <div style={{ textTransform: "capitalize" }}>{selectedHistoryDetail.status}</div>
                <div style={{ marginTop: 8, fontSize: 12, color: "#64748b" }}>Updated Count</div>
                <div>{selectedHistoryDetail.updatedCount}</div>
                <div style={{ marginTop: 8, fontSize: 12, color: "#64748b" }}>Transactions</div>
                <div>{selectedHistoryDetail.transactions?.length || 0}</div>
              </div>
            )}
          </section>
        )}
      </div>

      {showFilterModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1200, padding: 16 }}>
          <div style={{ width: "100%", maxWidth: 800, background: "#fff", borderRadius: 8, boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}>
            <div style={{ padding: "18px 24px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 500, color: "#111827" }}>Filter Transactions</h3>
              <button onClick={() => setShowFilterModal(false)} style={{ border: "none", background: "none", color: "#64748b", cursor: "pointer", fontSize: 24 }}>×</button>
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1200, padding: 16 }}>
          <div style={{ width: "100%", maxWidth: 1040, background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", boxShadow: "0 25px 50px rgba(15, 23, 42, 0.2)", overflow: "hidden" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h3 style={{ margin: 0, fontSize: 28, fontWeight: 500, color: "#111827" }}>Filter Transactions</h3>
              <button onClick={() => setShowFilterModal(false)} style={{ width: 36, height: 36, borderRadius: 8, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer", fontSize: 20 }}>�</button>
            </div>
            
            <div style={{ padding: 24 }}>
              <p style={{ margin: "0 0 20px", color: "#64748b", fontSize: 13 }}>
              <p style={{ margin: "0 0 18px", color: "#156372", fontSize: 16 }}>
                Select an account and enter your ranges to filter your transaction
              </p>
              
              <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", rowGap: 14, columnGap: 24, alignItems: "center" }}>
                <div style={{ fontSize: 13, color: "#ef4444" }}>Account*</div>
                <SearchableSelect
                  label=""
                  placeholder="Select an account"
                  value={filters.accountId}
                  onChange={(id) => setFilters((p) => ({ ...p, accountId: id }))}
                  options={accountOptions}
                />

                <div style={{ fontSize: 13, color: "#334155" }}>Contact</div>
                <SearchableSelect
                  label=""
                  placeholder="Select Contact"
                  value={filters.contact}
                  onChange={(id) => setFilters((p) => ({ ...p, contact: id }))}
                  options={[{ id: "", label: "All Contacts" }, ...contacts]}
                />

                <div style={{ fontSize: 13, color: "#334155" }}>Date Range</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 24px 1fr", gap: 8, alignItems: "center" }}>
                  <input type="date" value={filters.dateFrom} onChange={(e) => setFilters((p) => ({ ...p, dateFrom: e.target.value }))} style={{ height: 34, border: "1px solid #cbd5e1", borderRadius: 4, padding: "0 10px", fontSize: 13 }} />
                  <span style={{ textAlign: "center", color: "#64748b" }}>-</span>
                  <input type="date" value={filters.dateTo} onChange={(e) => setFilters((p) => ({ ...p, dateTo: e.target.value }))} style={{ height: 34, border: "1px solid #cbd5e1", borderRadius: 4, padding: "0 10px", fontSize: 13 }} />
                </div>

                <div style={{ fontSize: 13, color: "#334155" }}>Total Amount Range</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 24px 1fr", gap: 8, alignItems: "center" }}>
                  <input value={filters.amountFrom} onChange={(e) => setFilters((p) => ({ ...p, amountFrom: e.target.value }))} style={{ height: 34, border: "1px solid #cbd5e1", borderRadius: 4, padding: "0 10px", fontSize: 13 }} />
                  <span style={{ textAlign: "center", color: "#64748b" }}>-</span>
                  <input value={filters.amountTo} onChange={(e) => setFilters((p) => ({ ...p, amountTo: e.target.value }))} style={{ height: 34, border: "1px solid #cbd5e1", borderRadius: 4, padding: "0 10px", fontSize: 13 }} />
                </div>

                <div style={{ fontSize: 13, color: "#334155" }}>Location</div>
                <SearchableSelect
                  label=""
                  placeholder="Location"
                  value={filters.locationId}
                  onChange={(id) => setFilters((p) => ({ ...p, locationId: id }))}
                  options={locationOptions}
                />

                <div></div>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "#156372" }}>
                  <input
                    type="checkbox"
                    checked={filters.includeInactiveAccounts}
                    onChange={(e) => setFilters((p) => ({ ...p, includeInactiveAccounts: e.target.checked }))}
                  />
                  Include inactive accounts
                </label>
              </div>
            </div>

            <div style={{ padding: "0 24px 24px", display: "flex", gap: 10 }}>
              <button
                onClick={searchTransactions}
                disabled={searching}
                style={{ border: "none", borderRadius: 4, background: "#156372", color: "#fff", padding: "8px 20px", cursor: "pointer", fontWeight: 600, fontSize: 14 }}
              >
                {searching ? "Searching..." : "Search"}
              </button>
              <button
                onClick={() => setShowFilterModal(false)}
                style={{ border: "1px solid #d1d5db", borderRadius: 4, background: "#fff", color: "#1f2937", padding: "8px 20px", cursor: "pointer", fontSize: 14 }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
