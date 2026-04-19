import mongoose from 'mongoose';
import ChartOfAccount from '../models/ChartOfAccount.js';
import BankAccount from '../models/BankAccount.js';
import { isDebitNormalAccountType } from './chartOfAccounts.js';

/**
 * Update account balances based on journal lines
 * @param lines - Array of journal entry lines
 * @param organizationId - ID of the organization
 * @param reverse - Whether to reverse the operation (e.g., when deleting/voiding a journal)
 */
export const updateAccountBalances = async (lines: any[], organizationId: string, reverse: boolean = false) => {
    if (!lines || !Array.isArray(lines)) return;

    for (const line of lines) {
        const accountId = line?.account || line?.accountId || line?.account_id;
        const direction = String(line?.debitOrCredit ?? line?.debit_or_credit ?? "").toLowerCase();
        const lineAmount = Number(line?.amount) || 0;
        const debit =
            Number(line?.debit) ||
            Number(line?.debits) ||
            (direction === "debit" ? lineAmount : 0);
        const credit =
            Number(line?.credit) ||
            Number(line?.credits) ||
            (direction === "credit" ? lineAmount : 0);
        if (!accountId) continue;

        // Resolve account by ID or Name/Code
        let query: any = { organization: organizationId };

        // Check if accountId is a valid ObjectId
        if (mongoose.Types.ObjectId.isValid(accountId)) {
            query._id = accountId;
        } else {
            // Fallback for names or codes
            query.$or = [
                { accountName: accountId },
                { accountCode: accountId }
            ];
        }

        const account = await ChartOfAccount.findOne(query);

        if (account) {
            const isDebitType = isDebitNormalAccountType(account.accountType);
            let netChange = isDebitType ? (debit - credit) : (credit - debit);

            if (reverse) netChange = -netChange;

            account.balance = (account.balance || 0) + netChange;
            await account.save();
            console.log(`[ACCOUNTING] Updated balance for account ${account.accountName}: ${account.balance} (Net Change: ${netChange})`);
        } else {
            const bankAccount = await BankAccount.findOne(query);

            if (bankAccount) {
                const isDebitType = bankAccount.accountType !== "credit_card";
                let netChange = isDebitType ? (debit - credit) : (credit - debit);

                if (reverse) netChange = -netChange;

                bankAccount.balance = (bankAccount.balance || 0) + netChange;
                bankAccount.bankBalance = (bankAccount.bankBalance || 0) + netChange;
                await bankAccount.save();
                console.log(`[ACCOUNTING] Updated bank balance for ${bankAccount.accountName}: books=${bankAccount.balance}, bank=${bankAccount.bankBalance} (Net Change: ${netChange})`);
            } else {
                console.warn(`[ACCOUNTING] Could not find account matching ${accountId} to update balance.`);
            }
        }
    }
};
