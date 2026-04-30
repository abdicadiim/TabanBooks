import JournalEntry from "../models/JournalEntry.js";
import { generateJournalEntryNumber } from "./numberSeries.js";
import { IExpense } from "../models/Expense.js";

/**
 * Creates a Journal Entry for an Expense.
 * Handles both regular and itemized expenses.
 */
export const createJournalEntryForExpense = async (expense: IExpense, organizationId: string) => {
  try {
    const journalEntryNumber = await generateJournalEntryNumber(organizationId);
    
    const lines = [];
    
    // Debit lines (Expenses)
    if (expense.is_itemized_expense && expense.line_items && expense.line_items.length > 0) {
      for (const item of expense.line_items) {
        lines.push({
          account: item.account_id.toString(),
          accountName: expense.account_name || "Expense Account",
          description: item.description || `Expense item: ${expense.reference_number || 'N/A'}`,
          debit: item.amount,
          credit: 0
        });
      }
    } else {
      lines.push({
        account: expense.account_id.toString(),
        accountName: expense.account_name || "Expense Account",
        description: `Expense: ${expense.reference_number || 'N/A'}`,
        debit: expense.amount,
        credit: 0
      });
    }

    // Credit line (Payment source)
    lines.push({
      account: expense.paid_through_account_id.toString(),
      accountName: expense.paid_through_account_name || "Paid Through Account",
      description: `Payment for Expense: ${expense.reference_number || 'N/A'}`,
      debit: 0,
      credit: expense.amount
    });

    const journalEntry = await JournalEntry.create({
      organization: organizationId,
      date: expense.date,
      reference: expense.reference_number,
      entryNumber: journalEntryNumber,
      description: `Expense: ${expense.reference_number} - ${expense.description || ''}`,
      status: "posted",
      currency: expense.currency_code || "KES",
      sourceId: expense._id,
      sourceType: "expense",
      lines: lines
    });

    return journalEntry;
  } catch (error) {
    console.error("Error creating journal entry for expense:", error);
    throw error;
  }
};
