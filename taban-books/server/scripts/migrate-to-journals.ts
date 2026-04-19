/**
 * DATA MIGRATION SCRIPT
 * 
 * This script creates opening balance journal entries for existing data
 * Run this ONCE after deploying the new accounting service
 * 
 * Usage:
 *   ts-node server/scripts/migrate-to-journals.ts
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import Invoice from "../models/Invoice.js";
import Expense from "../models/Expense.js";
import PaymentReceived from "../models/PaymentReceived.js";
import PaymentMade from "../models/PaymentMade.js";
import Bill from "../models/Bill.js";
import accountingService from "../services/accounting.service.js";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/taban-books";

async function connectDB() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log("✅ Connected to MongoDB");
    } catch (error) {
        console.error("❌ MongoDB connection error:", error);
        process.exit(1);
    }
}

/**
 * STEP 1: Migrate Invoices
 * Create journal entries for all sent invoices that don't have one
 */
async function migrateInvoices() {
    console.log("\n📄 Migrating Invoices...");

    const invoices = await Invoice.find({
        status: { $in: ["sent", "viewed", "paid", "partially paid"] },
        journalEntryCreated: { $ne: true },
    }).populate("customer");

    console.log(`Found ${invoices.length} invoices to migrate`);

    let migrated = 0;
    let errors = 0;

    for (const invoice of invoices) {
        try {
            // Extract revenue accounts from items
            const items = invoice.items.map((item: any) => ({
                account: item.revenueAccount || item.account,
                amount: (item.total || 0) - (item.taxAmount || 0),
            })).filter((item: any) => item.account && item.amount > 0);

            if (items.length === 0) {
                console.warn(`⚠️  Invoice ${invoice.invoiceNumber} has no revenue accounts, skipping`);
                continue;
            }

            const journal = await accountingService.postInvoiceJournal({
                organization: invoice.organization,
                invoiceId: invoice._id,
                invoiceNumber: invoice.invoiceNumber,
                date: invoice.date,
                customerId: invoice.customer,
                total: invoice.total,
                tax: invoice.tax || 0,
                subtotal: invoice.subtotal || 0,
                items,
            });

            invoice.journalEntryCreated = true;
            invoice.journalEntryId = journal._id;
            await invoice.save();

            migrated++;
            console.log(`✅ Migrated invoice ${invoice.invoiceNumber}`);
        } catch (error: any) {
            errors++;
            console.error(`❌ Error migrating invoice ${invoice.invoiceNumber}:`, error.message);
        }
    }

    console.log(`\n📊 Invoice Migration Complete:`);
    console.log(`   ✅ Migrated: ${migrated}`);
    console.log(`   ❌ Errors: ${errors}`);
}

/**
 * STEP 2: Migrate Customer Payments
 * Create journal entries for all payments that don't have one
 */
async function migrateCustomerPayments() {
    console.log("\n💰 Migrating Customer Payments...");

    const payments = await PaymentReceived.find({
        journalEntryId: { $exists: false },
    });

    console.log(`Found ${payments.length} payments to migrate`);

    let migrated = 0;
    let errors = 0;

    for (const payment of payments) {
        try {
            if (!payment.depositTo) {
                console.warn(`⚠️  Payment ${payment.paymentNumber} has no deposit account, skipping`);
                continue;
            }

            const journal = await accountingService.postCustomerPaymentJournal({
                organization: payment.organization,
                paymentId: payment._id,
                paymentNumber: payment.paymentNumber || `PMT-${payment._id}`,
                date: payment.date,
                amount: payment.amount,
                bankAccountId: payment.depositTo.toString(),
                customerId: payment.customer,
            });

            payment.journalEntryId = journal._id;
            await payment.save();

            migrated++;
            console.log(`✅ Migrated payment ${payment.paymentNumber}`);
        } catch (error: any) {
            errors++;
            console.error(`❌ Error migrating payment ${payment.paymentNumber}:`, error.message);
        }
    }

    console.log(`\n📊 Payment Migration Complete:`);
    console.log(`   ✅ Migrated: ${migrated}`);
    console.log(`   ❌ Errors: ${errors}`);
}

/**
 * STEP 3: Migrate Expenses
 * Create journal entries for all expenses that don't have one
 */
