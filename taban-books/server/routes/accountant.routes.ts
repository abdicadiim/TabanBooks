/**
 * Accountant Routes
 */

import express, { Router } from "express";
import * as accountantController from "../controllers/accountant.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router: Router = express.Router();
router.use(protect);

// Chart of Accounts
router.route("/accounts")
    .get(accountantController.getAccounts)
    .post(accountantController.createAccount);

// Chart of Accounts (alias for frontend compatibility)
router.route("/accounting/chart-of-accounts")
    .get(accountantController.getAccounts)
    .post(accountantController.createAccount);

router.route("/accounts/bulk-delete")
    .post(accountantController.bulkDeleteAccounts);

router.route("/accounts/bulk-status")
    .patch(accountantController.bulkUpdateAccountStatus);

router.route("/accounts/:id")
    .put(accountantController.updateAccount)
    .patch(accountantController.updateAccount)
    .delete(accountantController.deleteAccount);

// Journal Entries
router.route("/journal-entries")
    .get(accountantController.getJournalEntries)
    .post(accountantController.createJournalEntry);

router.route("/journal-entries/:id")
    .get(accountantController.getJournalEntryById)
    .patch(accountantController.updateJournalEntry)
    .delete(accountantController.deleteJournalEntry);

// Budgets
router.route("/budgets")
    .get(accountantController.getBudgets)
    .post(accountantController.createBudget);

router.route("/budgets/:id")
    .get(accountantController.getBudgetById)
    .patch(accountantController.updateBudget)
    .delete(accountantController.deleteBudget);

// Bulk Update
router.route("/bulk-updates/preview")
    .post(accountantController.previewBulkUpdateTransactions);

router.route("/bulk-updates/execute")
    .post(accountantController.executeBulkUpdateTransactions);

router.route("/bulk-updates/history")
    .get(accountantController.getBulkUpdateHistory);

router.route("/bulk-updates/history/:id")
    .get(accountantController.getBulkUpdateHistoryById);

// Currency Adjustments
router.route("/currency-adjustments")
    .get(accountantController.getCurrencyAdjustments)
    .post(accountantController.createCurrencyAdjustment);

router.route("/currency-adjustments/preview")
    .post(accountantController.previewCurrencyAdjustment);

router.route("/currency-adjustments/:id")
    .get(accountantController.getCurrencyAdjustmentById)
    .patch(accountantController.updateCurrencyAdjustment)
    .delete(accountantController.deleteCurrencyAdjustment);

// Journal Templates
router.route("/journal-templates")
    .get(accountantController.getJournalTemplates)
    .post(accountantController.createJournalTemplate);

router.route("/journal-templates/:id")
    .get(accountantController.getJournalTemplateById)
    .patch(accountantController.updateJournalTemplate)
    .delete(accountantController.deleteJournalTemplate);

// Transaction Locking
router.route("/transaction-locks")
    .get(accountantController.getTransactionLocks)
    .post(accountantController.createTransactionLock);

router.route("/transaction-locks/:id/unlock")
    .patch(accountantController.unlockTransaction);

router.route("/transaction-locks/bulk-unlock")
    .patch(accountantController.bulkUnlockTransactions);

export default router;


