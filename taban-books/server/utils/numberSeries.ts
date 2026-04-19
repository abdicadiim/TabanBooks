/**
 * Number Series Utility
 * Invoice/bill numbering
 */

/**
 * Generate next number in series
 * @param prefix - Prefix (e.g., "INV", "BILL")
 * @param lastNumber - Last number used
 * @param padding - Zero padding length
 * @returns Formatted number (e.g., "INV-000001")
 */
export function generateNumber(prefix: string, lastNumber: number = 0, padding: number = 6): string {
  const nextNumber = lastNumber + 1;
  const paddedNumber = String(nextNumber).padStart(padding, "0");
  return `${prefix}-${paddedNumber}`;
}

/**
 * Extract number from formatted string
 * @param formattedNumber - Formatted number (e.g., "INV-000001")
 * @returns Extracted number
 */
export function extractNumber(formattedNumber: string): number {
  const match = formattedNumber.match(/-(\d+)$/);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * Generate expense number for an organization
 * @param organizationId - Organization ID
 * @returns Formatted expense number (e.g., "EXP-000001")
 */
export async function generateExpenseNumber(organizationId: string): Promise<string> {
  // Import here to avoid circular dependency
  const Expense = (await import("../models/Expense.js")).default;
  const mongoose = (await import("mongoose")).default;

  const prefix = "EXP-";

  try {
    // Find the highest expense number with this prefix
    const lastExpense = await Expense.findOne({
      organization: new mongoose.Types.ObjectId(organizationId),
      reference_number: {
        $regex: `^${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
        $exists: true
      }
    })
      .sort({ reference_number: -1 })
      .select("reference_number")
      .lean();

    let nextNumber = 1;
    if (lastExpense && lastExpense.reference_number) {
      // Extract number from expense number (e.g., "EXP-000001" -> 1)
      const match = lastExpense.reference_number.match(/\d+$/);
      if (match) {
        nextNumber = parseInt(match[0], 10) + 1;
      }
    }

    // Format with zero padding
    const paddedNumber = String(nextNumber).padStart(6, "0");
    return `${prefix}${paddedNumber}`;
  } catch (error) {
    // If there's an error, return a default number
    console.error("Error generating expense number:", error);
    return `${prefix}000001`;
  }
}

/**
 * Generate journal entry number for an organization
 * @param organizationId - Organization ID
 * @returns Formatted journal entry number (e.g., "JE-000001")
 */
export async function generateJournalEntryNumber(organizationId: string): Promise<string> {
  // Import here to avoid circular dependency
  const JournalEntry = (await import("../models/JournalEntry.js")).default;
  const mongoose = (await import("mongoose")).default;

  const prefix = "JE-";

  try {
    // Find the highest journal entry number with this prefix
    const lastEntry = await JournalEntry.findOne({
      organization: new mongoose.Types.ObjectId(organizationId),
      entryNumber: {
        $regex: `^${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
        $exists: true
      }
    })
      .sort({ entryNumber: -1 })
      .select("entryNumber")
      .lean();

    let nextNumber = 1;
    if (lastEntry && lastEntry.entryNumber) {
      // Extract number from journal entry number (e.g., "JE-000001" -> 1)
      const match = lastEntry.entryNumber.match(/\d+$/);
      if (match) {
        nextNumber = parseInt(match[0], 10) + 1;
      }
    }

    // Format with zero padding
    const paddedNumber = String(nextNumber).padStart(6, "0");
    return `${prefix}${paddedNumber}`;
  } catch (error) {
    // If there's an error, return a default number
    console.error("Error generating journal entry number:", error);
    return `${prefix}000001`;
  }
}

/**
 * Generate next invoice number for an organization
 * @param organizationId - Organization ID
 * @param increment - Whether to increment the series currentNumber
 * @returns Formatted invoice number (e.g., "INV-000001")
 */
export async function generateInvoiceNumber(organizationId: string, increment: boolean = false): Promise<string> {
  const Invoice = (await import("../models/Invoice.js")).default;
  const TransactionNumberSeries = (await import("../models/TransactionNumberSeries.js")).default;
  const mongoose = (await import("mongoose")).default;

  try {
    // 1. Try to get from TransactionNumberSeries
    const series = await TransactionNumberSeries.findOne({
      organization: new mongoose.Types.ObjectId(organizationId),
      module: 'Invoice',
      isDefault: true,
      isActive: true
    });

    if (series) {
      const nextNumber = (series.currentNumber || 0) + 1;
      const prefix = series.prefix || 'INV-';
      const paddedNumber = String(nextNumber).padStart(series.startingNumber?.length || 6, '0');
      const invoiceNumber = `${prefix}${paddedNumber}`;

      if (increment) {
        series.currentNumber = nextNumber;
        await series.save();
      }

      return invoiceNumber;
    }

    // 2. Fallback to extracting from last invoice if no series found
    const prefix = 'INV-';
    const lastInvoice = await Invoice.findOne({
      organization: new mongoose.Types.ObjectId(organizationId),
      invoiceNumber: new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`)
    })
      .sort({ invoiceNumber: -1 })
      .lean();

    let nextNumber = 1;
    if (lastInvoice && lastInvoice.invoiceNumber) {
      const match = lastInvoice.invoiceNumber.match(/\d+$/);
      if (match) {
        nextNumber = parseInt(match[0], 10) + 1;
      }
    }

    const paddedNumber = String(nextNumber).padStart(6, '0');
    return `${prefix}${paddedNumber}`;
  } catch (error) {
    console.error("Error generating invoice number:", error);
    return `INV-${Date.now()}`;
  }
}

export default { generateNumber, extractNumber, generateExpenseNumber, generateJournalEntryNumber, generateInvoiceNumber };

