/**
 * Invoice Service
 * Invoice business logic
 */

interface InvoiceItem {
  total: number;
  [key: string]: any;
}

interface InvoiceTotals {
  subtotal: number;
  tax: number;
  total: number;
}

/**
 * Calculate invoice totals
 * @param items - Array of invoice items
 * @param taxRate - Tax rate percentage (default: 0)
 * @param discount - Discount amount (default: 0)
 * @returns Invoice totals
 */
export const calculateInvoiceTotal = (
  items: InvoiceItem[],
  taxRate: number = 0,
  discount: number = 0
): InvoiceTotals => {
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const tax = subtotal * (taxRate / 100);
  const total = subtotal + tax - discount;
  return { subtotal, tax, total };
};

export default { calculateInvoiceTotal };

