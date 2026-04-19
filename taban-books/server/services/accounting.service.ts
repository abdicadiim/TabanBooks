/**
 * ACCOUNTING SERVICE - SINGLE SOURCE OF TRUTH
 * 
 * This service enforces proper double-entry bookkeeping.
 * ALL financial transactions MUST go through this service.
 * 
 * CORE PRINCIPLES:
 * 1. Every transaction creates journal entries
 * 2. Only POSTED journals affect account balances
 * 3. Balances are CALCULATED, never stored
 * 4. Documents (invoices, bills) are business records only
 */

import mongoose from "mongoose";
import JournalEntry from "../models/JournalEntry.js";
import ChartOfAccount from "../models/ChartOfAccount.js";

// Account type behavior rules
const ACCOUNT_RULES = {
    Asset: { debitIncreases: true, normalBalance: "debit" },
    Expense: { debitIncreases: true, normalBalance: "debit" },
    Liability: { debitIncreases: false, normalBalance: "credit" },
    Income: { debitIncreases: false, normalBalance: "credit" },
    Equity: { debitIncreases: false, normalBalance: "credit" },
};

interface JournalLine {
    account: string;
    accountName?: string;
    description?: string;
    debit?: number;
    credit?: number;
    project?: mongoose.Types.ObjectId;
}

interface CreateJournalParams {
    organization: mongoose.Types.ObjectId;
    date: Date;
    lines: JournalLine[];
    description?: string;
    reference?: string;
    sourceDocument?: {
        type: "invoice" | "bill" | "expense" | "payment_received" | "payment_made" | "sales_receipt";
        id: mongoose.Types.ObjectId;
    };
    autoPost?: boolean; // If true, immediately post the journal
}

class AccountingService {
    /**
     * VALIDATE JOURNAL ENTRY
     * Ensures debits = credits and all accounts exist
     */
    private async validateJournal(lines: JournalLine[], organization: mongoose.Types.ObjectId): Promise<void> {
        if (!lines || lines.length < 2) {
            throw new Error("Journal must have at least 2 lines (double-entry)");
        }

        let totalDebits = 0;
        let totalCredits = 0;

        for (const line of lines) {
            const debit = line.debit || 0;
            const credit = line.credit || 0;

            // Validate: cannot have both debit and credit on same line
            if (debit > 0 && credit > 0) {
                throw new Error(`Line cannot have both debit and credit: ${line.account}`);
            }

            // Validate: must have either debit or credit
            if (debit === 0 && credit === 0) {
                throw new Error(`Line must have either debit or credit: ${line.account}`);
            }

            totalDebits += debit;
            totalCredits += credit;

            // Validate account exists
            const account = await ChartOfAccount.findOne({
                _id: line.account,
                organization,
            });

            if (!account) {
                throw new Error(`Account not found: ${line.account}`);
            }

            // Store account name for reference
            line.accountName = account.name;
        }

        // CRITICAL: Debits must equal credits
        const difference = Math.abs(totalDebits - totalCredits);
        if (difference > 0.01) {
            // Allow 1 cent rounding difference
            throw new Error(
                `Journal is not balanced. Debits: ${totalDebits.toFixed(2)}, Credits: ${totalCredits.toFixed(2)}`
            );
        }
    }

    /**
     * CREATE JOURNAL ENTRY
     * Creates a journal entry (draft by default)
     */
    async createJournal(params: CreateJournalParams): Promise<any> {
        const { organization, date, lines, description, reference, sourceDocument: _sourceDocument, autoPost } = params;

        // Validate the journal
        await this.validateJournal(lines, organization);

        // Generate entry number
        const entryNumber = await this.generateEntryNumber(organization);

        // Create the journal entry
        const journal = new JournalEntry({
            organization,
            entryNumber,
            date,
            lines,
            description,
            reference,
            status: autoPost ? "posted" : "draft",
            postedAt: autoPost ? new Date() : undefined,
        });

        await journal.save();

        return journal;
    }

    /**
     * POST JOURNAL ENTRY
     * Changes status from draft to posted
     * Only posted journals affect account balances
     */
    async postJournal(journalId: mongoose.Types.ObjectId, userId?: mongoose.Types.ObjectId): Promise<any> {
        const journal = await JournalEntry.findById(journalId);

        if (!journal) {
            throw new Error("Journal entry not found");
        }

        if (journal.status === "posted") {
            throw new Error("Journal entry is already posted");
        }

        if (journal.status === "cancelled") {
            throw new Error("Cannot post a cancelled journal entry");
        }

        // Re-validate before posting
        await this.validateJournal(journal.lines, journal.organization);

        journal.status = "posted";
        journal.postedAt = new Date();
        journal.postedBy = userId;

        await journal.save();

        return journal;
    }

