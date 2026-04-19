import BankAccount from "../models/BankAccount.js";
import Bill from "../models/Bill.js";
import ChartOfAccount from "../models/ChartOfAccount.js";
import CreditNote from "../models/CreditNote.js";
import Expense from "../models/Expense.js";
import Invoice from "../models/Invoice.js";
import JournalEntry from "../models/JournalEntry.js";
import PaymentReceived from "../models/PaymentReceived.js";
import Project from "../models/Project.js";
import VendorCredit from "../models/VendorCredit.js";

const PERFORMANCE_INDEX_MODELS = [
  { name: "BankAccount", model: BankAccount },
  { name: "Bill", model: Bill },
  { name: "ChartOfAccount", model: ChartOfAccount },
  { name: "CreditNote", model: CreditNote },
  { name: "Expense", model: Expense },
  { name: "Invoice", model: Invoice },
  { name: "JournalEntry", model: JournalEntry },
  { name: "PaymentReceived", model: PaymentReceived },
  { name: "Project", model: Project },
  { name: "VendorCredit", model: VendorCredit },
];

export async function ensurePerformanceIndexes(): Promise<void> {
  const startedAt = Date.now();
  const results = await Promise.allSettled(
    PERFORMANCE_INDEX_MODELS.map(async ({ name, model }) => {
      await model.createIndexes();
      return name;
    }),
  );

  results.forEach((result) => {
    if (result.status === "fulfilled") {
      console.log(`[DB] Ensured performance indexes for ${result.value}`);
      return;
    }

    console.error("[DB] Failed to ensure performance indexes:", result.reason);
  });

  console.log(`[DB] Performance index ensure completed in ${Date.now() - startedAt}ms`);
}
