import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { bankAccountsAPI, bankStatementsAPI } from "../../services/api";

type ParsedTransaction = {
  date: string;
  debit_or_credit: "debit" | "credit";
  amount: number;
  description?: string;
  reference_number?: string;
  payee?: string;
};

const parseDelimitedLine = (line: string, delimiter: string): string[] => {
  const out: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    const next = line[i + 1];

    if (ch === '"' && inQuotes && next === '"') {
      current += '"';
      i += 1;
      continue;
    }
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === delimiter && !inQuotes) {
      out.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  out.push(current.trim());
  return out;
};

const parseStatementText = (text: string, delimiter: string): ParsedTransaction[] => {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const headers = parseDelimitedLine(lines[0], delimiter).map((h) => h.toLowerCase());
  const findHeader = (keys: string[]) =>
    headers.findIndex((header) => keys.some((key) => header.includes(key)));

  const dateIndex = findHeader(["date"]);
  const descriptionIndex = findHeader(["description", "memo", "narration", "details"]);
  const referenceIndex = findHeader(["reference", "ref", "check"]);
  const payeeIndex = findHeader(["payee", "name", "party"]);
  const debitIndex = findHeader(["debit", "withdrawal", "withdraw"]);
  const creditIndex = findHeader(["credit", "deposit"]);
  const amountIndex = findHeader(["amount"]);

  if (dateIndex < 0) {
    throw new Error("Date column is required in the statement file.");
  }

  const transactions: ParsedTransaction[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cols = parseDelimitedLine(lines[i], delimiter);
    const date = cols[dateIndex];
    if (!date) continue;

    const rawDebit = debitIndex >= 0 ? Number(String(cols[debitIndex] || "").replace(/,/g, "")) : NaN;
    const rawCredit = creditIndex >= 0 ? Number(String(cols[creditIndex] || "").replace(/,/g, "")) : NaN;
    const rawAmount = amountIndex >= 0 ? Number(String(cols[amountIndex] || "").replace(/,/g, "")) : NaN;

    let amount = 0;
    let debit_or_credit: "debit" | "credit" = "debit";

    if (Number.isFinite(rawCredit) && rawCredit > 0) {
      amount = Math.abs(rawCredit);
      debit_or_credit = "credit";
    } else if (Number.isFinite(rawDebit) && rawDebit > 0) {
      amount = Math.abs(rawDebit);
      debit_or_credit = "debit";
    } else if (Number.isFinite(rawAmount) && rawAmount !== 0) {
      amount = Math.abs(rawAmount);
      debit_or_credit = rawAmount >= 0 ? "credit" : "debit";
    } else {
      continue;
    }

    transactions.push({
      date,
      debit_or_credit,
      amount,
      description: descriptionIndex >= 0 ? cols[descriptionIndex] : "",
      reference_number: referenceIndex >= 0 ? cols[referenceIndex] : "",
      payee: payeeIndex >= 0 ? cols[payeeIndex] : "",
    });
  }

  return transactions;
};

export default function ImportStatement() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [delimiter, setDelimiter] = useState<"," | "\t">(",");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [account, setAccount] = useState<any>(location.state?.account || null);
  const accountId = account?._id || account?.id || id;

  useEffect(() => {
    if (account || !accountId) return;
    bankAccountsAPI.getById(accountId).then((res) => {
      if (res?.bankaccount) setAccount(res.bankaccount);
    }).catch(() => undefined);
  }, [account, accountId]);

  const importStatement = async () => {
    if (!selectedFile || !accountId) return;
    setSubmitting(true);
    setError("");
    try {
      const ext = selectedFile.name.toLowerCase().split(".").pop() || "";
      if (ext !== "csv" && ext !== "tsv") {
        throw new Error("This screen currently supports CSV/TSV import. Please upload CSV or TSV.");
      }

      const text = await selectedFile.text();
      const parsedTransactions = parseStatementText(text, ext === "tsv" ? "\t" : delimiter);

      if (!parsedTransactions.length) {
        throw new Error("No valid transactions were found in the selected file.");
      }

      const dates = parsedTransactions
        .map((t) => new Date(t.date))
        .filter((d) => !Number.isNaN(d.getTime()))
        .sort((a, b) => a.getTime() - b.getTime());

      await bankStatementsAPI.import({
        account_id: accountId,
        start_date: dates.length ? dates[0].toISOString() : undefined,
        end_date: dates.length ? dates[dates.length - 1].toISOString() : undefined,
        transactions: parsedTransactions,
      });

      navigate(`/banking/account/${accountId}`, {
        state: { account },
      });
    } catch (err: any) {
      console.error("Failed to import statement:", err);
      setError(err?.message || "Failed to import statement");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: "calc(100vh - 60px)", backgroundColor: "#f7f8fc", paddingRight: "24px", paddingBottom: "24px" }}>
      <div style={{ backgroundColor: "white", minHeight: "calc(100vh - 60px)", padding: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px", borderBottom: "1px solid #e5e7eb", paddingBottom: "16px" }}>
          <h1 style={{ margin: 0, color: "#111827", fontSize: "24px" }}>
            Import Statement for {account?.accountName || "Bank Account"}
          </h1>
          <button
            onClick={() => navigate(`/banking/account/${accountId}`, { state: { account } })}
            style={{ border: "none", background: "none", cursor: "pointer", color: "#6b7280" }}
          >
            Close
          </button>
        </div>

        <div style={{ marginBottom: "16px", color: "#6b7280", fontSize: "14px" }}>
          Upload a CSV/TSV statement file and import it into Taban Banking.
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 260px", gap: "12px", alignItems: "end", marginBottom: "16px" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: "6px", color: "#111827", fontSize: "14px" }}>
            Statement File
            <input
              type="file"
              accept=".csv,.tsv"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              style={{ border: "1px solid #d1d5db", borderRadius: "6px", padding: "10px" }}
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: "6px", color: "#111827", fontSize: "14px" }}>
            File Delimiter (CSV only)
            <select
              value={delimiter}
              onChange={(e) => setDelimiter(e.target.value as "," | "\t")}
              style={{ border: "1px solid #d1d5db", borderRadius: "6px", padding: "10px" }}
            >
              <option value=",">Comma (,)</option>
              <option value={"\t"}>Tab</option>
            </select>
          </label>
        </div>

        {selectedFile && (
          <div style={{ marginBottom: "12px", color: "#111827", fontSize: "14px" }}>
            Selected file: <strong>{selectedFile.name}</strong>
          </div>
        )}

        {error && (
          <div style={{ marginBottom: "12px", color: "#b91c1c", backgroundColor: "#fef2f2", border: "1px solid #fecaca", padding: "10px 12px", borderRadius: "6px" }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", borderTop: "1px solid #e5e7eb", paddingTop: "16px" }}>
          <button
            onClick={() => navigate(`/banking/account/${accountId}`, { state: { account } })}
            style={{ border: "1px solid #d1d5db", backgroundColor: "white", borderRadius: "6px", padding: "10px 14px", cursor: "pointer" }}
          >
            Cancel
          </button>
          <button
            onClick={importStatement}
            disabled={!selectedFile || submitting}
            style={{ border: "none", backgroundColor: "#156372", color: "white", borderRadius: "6px", padding: "10px 14px", cursor: submitting ? "not-allowed" : "pointer", opacity: !selectedFile || submitting ? 0.7 : 1 }}
          >
            {submitting ? "Importing..." : "Import"}
          </button>
        </div>
      </div>
    </div>
  );
}
