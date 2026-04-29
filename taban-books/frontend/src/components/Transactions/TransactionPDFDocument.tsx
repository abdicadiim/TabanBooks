import React from "react";

type TransactionItem = {
  name?: string;
  description?: string;
  quantity?: number | string;
  rate?: number | string;
  amount?: number | string;
  unit?: string;
};

type TotalsMeta = {
  subTotal?: number | string;
  total?: number | string;
  balance?: number | string;
  paidAmount?: number | string;
  creditsApplied?: number | string;
};

type TransactionPDFDocumentProps = {
  data?: any;
  config?: Record<string, any>;
  moduleType?: string;
  organization?: any;
  totalsMeta?: TotalsMeta;
};

const toNumber = (value: any) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatMoney = (value: any, currency?: string) => {
  const amount = toNumber(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${currency || ""}${currency ? " " : ""}${amount}`.trim();
};

const moduleTitleMap: Record<string, string> = {
  invoices: "INVOICE",
  credit_notes: "CREDIT NOTE",
  quotes: "QUOTE",
  sales_receipts: "SALES RECEIPT",
  recurring_invoices: "RECURRING INVOICE",
  payments_received: "PAYMENT RECEIVED",
  vendor_credits: "VENDOR CREDIT",
  bills: "BILL",
  purchase_orders: "PURCHASE ORDER",
  payments_made: "PAYMENT MADE",
};

export default function TransactionPDFDocument({
  data,
  moduleType,
  organization,
  totalsMeta,
}: TransactionPDFDocumentProps) {
  const title = moduleTitleMap[String(moduleType || "").toLowerCase()] || "TRANSACTION";
  const items: TransactionItem[] = Array.isArray(data?.items) ? data.items : [];
  const currency = data?.currency || organization?.baseCurrency || organization?.currency || "";
  const subTotal = totalsMeta?.subTotal ?? data?.subTotal ?? data?.subtotal ?? 0;
  const total = totalsMeta?.total ?? data?.total ?? data?.amount ?? 0;
  const balance = totalsMeta?.balance ?? data?.balance ?? 0;
  const paidAmount = totalsMeta?.paidAmount ?? 0;
  const creditsApplied = totalsMeta?.creditsApplied ?? 0;

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 860,
        margin: "0 auto",
        background: "#fff",
        border: "1px solid #e5e7eb",
        boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
        padding: "40px 48px",
        color: "#111827",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 24, marginBottom: 40 }}>
        <div style={{ fontSize: 14, lineHeight: 1.6, color: "#4b5563" }}>
          <div style={{ fontSize: 24, fontWeight: 300, letterSpacing: "0.08em", color: "#1f2937", marginBottom: 16 }}>
            {title}
          </div>
          <div style={{ fontWeight: 700, color: "#111827" }}>{organization?.name || organization?.displayName || "Organization"}</div>
          <div>{organization?.country || organization?.address?.country || ""}</div>
          <div>{organization?.email || ""}</div>
        </div>
        <div style={{ textAlign: "right", fontSize: 14, lineHeight: 1.8, color: "#4b5563" }}>
          <div><strong>No:</strong> {data?.number || data?.invoiceNumber || data?.creditNote || data?.vendorCreditNumber || "-"}</div>
          <div><strong>Date:</strong> {data?.date || "-"}</div>
          <div><strong>Name:</strong> {data?.customerName || data?.vendorName || "-"}</div>
        </div>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 28 }}>
        <thead>
          <tr style={{ background: "#2f2f2f", color: "#fff" }}>
            <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 12, fontWeight: 600 }}>ITEM</th>
            <th style={{ padding: "10px 12px", textAlign: "right", fontSize: 12, fontWeight: 600 }}>QTY</th>
            <th style={{ padding: "10px 12px", textAlign: "right", fontSize: 12, fontWeight: 600 }}>RATE</th>
            <th style={{ padding: "10px 12px", textAlign: "right", fontSize: 12, fontWeight: 600 }}>AMOUNT</th>
          </tr>
        </thead>
        <tbody>
          {items.length ? (
            items.map((item, index) => (
              <tr key={`${item.name || "item"}-${index}`} style={{ borderBottom: "1px solid #e5e7eb" }}>
                <td style={{ padding: "12px", fontSize: 13 }}>
                  <div>{item.name || "Item"}</div>
                  {item.description ? (
                    <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>{item.description}</div>
                  ) : null}
                </td>
                <td style={{ padding: "12px", textAlign: "right", fontSize: 13 }}>
                  {item.quantity || 0} {item.unit || ""}
                </td>
                <td style={{ padding: "12px", textAlign: "right", fontSize: 13 }}>{formatMoney(item.rate, currency)}</td>
                <td style={{ padding: "12px", textAlign: "right", fontSize: 13 }}>{formatMoney(item.amount, currency)}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={4} style={{ padding: "18px 12px", textAlign: "center", color: "#6b7280", fontSize: 13 }}>
                No line items
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div style={{ marginLeft: "auto", width: 320, fontSize: 14, color: "#374151" }}>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
          <span>Sub Total</span>
          <span>{formatMoney(subTotal, currency)}</span>
        </div>
        {toNumber(creditsApplied) > 0 ? (
          <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
            <span>Credits Applied</span>
            <span>{formatMoney(creditsApplied, currency)}</span>
          </div>
        ) : null}
        {toNumber(paidAmount) > 0 ? (
          <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
            <span>Paid</span>
            <span>{formatMoney(paidAmount, currency)}</span>
          </div>
        ) : null}
        <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", fontSize: 16, fontWeight: 700, borderTop: "1px solid #e5e7eb", marginTop: 8 }}>
          <span>Total</span>
          <span>{formatMoney(total, currency)}</span>
        </div>
        {data?.balance !== undefined || totalsMeta?.balance !== undefined ? (
          <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", color: "#111827" }}>
            <span>Balance</span>
            <span>{formatMoney(balance, currency)}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
