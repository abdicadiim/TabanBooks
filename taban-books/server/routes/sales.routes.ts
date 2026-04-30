/**
 * Sales Routes
 * Customer routes
 */

import express, { Router } from "express";
import * as salesController from "../controllers/sales.controller.js";
import * as salesOrdersController from "../controllers/salesOrders.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import {
  normalizeContactPersonRequest,
  normalizeCustomerRequest,
} from "../middleware/contact.middleware.js";
import { validate } from "../middleware/validation.middleware.js";
import { getConfig, logRequest, logResponse, logError } from "../utils/debug.js";
import {
  contactPersonCreateSchema,
  customerCreateSchema,
  customerUpdateSchema,
} from "../utils/contactSchemas.js";

const router: Router = express.Router();

const isSalesDebugEnabled = (): boolean => {
  const flag = String(process.env.DEBUG_SALES || "").toLowerCase();
  if (flag === "true" || flag === "1" || flag === "yes") return true;
  return getConfig().enabled;
};

const getSalesFeature = (pathValue: string): string => {
  const cleanPath = (pathValue || "").replace(/^\/+/, "");
  const firstSegment = cleanPath.split("/")[0];
  return firstSegment || "unknown";
};

const summarizeResponseData = (payload: any): any => {
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

const salesDebugMiddleware = (req: any, res: any, next: any): void => {
  if (!isSalesDebugEnabled()) {
    return next();
  }

  const startedAt = Date.now();
  const feature = getSalesFeature(req.path);

  logRequest(req, {
    module: "sales",
    feature,
  });

  const originalJson = res.json.bind(res);
  res.json = (data: any) => {
    res.responseTime = `${Date.now() - startedAt}ms`;
    logResponse(req, res, summarizeResponseData(data), {
      module: "sales",
      feature,
    });
    return originalJson(data);
  };

  const originalSend = res.send.bind(res);
  res.send = (data: any) => {
    res.responseTime = `${Date.now() - startedAt}ms`;
    logResponse(req, res, data, {
      module: "sales",
      feature,
    });
    return originalSend(data);
  };

  res.on("error", (error: any) => {
    logError(error, {
      module: "sales",
      feature,
      method: req.method,
      path: req.originalUrl || req.url,
    });
  });

  next();
};

// All routes require authentication
router.use(protect);
router.use(salesDebugMiddleware);

// Customer routes
router.get("/customers", salesController.getAllCustomers);
router.get("/customers/search", salesController.searchCustomers);
router.post("/customers/merge", salesController.mergeCustomers);
router.get("/customers/:id", salesController.getCustomerById);
router.post(
  "/customers",
  normalizeCustomerRequest("create"),
  validate(customerCreateSchema, { stripUnknown: false }),
  salesController.createCustomer
);
router.put(
  "/customers/:id",
  normalizeCustomerRequest("update"),
  validate(customerUpdateSchema, { stripUnknown: false }),
  salesController.updateCustomer
);
router.patch(
  "/customers/:id",
  normalizeCustomerRequest("update"),
  validate(customerUpdateSchema, { stripUnknown: false }),
  salesController.updateCustomer
);
router.delete("/customers/:id", salesController.deleteCustomer);
router.post("/customers/:id/invite", salesController.sendInvitation);
router.post("/customers/:id/send-review-request", salesController.sendReviewRequest);
router.post("/customers/:id/send-statement", salesController.sendCustomerStatementEmail);
router.post("/customers/bulk-delete", salesController.deleteCustomers);
router.post("/customers/bulk-delete", salesController.deleteCustomers);
router.post("/customers/bulk-update", salesController.bulkUpdateCustomers);

// Contact Persons routes
router.get("/contact-persons", salesController.getAllContactPersons);
router.post(
  "/contact-persons",
  normalizeContactPersonRequest,
  validate(contactPersonCreateSchema, { stripUnknown: false }),
  salesController.createContactPerson
);

// Payment Received routes
router.get("/payments-received", salesController.getAllPaymentsReceived);
router.get("/payments-received/:id", salesController.getPaymentReceivedById);
router.post("/payments-received", salesController.createPaymentReceived);
router.post("/payments-received/:id/email", salesController.sendPaymentReceivedEmail);
router.put("/payments-received/:id", salesController.updatePaymentReceived);
router.patch("/payments-received/:id", salesController.updatePaymentReceived);
router.delete("/payments-received/:id", salesController.deletePaymentReceived);

// Salespersons routes
router.get("/salespersons", salesController.getAllSalespersons);
router.get("/salespersons/:id", salesController.getSalespersonById);
router.post("/salespersons", salesController.createSalesperson);
router.put("/salespersons/:id", salesController.updateSalesperson);
router.patch("/salespersons/:id", salesController.updateSalesperson);
router.delete("/salespersons/:id", salesController.deleteSalesperson);

// Invoice routes
router.get("/sales-invoices/next-number", salesController.getNextInvoiceNumber);
router.get("/sales-invoices", salesController.getAllInvoices);
router.get("/sales-invoices/:id", salesController.getInvoiceById);
router.post("/sales-invoices", salesController.createInvoice);
router.post("/sales-invoices/:id/void", salesController.voidInvoice);
router.put("/sales-invoices/:id", salesController.updateInvoice);
router.patch("/sales-invoices/:id", salesController.updateInvoice);
router.delete("/sales-invoices/:id", salesController.deleteInvoice);
router.post("/sales-invoices/:id/email", salesController.sendInvoiceEmail);
router.post("/sales-invoices/:id/reminders/send", salesController.sendInvoiceReminder);
router.patch("/sales-invoices/:id/reminders", salesController.setInvoiceRemindersStopped);

// Legacy/Alternative Invoices routes
router.get("/invoices", salesController.getAllInvoices);

// Sales Orders routes
router.get("/sales-orders/next-number", salesOrdersController.getNextSalesOrderNumber);
router.get("/sales-orders", salesOrdersController.getAllSalesOrders);
router.get("/sales-orders/:id", salesOrdersController.getSalesOrderById);
router.post("/sales-orders", salesOrdersController.createSalesOrder);
router.put("/sales-orders/:id", salesOrdersController.updateSalesOrder);
router.patch("/sales-orders/:id", salesOrdersController.updateSalesOrder);
router.delete("/sales-orders/:id", salesOrdersController.deleteSalesOrder);

// Credit Note routes
router.get("/credit-notes/next-number", salesController.getNextCreditNoteNumber);
router.get("/credit-notes", salesController.getAllCreditNotes);
router.get("/credit-notes/:id", salesController.getCreditNoteById);
router.post("/credit-notes", salesController.createCreditNote);
router.post("/credit-notes/:id/email", salesController.sendCreditNoteEmail);
router.put("/credit-notes/:id", salesController.updateCreditNote);
router.patch("/credit-notes/:id", salesController.updateCreditNote);
router.delete("/credit-notes/:id", salesController.deleteCreditNote);
router.post("/credit-notes/:id/apply-to-invoices", salesController.applyCreditNoteToInvoices);

// Estimates routes (Taban Books-compatible aliases backed by Quotes)
router.get("/estimates", salesController.listEstimates);
router.post("/estimates", salesController.createEstimate);
router.get("/estimates/:estimate_id", salesController.getEstimateById);

// Quote routes (specific routes first, then dynamic routes)
router.get("/quotes/next-number", salesController.getNextQuoteNumber);
router.post("/quotes/bulk-delete", salesController.bulkDeleteQuotes);
router.post("/quotes/bulk-update", salesController.bulkUpdateQuotes);
router.post("/quotes/bulk-mark-as-sent", salesController.bulkMarkQuotesAsSent);
router.get("/quotes", salesController.getAllQuotes);
router.post("/quotes", salesController.createQuote);
router.get("/quotes/:id", salesController.getQuoteById);
router.put("/quotes/:id", salesController.updateQuote);
router.patch("/quotes/:id", salesController.updateQuote);
router.delete("/quotes/:id", salesController.deleteQuote);
router.post("/quotes/:id/convert-to-invoice", salesController.convertQuoteToInvoice);
router.post("/quotes/:id/email", salesController.sendQuoteEmail);

// Recurring Invoice routes
router.get("/recurring-invoices", salesController.getAllRecurringInvoices);
router.get("/recurring-invoices/:id", salesController.getRecurringInvoiceById);
router.post("/recurring-invoices", salesController.createRecurringInvoice);
router.put("/recurring-invoices/:id", salesController.updateRecurringInvoice);
router.patch("/recurring-invoices/:id", salesController.updateRecurringInvoice);
router.delete("/recurring-invoices/:id", salesController.deleteRecurringInvoice);
router.post("/recurring-invoices/:id/generate-invoice", salesController.generateInvoiceFromRecurring);

// Retainer Invoice routes
router.get("/retainer-invoices", salesController.getAllRetainerInvoices);
router.get("/retainer-invoices/:id", salesController.getRetainerInvoiceById);
router.post("/retainer-invoices", salesController.createRetainerInvoice);
router.post("/retainer-invoices/:id/email", salesController.sendRetainerInvoiceEmail);
router.post("/retainer-invoices/:id/apply-to-invoices", salesController.applyRetainerInvoiceToInvoices);
router.put("/retainer-invoices/:id", salesController.updateRetainerInvoice);
router.patch("/retainer-invoices/:id", salesController.updateRetainerInvoice);
router.delete("/retainer-invoices/:id", salesController.deleteRetainerInvoice);

// Debit Note routes
router.get("/debit-notes", salesController.getAllDebitNotes);
router.get("/debit-notes/invoice/:invoiceId", salesController.getAllDebitNotes);
router.get("/debit-notes/:id", salesController.getDebitNoteById);
router.post("/debit-notes", salesController.createDebitNote);
router.put("/debit-notes/:id", salesController.updateDebitNote);
router.patch("/debit-notes/:id", salesController.updateDebitNote);
router.delete("/debit-notes/:id", salesController.deleteDebitNote);

// Sales Receipt routes
router.get("/sales-receipts/next-number", salesController.getNextSalesReceiptNumber);
router.get("/sales-receipts", salesController.getAllSalesReceipts);
router.get("/sales-receipts/:id", salesController.getSalesReceiptById);
router.post("/sales-receipts", salesController.createSalesReceipt);
router.put("/sales-receipts/:id", salesController.updateSalesReceipt);
router.patch("/sales-receipts/:id", salesController.updateSalesReceipt);
router.post("/sales-receipts/:id/email", salesController.sendSalesReceiptEmail);
router.delete("/sales-receipts/:id", salesController.deleteSalesReceipt);

// Refund routes
router.post("/refunds", salesController.createRefund);
router.get("/refunds", salesController.getAllRefunds);
router.get("/refunds/:id", salesController.getRefundById);
router.get("/payments-received/:paymentId/refunds", salesController.getRefundsByPaymentId);
router.get("/credit-notes/:creditNoteId/refunds", salesController.getRefundsByCreditNoteId);

export default router;

