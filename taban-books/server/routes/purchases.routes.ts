/**
 * Purchases Routes
 * Vendor and Bills routes
 */

import express, { Router } from "express";
import * as purchasesController from "../controllers/purchases.controller.js";
import * as expenseController from "../controllers/expense.controller.js";
import * as purchaseOrderController from "../controllers/purchaseOrder.controller.js";
import * as paymentMadeController from "../controllers/paymentMade.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { normalizeVendorRequest } from "../middleware/contact.middleware.js";
import { validate } from "../middleware/validation.middleware.js";
import { getConfig, logRequest, logResponse, logError } from "../utils/debug.js";
import {
  vendorCreateSchema,
  vendorUpdateSchema,
} from "../utils/contactSchemas.js";

const router: Router = express.Router();

const isPurchasesDebugEnabled = (): boolean => {
  const flag = String(process.env.DEBUG_PURCHASES || "").toLowerCase();
  if (flag === "true" || flag === "1" || flag === "yes") return true;
  return getConfig().enabled;
};

const getPurchasesFeature = (pathValue: string): string => {
  const cleanPath = (pathValue || "").replace(/^\/+/, "");
  return cleanPath.split("/")[0] || "unknown";
};

const summarizePurchasesResponse = (payload: any): any => {
  if (!payload || typeof payload !== "object") return payload;
  const summary: any = {};
  if (typeof payload.success !== "undefined") summary.success = payload.success;
  if (payload.message) summary.message = payload.message;
  if (Array.isArray(payload.data)) {
    summary.dataCount = payload.data.length;
  } else if (payload.data && typeof payload.data === "object") {
    summary.dataKeys = Object.keys(payload.data).slice(0, 10);
  }
  if (payload.pagination) summary.pagination = payload.pagination;
  return summary;
};

const purchasesDebugMiddleware = (req: any, res: any, next: any): void => {
  if (!isPurchasesDebugEnabled()) return next();

  const startedAt = Date.now();
  const feature = getPurchasesFeature(req.path);

  logRequest(req, { module: "purchases", feature });

  const originalJson = res.json.bind(res);
  res.json = (data: any) => {
    res.responseTime = `${Date.now() - startedAt}ms`;
    logResponse(req, res, summarizePurchasesResponse(data), {
      module: "purchases",
      feature,
    });
    return originalJson(data);
  };

  const originalSend = res.send.bind(res);
  res.send = (data: any) => {
    res.responseTime = `${Date.now() - startedAt}ms`;
    logResponse(req, res, data, { module: "purchases", feature });
    return originalSend(data);
  };

  res.on("error", (error: any) => {
    logError(error, {
      module: "purchases",
      feature,
      method: req.method,
      path: req.originalUrl || req.url,
    });
  });

  next();
};

// All routes require authentication
router.use(protect);
router.use(purchasesDebugMiddleware);

// Vendor routes
router.get("/vendors", purchasesController.getAllVendors);
router.get("/vendors/search", purchasesController.searchVendors);
router.post("/vendors/merge", purchasesController.mergeVendors);
router.get("/vendors/:id", purchasesController.getVendorById);
router.post(
  "/vendors",
  normalizeVendorRequest("create"),
  validate(vendorCreateSchema, { stripUnknown: false }),
  purchasesController.createVendor
);
router.put(
  "/vendors/:id",
  normalizeVendorRequest("update"),
  validate(vendorUpdateSchema, { stripUnknown: false }),
  purchasesController.updateVendor
);
router.patch(
  "/vendors/:id",
  normalizeVendorRequest("update"),
  validate(vendorUpdateSchema, { stripUnknown: false }),
  purchasesController.updateVendor
);
router.delete("/vendors/:id", purchasesController.deleteVendor);
router.post("/vendors/bulk-delete", purchasesController.deleteVendors);
router.post("/vendors/bulk-update", purchasesController.bulkUpdateVendors);
router.post("/vendors/:id/send-statement", purchasesController.sendVendorStatementEmail);

// Bills routes
router.route("/bills").get(purchasesController.getBills).post(purchasesController.createBill);
router
  .route("/bills/:id")
  .get(purchasesController.getBill)
  .put(purchasesController.updateBill)
  .delete(purchasesController.deleteBill);

// Receipt routes
router.get("/receipts", purchasesController.getAllReceipts);
router.post("/receipts", purchasesController.createReceipt);
router.put("/receipts/:id", purchasesController.updateReceipt);
router.delete("/receipts/:id", purchasesController.deleteReceipt);
router.post("/receipts/bulk-delete", purchasesController.deleteReceipts);

// Vendor Credits routes
router.route("/vendor-credits")
  .get(purchasesController.getVendorCredits)
  .post(purchasesController.createVendorCredit);

router.post("/vendor-credits/bulk-delete", purchasesController.bulkDeleteVendorCredits);
router.post("/vendor-credits/:id/apply-to-bills", purchasesController.applyVendorCreditToBills);

router.route("/vendor-credits/:id")
  .get(purchasesController.getVendorCredit)
  .put(purchasesController.updateVendorCredit)
  .delete(purchasesController.deleteVendorCredit);

// Expense routes (based on OpenAPI spec)
router.route("/expenses")
  .get(expenseController.listExpenses)
  .post(expenseController.createExpense);

router.route("/expenses/:expense_id")
  .get(expenseController.getExpense)
  .put(expenseController.updateExpense)
  .delete(expenseController.deleteExpense);

// Expense comments/history
router.get("/expenses/:expense_id/comments", expenseController.listExpenseComments);

// Purchase Order routes
router.get("/purchase-orders/next-number", purchaseOrderController.getNextPurchaseOrderNumber);
router.route("/purchase-orders")
  .get(purchaseOrderController.getAllPurchaseOrders)
  .post(purchaseOrderController.createPurchaseOrder);

router.route("/purchase-orders/:id")
  .get(purchaseOrderController.getPurchaseOrderById)
  .put(purchaseOrderController.updatePurchaseOrder)
  .delete(purchaseOrderController.deletePurchaseOrder);

router.post("/purchase-orders/:id/email", purchaseOrderController.sendPurchaseOrderEmail);

// Payments Made routes
router.route("/payments-made")
  .get(paymentMadeController.getAllPaymentsMade)
  .post(paymentMadeController.createPaymentMade);

router
  .route("/payments-made/:id")
  .get(paymentMadeController.getPaymentMadeById)
  .put(paymentMadeController.updatePaymentMade)
  .delete(paymentMadeController.deletePaymentMade);

router.post("/payments-made/bulk-delete", paymentMadeController.bulkDeletePaymentsMade);
router.post("/payments-made/:id/email", paymentMadeController.sendPaymentMadeEmail);


export default router;