    /**
     * REVERSE JOURNAL ENTRY
     * Creates a reversing entry (opposite debits/credits)
     * Used for voiding transactions
     */
    async reverseJournal(
        journalId: mongoose.Types.ObjectId,
        reversalDate: Date,
        description?: string
    ): Promise<any> {
        const originalJournal = await JournalEntry.findById(journalId);

        if (!originalJournal) {
            throw new Error("Original journal entry not found");
        }

        if (originalJournal.status !== "posted") {
            throw new Error("Can only reverse posted journal entries");
        }

        // Create reversed lines (swap debits and credits)
        const reversedLines = originalJournal.lines.map((line: any) => ({
            account: line.account,
            accountName: line.accountName,
            description: line.description,
            debit: line.credit || 0,
            credit: line.debit || 0,
            project: line.project,
        }));

        // Create the reversal journal
        const reversalJournal = await this.createJournal({
            organization: originalJournal.organization,
            date: reversalDate,
            lines: reversedLines,
            description: description || `Reversal of ${originalJournal.entryNumber}`,
            reference: `REV-${originalJournal.entryNumber}`,
            autoPost: true, // Auto-post reversals
        });

        return reversalJournal;
    }

    /**
     * INVOICE POSTING LOGIC
     * When invoice status changes to 'sent'
     * 
     * Debit:  Accounts Receivable
     * Credit: Sales/Revenue
     */
    async postInvoiceJournal(invoiceData: {
        organization: mongoose.Types.ObjectId;
        invoiceId: mongoose.Types.ObjectId;
        invoiceNumber: string;
        date: Date;
        customerId: mongoose.Types.ObjectId;
        total: number;
        tax: number;
        subtotal: number;
        items: Array<{ account?: string; amount: number }>;
    }): Promise<any> {
        const { organization, invoiceId, invoiceNumber, date, total, tax, subtotal: _subtotal, items } = invoiceData;

        // Get Accounts Receivable account
        const arAccount = await ChartOfAccount.findOne({
            organization,
            accountType: "Asset",
            accountSubtype: "Accounts Receivable",
        });

        if (!arAccount) {
            throw new Error("Accounts Receivable account not found. Please create it in Chart of Accounts.");
        }

        // Get Sales Tax Payable account if tax > 0
        let taxAccount;
        if (tax > 0) {
            taxAccount = await ChartOfAccount.findOne({
                organization,
                accountType: "Liability",
                accountSubtype: { $in: ["Sales Tax Payable", "Tax Payable"] },
            });
        }

        const lines: JournalLine[] = [];

        // Debit: Accounts Receivable (full amount including tax)
        lines.push({
            account: arAccount._id.toString(),
            accountName: arAccount.name,
            description: `Invoice ${invoiceNumber}`,
            debit: total,
            credit: 0,
        });

        // Credit: Sales/Revenue accounts (from line items)
        for (const item of items) {
            if (item.account && item.amount > 0) {
                const account = await ChartOfAccount.findById(item.account);
                if (account) {
                    lines.push({
                        account: item.account,
                        accountName: account.name,
                        description: `Invoice ${invoiceNumber}`,
                        debit: 0,
                        credit: item.amount,
                    });
                }
            }
        }

        // Credit: Sales Tax Payable (if applicable)
        if (tax > 0 && taxAccount) {
            lines.push({
                account: taxAccount._id.toString(),
                accountName: taxAccount.name,
                description: `Sales Tax - Invoice ${invoiceNumber}`,
                debit: 0,
                credit: tax,
            });
        }

        // Create and post the journal
        const journal = await this.createJournal({
            organization,
            date,
            lines,
            description: `Invoice ${invoiceNumber}`,
            reference: invoiceNumber,
            sourceDocument: { type: "invoice", id: invoiceId },
            autoPost: true,
        });

        return journal;
    }