async function migrateExpenses() {
    console.log("\n💸 Migrating Expenses...");

    const expenses = await Expense.find({
        journalEntryId: { $exists: false },
    });

    console.log(`Found ${expenses.length} expenses to migrate`);

    let migrated = 0;
    let errors = 0;

    for (const expense of expenses) {
        try {
            if (!expense.account_id || !expense.paid_through_account_id) {
                console.warn(`⚠️  Expense ${expense.reference_number} missing accounts, skipping`);
                continue;
            }

            const journal = await accountingService.postExpenseJournal({
                organization: expense.organization,
                expenseId: expense._id,
                referenceNumber: expense.reference_number,
                date: expense.date,
                amount: expense.amount,
                taxAmount: expense.tax_amount || 0,
                expenseAccountId: expense.account_id.toString(),
                paidThroughAccountId: expense.paid_through_account_id.toString(),
                description: expense.description,
            });

            expense.journalEntryId = journal._id;
            await expense.save();

            migrated++;
            console.log(`✅ Migrated expense ${expense.reference_number}`);
        } catch (error: any) {
            errors++;
            console.error(`❌ Error migrating expense ${expense.reference_number}:`, error.message);
        }
    }

    console.log(`\n📊 Expense Migration Complete:`);
    console.log(`   ✅ Migrated: ${migrated}`);
    console.log(`   ❌ Errors: ${errors}`);
}

/**
 * STEP 4: Migrate Bills
 * Create journal entries for all confirmed bills that don't have one
 */
async function migrateBills() {
    console.log("\n📋 Migrating Bills...");

    const bills = await Bill.find({
        status: { $in: ["confirmed", "approved", "paid", "partially paid"] },
        journalEntryCreated: { $ne: true },
    });

    console.log(`Found ${bills.length} bills to migrate`);

    let migrated = 0;
    let errors = 0;

    for (const bill of bills) {
        try {
            const items = bill.items.map((item: any) => ({
                account: item.expenseAccount || item.account,
                amount: (item.total || 0) - (item.taxAmount || 0),
            })).filter((item: any) => item.account && item.amount > 0);

            if (items.length === 0) {
                console.warn(`⚠️  Bill ${bill.billNumber} has no expense accounts, skipping`);
                continue;
            }

            const journal = await accountingService.postBillJournal({
                organization: bill.organization,
                billId: bill._id,
                billNumber: bill.billNumber,
                date: bill.date,
                total: bill.total,
                tax: bill.tax || 0,
                items,
            });

            bill.journalEntryCreated = true;
            bill.journalEntryId = journal._id;
            await bill.save();

            migrated++;
            console.log(`✅ Migrated bill ${bill.billNumber}`);
        } catch (error: any) {
            errors++;
            console.error(`❌ Error migrating bill ${bill.billNumber}:`, error.message);
        }
    }

    console.log(`\n📊 Bill Migration Complete:`);
    console.log(`   ✅ Migrated: ${migrated}`);
    console.log(`   ❌ Errors: ${errors}`);
}

/**
 * STEP 5: Migrate Vendor Payments
 * Create journal entries for all vendor payments that don't have one
 */
async function migrateVendorPayments() {
    console.log("\n💳 Migrating Vendor Payments...");

    const payments = await PaymentMade.find({
        journalEntryId: { $exists: false },
    });

    console.log(`Found ${payments.length} vendor payments to migrate`);

    let migrated = 0;
    let errors = 0;

    for (const payment of payments) {
        try {
            if (!payment.paidThrough) {
                console.warn(`⚠️  Payment ${payment.paymentNumber} has no paid through account, skipping`);
                continue;
            }

            const journal = await accountingService.postVendorPaymentJournal({
                organization: payment.organization,
                paymentId: payment._id,
                paymentNumber: payment.paymentNumber || `VPM-${payment._id}`,
                date: payment.date,
                amount: payment.amount,
                bankAccountId: payment.paidThrough.toString(),
            });

            payment.journalEntryId = journal._id;
            await payment.save();

            migrated++;
            console.log(`✅ Migrated vendor payment ${payment.paymentNumber}`);
        } catch (error: any) {
            errors++;
            console.error(`❌ Error migrating vendor payment ${payment.paymentNumber}:`, error.message);
        }
    }

    console.log(`\n📊 Vendor Payment Migration Complete:`);
    console.log(`   ✅ Migrated: ${migrated}`);
    console.log(`   ❌ Errors: ${errors}`);
}

/**
 * MAIN MIGRATION FUNCTION
 */
async function migrate() {
    console.log("🚀 Starting Data Migration to Journal-Based Accounting...\n");
    console.log("This will create journal entries for existing transactions");
    console.log("that don't already have them.\n");

    await connectDB();

    try {
        // Run migrations in order
        await migrateInvoices();
        await migrateCustomerPayments();
        await migrateExpenses();
        await migrateBills();
        await migrateVendorPayments();

        console.log("\n✅ Migration Complete!");
        console.log("\nNext Steps:");
        console.log("1. Verify balances in dashboard");
        console.log("2. Run trial balance report");
        console.log("3. Check that AR/AP balances are correct");
        console.log("4. Test creating new transactions");
    } catch (error) {
        console.error("\n❌ Migration Failed:", error);
    } finally {
        await mongoose.disconnect();
        console.log("\n👋 Disconnected from MongoDB");
    }
}

// Run migration if this file is executed directly
if (require.main === module) {
    migrate().catch(console.error);
}

export { migrate };
