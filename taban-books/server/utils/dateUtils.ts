/**
 * Date Utilities
 * Date helpers
 */

/**
 * Format date to YYYY-MM-DD
 */
export function formatDate(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  const d = new Date(date);
  return d.toISOString().split("T")[0];
}

/**
 * Calculate due date based on payment terms
 */
export function calculateDueDate(date: Date | string, paymentTerms: string): Date {
  const d = new Date(date);
  const terms: Record<string, number> = {
    due_on_receipt: 0,
    net_15: 15,
    net_30: 30,
    net_45: 45,
    net_60: 60,
  };

  const days = terms[paymentTerms] || 30;
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Get start and end of month
 */
export function getMonthRange(date: Date = new Date()): { start: Date; end: Date } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return { start, end };
}

/**
 * Get start and end of year
 */
export function getYearRange(date: Date = new Date()): { start: Date; end: Date } {
  const start = new Date(date.getFullYear(), 0, 1);
  const end = new Date(date.getFullYear(), 11, 31);
  return { start, end };
}

export default { formatDate, calculateDueDate, getMonthRange, getYearRange };