    /**
     * CUSTOMER PAYMENT POSTING LOGIC
     * 
     * Debit:  Bank/Cash
     * Credit: Accounts Receivable
     */
    async postCustomerPaymentJournal(paymentData: {
        organization: mongoose.Types.ObjectId;
        paymentId: mongoose.Types.ObjectId;
        paymentNumber: string;
        date: Date;
        amount: number;
        bankAccountId: string;
        customerId: mongoose.Types.ObjectId;
    }): Promise<any> {
        const { organization, paymentId, paymentNumber, date, amount, bankAccountId } = paymentData;

        // Get bank account
        const bankAccount = await ChartOfAccount.findById(bankAccountId);
        if (!bankAccount) {
            throw new Error("Bank account not found");
        }

        // Get Accounts Receivable account
        const arAccount = await ChartOfAccount.findOne({
            organization,
            accountType: "Asset",
            accountSubtype: "Accounts Receivable",
        });

        if (!arAccount) {
            throw new Error("Accounts Receivable account not found");
        }

        const lines: JournalLine[] = [
            {
                account: bankAccount._id.toString(),
                accountName: bankAccount.name,
                description: `Payment ${paymentNumber}`,
                debit: amount,
                credit: 0,
            },
            {
                account: arAccount._id.toString(),
                accountName: arAccount.name,
                description: `Payment ${paymentNumber}`,
                debit: 0,
                credit: amount,
            },
        ];

        const journal = await this.createJournal({
            organization,
            date,
            lines,
            description: `Customer Payment ${paymentNumber}`,
            reference: paymentNumber,
            sourceDocument: { type: "payment_received", id: paymentId },
            autoPost: true,
        });

        return journal;
    }

    /**
     * SALES RECEIPT POSTING LOGIC (Cash Sale)
     * Invoice + Payment together
     * 
     * Debit:  Bank/Cash
     * Credit: Sales/Revenue
     * 
     * NO Accounts Receivable involved
     */
    async postSalesReceiptJournal(receiptData: {
        organization: mongoose.Types.ObjectId;
        receiptId: mongoose.Types.ObjectId;
        receiptNumber: string;
        date: Date;
        total: number;
        tax: number;
        subtotal: number;
        bankAccountId: string;
        items: Array<{ account?: string; amount: number }>;
    }): Promise<any> {
        const { organization, receiptId, receiptNumber, date, total, tax, bankAccountId, items } = receiptData;

        // Get bank account
        const bankAccount = await ChartOfAccount.findById(bankAccountId);
        if (!bankAccount) {
            throw new Error("Bank account not found");
        }

        const lines: JournalLine[] = [];

        // Debit: Bank/Cash
        lines.push({
            account: bankAccount._id.toString(),
            accountName: bankAccount.name,
            description: `Sales Receipt ${receiptNumber}`,
            debit: total,
            credit: 0,
        });

        // Credit: Sales/Revenue accounts
        for (const item of items) {
            if (item.account && item.amount > 0) {
                const account = await ChartOfAccount.findById(item.account);
                if (account) {
                    lines.push({
                        account: item.account,
                        accountName: account.name,
                        description: `Sales Receipt ${receiptNumber}`,
                        debit: 0,
                        credit: item.amount,
                    });
                }
            }
        }

        // Credit: Sales Tax Payable (if applicable)
        if (tax > 0) {
            const taxAccount = await ChartOfAccount.findOne({
                organization,
                accountType: "Liability",
                accountSubtype: { $in: ["Sales Tax Payable", "Tax Payable"] },
            });

            if (taxAccount) {
                lines.push({
                    account: taxAccount._id.toString(),
                    accountName: taxAccount.name,
                    description: `Sales Tax - Receipt ${receiptNumber}`,
                    debit: 0,
                    credit: tax,
                });
            }
        }

        const journal = await this.createJournal({
            organization,
            date,
            lines,
            description: `Sales Receipt ${receiptNumber}`,
            reference: receiptNumber,
            sourceDocument: { type: "sales_receipt", id: receiptId },
            autoPost: true,
        });

        return journal;
    }

