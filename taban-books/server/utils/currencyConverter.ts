/**
 * Currency Converter Utility
 * Currency conversion helpers
 */

/**
 * Convert currency amount
 * @param amount - Amount to convert
 * @param fromCurrency - Source currency code
 * @param toCurrency - Target currency code
 * @param rate - Exchange rate
 * @returns Converted amount
 */
export const convertCurrency = (
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rate: number
): number => {
  if (fromCurrency === toCurrency) return amount;
  return amount * rate;
};

export default { convertCurrency };

