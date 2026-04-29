/**
 * Formats a date string or Date object into a human-readable format (e.g., 29 Apr 2026)
 */
export const formatDate = (date: Date | string | null | undefined): string => {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

/**
 * Formats a number into a currency string
 */
export const formatCurrency = (amount: number, currency: string = "SOS", locale: string = "en-US"): string => {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
    }).format(amount);
  } catch (e) {
    // Fallback if currency code is invalid
    return `${currency} ${Number(amount).toLocaleString(locale, { minimumFractionDigits: 2 })}`;
  }
};