    /**
     * BILL POSTING LOGIC
     * When bill is confirmed
     * 
     * Debit:  Expense/Asset account
     * Credit: Accounts Payable
     */
    async postBillJournal(billData: {
        organization: mongoose.Types.ObjectId;
        billId: mongoose.Types.ObjectId;
        billNumber: string;
        date: Date;
        total: number;
        tax: number;
        items: Array<{ account?: string; amount: number }>;
    }): Promise<any> {
        const { organization, billId, billNumber, date, total, tax, items } = billData;

        // Get Accounts Payable account
        const apAccount = await ChartOfAccount.findOne({
            organization,
            accountType: "Liability",
            accountSubtype: "Accounts Payable",
        });

        if (!apAccount) {
            throw new Error("Accounts Payable account not found. Please create it in Chart of Accounts.");
        }

        const lines: JournalLine[] = [];

        // Debit: Expense/Asset accounts
        for (const item of items) {
            if (item.account && item.amount > 0) {
                const account = await ChartOfAccount.findById(item.account);
                if (account) {
                    lines.push({
                        account: item.account,
                        accountName: account.name,
                        description: `Bill ${billNumber}`,
                        debit: item.amount,
                        credit: 0,
                    });
                }
            }
        }

        // Debit: Tax (if applicable)
        if (tax > 0) {
            const taxAccount = await ChartOfAccount.findOne({
                organization,
                accountType: "Asset",
                name: { $regex: /tax.*receivable|input.*tax/i },
            });

            if (taxAccount) {
                lines.push({
                    account: taxAccount._id.toString(),
                    accountName: taxAccount.name,
                    description: `Input Tax - Bill ${billNumber}`,
                    debit: tax,
                    credit: 0,
                });
            }
        }

        // Credit: Accounts Payable (total)
        lines.push({
            account: apAccount._id.toString(),
            accountName: apAccount.name,
            description: `Bill ${billNumber}`,
            debit: 0,
            credit: total,
        });

        const journal = await this.createJournal({
            organization,
            date,
            lines,
            description: `Bill ${billNumber}`,
            reference: billNumber,
            sourceDocument: { type: "bill", id: billId },
            autoPost: true,
        });

        return journal;
    }

    /**
     * VENDOR PAYMENT POSTING LOGIC
     * 
     * Debit:  Accounts Payable
     * Credit: Bank/Cash
     */
    async postVendorPaymentJournal(paymentData: {
        organization: mongoose.Types.ObjectId;
        paymentId: mongoose.Types.ObjectId;
        paymentNumber: string;
        date: Date;
        amount: number;
        bankAccountId: string;
    }): Promise<any> {
        const { organization, paymentId, paymentNumber, date, amount, bankAccountId } = paymentData;

        // Get bank account
        const bankAccount = await ChartOfAccount.findById(bankAccountId);
        if (!bankAccount) {
            throw new Error("Bank account not found");
        }

        // Get Accounts Payable account
        const apAccount = await ChartOfAccount.findOne({
            organization,
            accountType: "Liability",
            accountSubtype: "Accounts Payable",
        });

        if (!apAccount) {
            throw new Error("Accounts Payable account not found");
        }

        const lines: JournalLine[] = [
            {
                account: apAccount._id.toString(),
                accountName: apAccount.name,
                description: `Payment ${paymentNumber}`,
                debit: amount,
                credit: 0,
            },
            {
                account: bankAccount._id.toString(),
                accountName: bankAccount.name,
                description: `Payment ${paymentNumber}`,
                debit: 0,
                credit: amount,
            },
        ];

        const journal = await this.createJournal({
            organization,
            date,
            lines,
            description: `Vendor Payment ${paymentNumber}`,
            reference: paymentNumber,
            sourceDocument: { type: "payment_made", id: paymentId },
            autoPost: true,
        });

        return journal;
    }

