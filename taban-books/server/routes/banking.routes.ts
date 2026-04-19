/**
 * Banking Routes
 * Based on Taban Books API spec
 */

import express, { Router } from "express";
import * as bankingController from "../controllers/banking.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router: Router = express.Router();
router.use(protect);

// Bank Accounts Routes
router.route("/bankaccounts/currencies")
  .get(bankingController.getBankAccountCurrencies);

router.route("/bankaccounts")
  .post(bankingController.createBankAccount)
  .get(bankingController.listBankAccounts);

router.route("/bankaccounts/:account_id")
  .get(bankingController.getBankAccount)
  .put(bankingController.updateBankAccount)
  .delete(bankingController.deleteBankAccount);

router.route("/bankaccounts/:account_id/inactive")
  .post(bankingController.markBankAccountInactive);

router.route("/bankaccounts/:account_id/active")
  .post(bankingController.markBankAccountActive);

router.route("/bankaccounts/:account_id/statement/lastimported")
  .get(bankingController.getLastImportedStatement);

router.route("/bankaccounts/:account_id/statement/:statement_id")
  .delete(bankingController.deleteLastImportedStatement);

// Reconciliations
router.route("/bankaccounts/:account_id/reconciliations")
  .get(bankingController.listBankReconciliations)
  .post(bankingController.createBankReconciliation);

router.route("/bankaccounts/:account_id/reconciliations/:reconciliation_id")
  .get(bankingController.getBankReconciliation)
  .delete(bankingController.deleteBankReconciliation);

router.route("/bankaccounts/:account_id/reconciliations/:reconciliation_id/undo")
  .post(bankingController.undoBankReconciliation);

// Bank Statements Routes
router.route("/bankstatements")
  .post(bankingController.importBankStatement);

// Bank Transactions Routes
router.route("/banktransactions")
  .post(bankingController.createBankTransaction)
  .get(bankingController.listBankTransactions);

router.route("/banktransactions/:bank_transaction_id")
  .get(bankingController.getBankTransaction)
  .put(bankingController.updateBankTransaction)
  .delete(bankingController.deleteBankTransaction);

router.route("/banktransactions/uncategorized/:transaction_id/match")
  .get(bankingController.getMatchingTransactions)
  .post(bankingController.matchBankTransaction);

router.route("/banktransactions/:transaction_id/unmatch")
  .post(bankingController.unmatchBankTransaction);

router.route("/banktransactions/uncategorized/:transaction_id/exclude")
  .post(bankingController.excludeBankTransaction);

router.route("/banktransactions/uncategorized/:transaction_id/restore")
  .post(bankingController.restoreBankTransaction);

router.route("/banktransactions/uncategorized/:transaction_id/categorize")
  .post(bankingController.categorizeBankTransaction);

router.route("/banktransactions/:transaction_id/uncategorize")
  .post(bankingController.uncategorizeBankTransaction);

// Bank Rules Routes
router.route("/bankaccounts/rules")
  .post(bankingController.createBankRule)
  .get(bankingController.listBankRules);

router.route("/bankaccounts/rules/:rule_id")
  .get(bankingController.getBankRule)
  .put(bankingController.updateBankRule)
  .delete(bankingController.deleteBankRule);

export default router;

