/**
 * Recurring Expense Routes
 */

import express, { Router } from "express";
import * as recurringExpenseController from "../controllers/recurringExpense.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router: Router = express.Router();

// All routes require authentication
router.use(protect);

router.route("/recurring-expenses")
    .get(recurringExpenseController.listRecurringExpenses)
    .post(recurringExpenseController.createRecurringExpense);

router.route("/recurring-expenses/:id")
    .get(recurringExpenseController.getRecurringExpense)
    .put(recurringExpenseController.updateRecurringExpense)
    .delete(recurringExpenseController.deleteRecurringExpense);

router.post("/recurring-expenses/:id/status", recurringExpenseController.updateRecurringExpenseStatus);
router.post("/recurring-expenses/:id/generate-expense", recurringExpenseController.generateExpenseFromRecurring);

export default router;
