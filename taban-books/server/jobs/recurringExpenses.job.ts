/**
 * Recurring Expenses Job
 * Scheduled job to create expenses from recurring profiles
 */

import RecurringExpense from "../models/RecurringExpense.js";
import Expense from "../models/Expense.js";
import Organization from "../models/Organization.js";
import { createJournalEntryForExpense } from "../utils/expenseAccounting.js";

/**
 * Process recurring expenses and create new ones
 */
export const processRecurringExpenses = async (): Promise<void> => {
  try {
    console.log("[RECURRING EXPENSES] Processing recurring expenses...");

    const now = new Date();

    // Find all active recurring expenses that are due
    const dueRecurringExpenses = await RecurringExpense.find({
      status: "active",
      next_expense_date: { $lte: now },
      $or: [
        { never_expire: true },
        { end_date: { $gte: now } },
        { end_date: { $exists: false } },
        { end_date: null }
      ]
    });

    console.log(`[RECURRING EXPENSES] Found ${dueRecurringExpenses.length} recurring expenses to process`);

    for (const recurring of dueRecurringExpenses) {
      try {
        console.log(`[RECURRING EXPENSES] Processing: ${recurring.profile_name} (Org: ${recurring.organization})`);

        // Create actual expense from template
        const expenseData = {
          organization: recurring.organization,
          date: new Date(),
          account_id: recurring.account_id,
          account_name: recurring.account_name,
          amount: recurring.amount,
          paid_through_account_id: recurring.paid_through_account_id,
          paid_through_account_name: recurring.paid_through_account_name,
          vendor_id: recurring.vendor_id,
          vendor_name: recurring.vendor_name,
          customer_id: recurring.customer_id,
          customer_name: recurring.customer_name,
          project_id: recurring.project_id,
          project_name: recurring.project_name,
          currency_code: recurring.currency_code || 'USD',
          description: recurring.description,
          is_billable: recurring.is_billable,
          is_personal: recurring.is_personal,
          recurring_expense_id: recurring._id,
          status: recurring.is_billable ? 'unbilled' : 'non-billable',
          is_inclusive_tax: recurring.is_inclusive_tax,
          tax_id: recurring.tax_id,
          tax_amount: recurring.tax_amount,
          is_itemized_expense: recurring.is_itemized_expense,
          line_items: recurring.line_items
        };

        const newExpense = new Expense(expenseData);
        await newExpense.save();

        // Create Journal Entry
        try {
          const journalEntry = await createJournalEntryForExpense(newExpense, recurring.organization.toString());
          newExpense.journalEntryId = journalEntry._id as any;
          await newExpense.save();
          console.log(`[RECURRING EXPENSES] Journal Entry created: ${journalEntry.entryNumber}`);
        } catch (jeError) {
          console.error(`[RECURRING EXPENSES] Failed to create journal entry for generated expense ${newExpense._id}:`, jeError);
        }

        // Update recurring expense profile
        recurring.last_created_date = new Date();
        
        // Calculate next date
        const nextDate = new Date(recurring.next_expense_date || recurring.start_date);
        switch (recurring.repeat_every) {
          case 'Week': nextDate.setDate(nextDate.getDate() + 7); break;
          case '2 Weeks': nextDate.setDate(nextDate.getDate() + 14); break;
          case 'Month': nextDate.setMonth(nextDate.getMonth() + 1); break;
          case '2 Months': nextDate.setMonth(nextDate.getMonth() + 2); break;
          case '3 Months': nextDate.setMonth(nextDate.getMonth() + 3); break;
          case '6 Months': nextDate.setMonth(nextDate.getMonth() + 6); break;
          case 'Year': nextDate.setFullYear(nextDate.getFullYear() + 1); break;
          case '2 Years': nextDate.setFullYear(nextDate.getFullYear() + 2); break;
          case '3 Years': nextDate.setFullYear(nextDate.getFullYear() + 3); break;
          default: nextDate.setMonth(nextDate.getMonth() + 1);
        }
        recurring.next_expense_date = nextDate;

        // Check if it has expired
        if (!recurring.never_expire && recurring.end_date && nextDate > recurring.end_date) {
            recurring.status = 'expired';
        }

        await recurring.save();
        console.log(`[RECURRING EXPENSES] Successfully processed: ${recurring.profile_name}`);

      } catch (rowError) {
        console.error(`[RECURRING EXPENSES] Error processing recurring expense ${recurring._id}:`, rowError);
      }
    }

    console.log("[RECURRING EXPENSES] Processing finished.");
  } catch (error) {
    console.error("[RECURRING EXPENSES] Critical error in job:", error);
  }
};

/**
 * Schedule the recurring expenses job
 */
export const scheduleRecurringExpensesJob = () => {
  // Run every 6 hours or as needed
  // For simplicity in this demo environment, we can use a basic interval
  // In production, this might be a cron job
  const SIX_HOURS = 6 * 60 * 60 * 1000;
  
  // Run once on startup after a small delay
  setTimeout(() => {
    processRecurringExpenses();
  }, 10000);

  setInterval(processRecurringExpenses, SIX_HOURS);
  console.log("[RECURRING EXPENSES] Job scheduled (every 6 hours)");
};
