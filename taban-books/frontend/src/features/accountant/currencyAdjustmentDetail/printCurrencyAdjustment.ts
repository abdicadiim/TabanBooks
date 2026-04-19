import {
  CURRENCY_ADJUSTMENT_ATTACHMENT_COUNT,
  CURRENCY_ADJUSTMENT_TITLE,
} from "../currencyAdjustmentConfig";
import type { CurrencyAdjustment } from "../currencyAdjustmentTypes";
import {
  escapeHtml,
  formatCurrencyAdjustmentCreatedDate,
  formatCurrencyAdjustmentSignedValue,
  getCurrencyAdjustmentNotes,
  getCurrencyCode,
} from "../currencyAdjustmentUtils";

const PRINT_STYLES = `
  <style>
    @media print {
      @page {
        margin: 20mm;
      }
      body {
        font-family: Arial, sans-serif;
        padding: 0;
        margin: 0;
        color: #000;
        background: #fff;
      }
    }
    body {
      font-family: Arial, sans-serif;
      padding: 40px;
      margin: 0;
      color: #111827;
      background: #ffffff;
    }
    h1 {
      font-size: 28px;
      font-weight: 700;
      color: #000000;
      margin-bottom: 8px;
    }
    .subtitle {
      font-size: 18px;
      color: #6b7280;
      margin-bottom: 24px;
    }
    .details-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 24px;
      margin-bottom: 24px;
    }
    .detail-item {
      margin-bottom: 8px;
    }
    .detail-label {
      font-size: 12px;
      color: #6b7280;
      margin-bottom: 4px;
    }
    .detail-value {
      font-size: 16px;
      font-weight: 500;
      color: #111827;
    }
    .notes-section {
      margin-bottom: 24px;
    }
    .notes-label {
      font-size: 14px;
      font-weight: 600;
      color: #111827;
      margin-bottom: 8px;
    }
    .notes-content {
      font-size: 14px;
      color: #111827;
      padding: 12px;
      background-color: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      font-size: 14px;
    }
    th, td {
      padding: 12px 16px;
      text-align: left;
      border: 1px solid #e5e7eb;
    }
    th {
      background-color: #1e40af;
      color: white;
      font-weight: 600;
      font-size: 12px;
      text-transform: uppercase;
    }
    tbody tr {
      border-bottom: 1px solid #f3f4f6;
    }
    tbody tr:last-child {
      background-color: #f9fafb;
      font-weight: 600;
    }
    .more-info {
      background-color: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 16px;
      margin-top: 24px;
    }
    .more-info h3 {
      font-size: 14px;
      font-weight: 600;
      color: #111827;
      margin-bottom: 12px;
    }
    .more-info-row {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      margin-bottom: 8px;
    }
    .more-info-label {
      color: #6b7280;
    }
    .more-info-value {
      color: #111827;
      font-weight: 500;
    }
    .positive {
      color: #10b981;
    }
    .negative {
      color: #ef4444;
    }
  </style>
`;

interface PrintCurrencyAdjustmentOptions {
  adjustment: CurrencyAdjustment;
  adjustmentNumber: number | null;
}

export function printCurrencyAdjustment({
  adjustment,
  adjustmentNumber,
}: PrintCurrencyAdjustmentOptions): boolean {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return false;

  const gainLossValue = Number(adjustment.gainOrLoss || 0);
  const gainLossClass = gainLossValue >= 0 ? "positive" : "negative";
  const gainLossLabel = formatCurrencyAdjustmentSignedValue(gainLossValue, "AMD");
  const createdLabel = formatCurrencyAdjustmentCreatedDate(adjustment.createdAt);
  const notes = escapeHtml(getCurrencyAdjustmentNotes(adjustment.notes));
  const currency = escapeHtml(adjustment.currency);
  const date = escapeHtml(adjustment.date);
  const exchangeRate = escapeHtml(String(adjustment.exchangeRate));
  const currencyCode = escapeHtml(getCurrencyCode(adjustment.currency));
  const attachmentLabel = `${CURRENCY_ADJUSTMENT_ATTACHMENT_COUNT} Attachment(s) added`;

  const printContent = `
    <div>
      <h1>${CURRENCY_ADJUSTMENT_TITLE}</h1>
      <div class="subtitle">${adjustmentNumber ? `#${adjustmentNumber}` : ""}</div>

      <div class="details-grid">
        <div class="detail-item">
          <div class="detail-label">Date</div>
          <div class="detail-value">${date}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Currency</div>
          <div class="detail-value">${currency}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Gain or Loss</div>
          <div class="detail-value ${gainLossClass}">
            ${escapeHtml(gainLossLabel)}
          </div>
        </div>
      </div>

      <div class="notes-section">
        <div class="notes-label">Notes</div>
        <div class="notes-content">${notes}</div>
      </div>

      <table>
        <thead>
          <tr>
            <th>CURRENCY</th>
            <th>EXCHANGE RATE</th>
            <th style="text-align: right;">GAIN OR LOSS</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>${currency}</td>
            <td>1 ${currencyCode} = ${exchangeRate} AMD</td>
            <td style="text-align: right;" class="${gainLossClass}">
              ${escapeHtml(gainLossLabel)}
            </td>
          </tr>
          <tr>
            <td><strong>Total</strong></td>
            <td>${exchangeRate} AMD</td>
            <td style="text-align: right;" class="${gainLossClass}">
              <strong>${escapeHtml(gainLossLabel)}</strong>
            </td>
          </tr>
        </tbody>
      </table>

      <div class="more-info">
        <h3>More Information</h3>
        <div class="more-info-row">
          <span class="more-info-label">Adjustment Date:</span>
          <span class="more-info-value">${date}</span>
        </div>
        ${
          createdLabel
            ? `
          <div class="more-info-row">
            <span class="more-info-label">Created:</span>
            <span class="more-info-value">${escapeHtml(createdLabel)}</span>
          </div>
        `
            : ""
        }
        <div class="more-info-row">
          <span class="more-info-label">Attachments:</span>
          <span class="more-info-value">${attachmentLabel}</span>
        </div>
      </div>
    </div>
  `;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Currency Adjustment - ${date}</title>
        ${PRINT_STYLES}
      </head>
      <body>
        ${printContent}
      </body>
    </html>
  `);
  printWindow.document.close();

  setTimeout(() => {
    printWindow.print();
  }, 250);

  return true;
}
