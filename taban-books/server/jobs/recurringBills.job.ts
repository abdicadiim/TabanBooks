/**
 * Recurring Bills Job
 * Scheduled job to create bills from recurring profiles
 */

import RecurringBill from "../models/RecurringBill.js";
import Bill from "../models/Bill.js";
import Organization from "../models/Organization.js";
import { generateNumber } from "../utils/numberSeries.js";

/**
 * Process recurring bills and create new ones
 */
export const processRecurringBills = async (): Promise<void> => {
  try {
    console.log("[RECURRING BILLS] Processing recurring bills...");

    const now = new Date();

    // Find all active recurring bills that are due
    const dueRecurringBills = await RecurringBill.find({
      status: "active",
      next_bill_date: { $lte: now },
      $or: [
        { never_expire: true },
        { end_date: { $gte: now } },
        { end_date: { $exists: false } },
        { end_date: null }
      ]
    });

    console.log(`[RECURRING BILLS] Found ${dueRecurringBills.length} recurring bills to process`);

    for (const recurring of dueRecurringBills) {
      try {
        console.log(`[RECURRING BILLS] Processing: ${recurring.profile_name} (Org: ${recurring.organization})`);

        // Create actual bill from template
        const billData = {
          organization: recurring.organization,
          billDate: new Date(),
          dueDate: new Date(), // TODO: add payment terms logic if needed
          billNumber: `BILL-REC-${Date.now()}`, // Fallback
          vendor: recurring.vendor,
          vendorName: recurring.vendor_name,
          items: recurring.items,
          subtotal: recurring.subtotal,
          tax: recurring.tax,
          discount: recurring.discount,
          total: recurring.total,
          currency: recurring.currency,
          paymentTerms: recurring.paymentTerms,
          notes: recurring.notes,
          accounts_payable: recurring.accounts_payable,
          status: 'open',
          recurring_bill_id: recurring._id
        };

        const newBill = new Bill(billData);
        await newBill.save();

        // Update recurring bill profile
        recurring.last_created_date = new Date();
        
        // Calculate next date
        const nextDate = new Date(recurring.next_bill_date || recurring.start_date);
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
        recurring.next_bill_date = nextDate;

        // Check if it has expired
        if (!recurring.never_expire && recurring.end_date && nextDate > recurring.end_date) {
            recurring.status = 'expired';
        }

        await recurring.save();
        console.log(`[RECURRING BILLS] Successfully processed: ${recurring.profile_name}`);

      } catch (rowError) {
        console.error(`[RECURRING BILLS] Error processing recurring bill ${recurring._id}:`, rowError);
      }
    }

    console.log("[RECURRING BILLS] Processing finished.");
  } catch (error) {
    console.error("[RECURRING BILLS] Critical error in job:", error);
  }
};

/**
 * Schedule the recurring bills job
 */
export const scheduleRecurringBillsJob = () => {
  const SIX_HOURS = 6 * 60 * 60 * 1000;
  
  setTimeout(() => {
    processRecurringBills();
  }, 20000); // 20s delay after start

  setInterval(processRecurringBills, SIX_HOURS);
  console.log("[RECURRING BILLS] Job scheduled (every 6 hours)");
};