    /**
     * EXPENSE POSTING LOGIC (Immediate Payment)
     * 
     * Debit:  Expense Account
     * Credit: Bank/Cash (Paid Through)
     * 
     * IMPORTANT: "Paid Through" must be Asset account (Cash/Bank)
     */
    async postExpenseJournal(expenseData: {
        organization: mongoose.Types.ObjectId;
        expenseId: mongoose.Types.ObjectId;
        referenceNumber?: string;
        date: Date;
        amount: number;
        taxAmount: number;
        expenseAccountId: string;
        paidThroughAccountId: string;
        description?: string;
    }): Promise<any> {
        const { organization, expenseId, referenceNumber, date, amount, taxAmount, expenseAccountId, paidThroughAccountId, description } = expenseData;

        // Get expense account
        const expenseAccount = await ChartOfAccount.findById(expenseAccountId);
        if (!expenseAccount) {
            throw new Error("Expense account not found");
        }

        // Get paid through account
        const paidThroughAccount = await ChartOfAccount.findById(paidThroughAccountId);
        if (!paidThroughAccount) {
            throw new Error("Paid Through account not found");
        }

        // VALIDATE: Paid Through must be Asset (Cash/Bank)
        if (paidThroughAccount.accountType !== "asset" &&
            paidThroughAccount.accountType !== "cash" &&
            paidThroughAccount.accountType !== "bank") {
            throw new Error(
                `Paid Through account must be an Asset account (Cash/Bank). Found: ${paidThroughAccount.accountType}`
            );
        }

        const lines: JournalLine[] = [];

        // Debit: Expense Account
        lines.push({
            account: expenseAccount._id.toString(),
            accountName: expenseAccount.name,
            description: description || "Expense",
            debit: amount,
            credit: 0,
        });

        // Debit: Tax (if applicable)
        if (taxAmount > 0) {
            const taxAccount = await ChartOfAccount.findOne({
                organization,
                accountType: "Asset",
                name: { $regex: /tax.*receivable|input.*tax/i },
            });

            if (taxAccount) {
                lines.push({
                    account: taxAccount._id.toString(),
                    accountName: taxAccount.name,
                    description: "Input Tax",
                    debit: taxAmount,
                    credit: 0,
                });
            }
        }

        // Credit: Paid Through (Bank/Cash)
        lines.push({
            account: paidThroughAccount._id.toString(),
            accountName: paidThroughAccount.name,
            description: description || "Expense Payment",
            debit: 0,
            credit: amount + taxAmount,
        });

        const journal = await this.createJournal({
            organization,
            date,
            lines,
            description: description || "Expense",
            reference: referenceNumber,
            sourceDocument: { type: "expense", id: expenseId },
            autoPost: true,
        });

        return journal;
    }

    /**
     * CALCULATE ACCOUNT BALANCE
     * Balances are DERIVED from posted journals, never stored
     */
    async getAccountBalance(accountId: string, organization: mongoose.Types.ObjectId, asOfDate?: Date): Promise<number> {
        const account = await ChartOfAccount.findOne({ _id: accountId, organization });
        if (!account) {
            throw new Error("Account not found");
        }

        // Build query for posted journals
        const query: any = {
            organization,
            status: "posted",
            "lines.account": accountId,
        };

        if (asOfDate) {
            query.date = { $lte: asOfDate };
        }

        const journals = await JournalEntry.find(query);

        let totalDebits = 0;
        let totalCredits = 0;

        for (const journal of journals) {
            for (const line of journal.lines) {
                if (line.account === accountId) {
                    totalDebits += line.debit || 0;
                    totalCredits += line.credit || 0;
                }
            }
        }

        // Calculate balance based on account type
        const accountRule = ACCOUNT_RULES[account.accountType as keyof typeof ACCOUNT_RULES];
        if (!accountRule) {
            throw new Error(`Unknown account type: ${account.accountType}`);
        }

        if (accountRule.debitIncreases) {
            // Asset, Expense: Debit increases, Credit decreases
            return totalDebits - totalCredits;
        } else {
            // Liability, Income, Equity: Credit increases, Debit decreases
            return totalCredits - totalDebits;
        }
    }

    /**
     * GET ACCOUNTS RECEIVABLE BALANCE
     */
    async getAccountsReceivableBalance(organization: mongoose.Types.ObjectId): Promise<number> {
        const arAccount = await ChartOfAccount.findOne({
            organization,
            accountType: "Asset",
            accountSubtype: "Accounts Receivable",
        });

        if (!arAccount) {
            return 0;
        }

        return this.getAccountBalance(arAccount._id.toString(), organization);
    }

    /**
     * GET ACCOUNTS PAYABLE BALANCE
     */
    async getAccountsPayableBalance(organization: mongoose.Types.ObjectId): Promise<number> {
        const apAccount = await ChartOfAccount.findOne({
            organization,
            accountType: "Liability",
            accountSubtype: "Accounts Payable",
        });

        if (!apAccount) {
            return 0;
        }

        return this.getAccountBalance(apAccount._id.toString(), organization);
    }

    /**
     * GENERATE ENTRY NUMBER
     */
    private async generateEntryNumber(organization: mongoose.Types.ObjectId): Promise<string> {
        const lastJournal = await JournalEntry.findOne({ organization })
            .sort({ entryNumber: -1 })
            .limit(1);

        if (!lastJournal) {
            return "JE-0001";
        }

        const lastNumber = parseInt(lastJournal.entryNumber.split("-")[1] || "0");
        const nextNumber = lastNumber + 1;
        return `JE-${nextNumber.toString().padStart(4, "0")}`;
    }
}

export default new AccountingService();
