/**
 * Recurring Bill Routes
 */

import express, { Router } from "express";
import * as recurringBillController from "../controllers/recurringBill.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router: Router = express.Router();

// All routes require authentication
router.use(protect);

router.route("/recurring-bills")
    .get(recurringBillController.listRecurringBills)
    .post(recurringBillController.createRecurringBill);

router.route("/recurring-bills/:id")
    .get(recurringBillController.getRecurringBill)
    .put(recurringBillController.updateRecurringBill)
    .delete(recurringBillController.deleteRecurringBill);

router.post("/recurring-bills/:id/status", recurringBillController.updateRecurringBillStatus);
router.post("/recurring-bills/:id/generate-bill", recurringBillController.generateBillFromRecurring);

export default router;
