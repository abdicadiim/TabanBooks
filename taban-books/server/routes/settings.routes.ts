/**
 * Settings Routes
 */

import express, { Router } from "express";
import * as settingsController from "../controllers/settings.controller.js";
import * as generalSettingsController from "../controllers/generalSettings.controller.js";
import * as customersVendorsSettingsController from "../controllers/customersVendorsSettings.controller.js";
import * as itemsSettingsController from "../controllers/itemsSettings.controller.js";
import * as quotesSettingsController from "../controllers/quotesSettings.controller.js";
import * as recurringInvoiceSettingsController from "../controllers/recurringInvoiceSettings.controller.js";
import * as accountantSettingsController from "../controllers/accountantSettings.controller.js";
import * as currencyController from "../controllers/currency.controller.js";
import * as unitController from "../controllers/unit.controller.js";
import * as taxController from "../controllers/tax.controller.js";
import * as transactionNumberSeriesController from "../controllers/transactionNumberSeries.controller.js";
import * as reportingTagController from "../controllers/reportingTag.controller.js";
import * as tagAssignmentController from "../controllers/tagAssignment.controller.js";
import * as workflowController from "../controllers/workflow.controller.js";
import * as reminderController from "../controllers/reminder.controller.js";
import * as portalController from "../controllers/portal.controller.js";
import * as openingBalanceController from "../controllers/openingBalance.controller.js";
import * as webTabController from "../controllers/webTab.controller.js";
import * as paymentModeController from "../controllers/paymentMode.controller.js";
import * as approvalRuleController from "../controllers/approvalRule.controller.js";
import * as senderEmailController from "../controllers/senderEmail.controller.js";
import * as emailTemplateController from "../controllers/emailTemplate.controller.js";
import * as emailNotificationSettingsController from "../controllers/emailNotificationSettings.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router: Router = express.Router();
router.use(protect);

// General settings
router.route("/settings").get(settingsController.getSettings);

// General Settings routes
router
  .route("/settings/general")
  .get(generalSettingsController.getGeneralSettings)
  .put(generalSettingsController.updateGeneralSettings);

// Customers & Vendors Settings routes
router
  .route("/settings/customers-vendors")
  .get(customersVendorsSettingsController.getCustomersVendorsSettings)
  .put(customersVendorsSettingsController.updateCustomersVendorsSettings);

// Items Settings routes
router
  .route("/settings/items")
  .get(itemsSettingsController.getItemsSettings)
  .put(itemsSettingsController.updateItemsSettings);

// Quotes Settings routes
router
  .route("/settings/quotes")
  .get(quotesSettingsController.getQuotesSettings)
  .put(quotesSettingsController.updateQuotesSettings);

// Recurring Invoice Settings routes
router
  .route("/settings/recurring-invoices")
  .get(recurringInvoiceSettingsController.getRecurringInvoiceSettings)
  .put(recurringInvoiceSettingsController.updateRecurringInvoiceSettings);

// Accountant Settings routes
router
  .route("/settings/accountant")
  .get(accountantSettingsController.getAccountantSettings)
  .put(accountantSettingsController.updateAccountantSettings);

// Organization Profile routes
router
  .route("/settings/organization/profile")
  .get(settingsController.getOrganizationProfile)
  .put(settingsController.updateOrganizationProfile);

// Owner email route
router
  .route("/settings/organization/owner-email")
  .get(settingsController.getOwnerEmail);

// Organization Branding routes
router
  .route("/settings/organization/branding")
  .get(settingsController.getOrganizationBranding)
  .put(settingsController.updateOrganizationBranding);

// Organization Locations routes
router
  .route("/settings/organization/locations/enabled")
  .get(settingsController.getLocationsEnabledStatus);

router
  .route("/settings/organization/locations/enable")
  .post(settingsController.enableLocations);

router
  .route("/settings/organization/locations")
  .get(settingsController.getLocations)
  .post(settingsController.createLocation);

router
  .route("/settings/organization/locations/:id")
  .get(settingsController.getLocation)
  .put(settingsController.updateLocation)
  .delete(settingsController.deleteLocation);

// Organization Users routes
router
  .route("/settings/users")
  .get(settingsController.getUsers)
  .post(settingsController.createUser);

router
  .route("/settings/users/:id")
  .get(settingsController.getUser)
  .put(settingsController.updateUser)
  .delete(settingsController.deleteUser);

router
  .route("/settings/users/:id/send-invitation")
  .post(settingsController.sendUserInvitation);

// Organization Roles routes
router
  .route("/settings/roles")
  .get(settingsController.getRoles)
  .post(settingsController.createRole);

router
  .route("/settings/roles/:id")
  .get(settingsController.getRole)
  .put(settingsController.updateRole)
  .delete(settingsController.deleteRole);

// Currency routes
router
  .route("/settings/currencies")
  .get(currencyController.getCurrencies)
  .post(currencyController.createCurrency);

router
  .route("/settings/currencies/base")
  .get(currencyController.getBaseCurrency);

router
  .route("/settings/currencies/exchange-rate-feeds")
  .get(currencyController.getExchangeRateFeedsStatus)
  .put(currencyController.toggleExchangeRateFeeds);

router
  .route("/settings/currencies/:id")
  .get(currencyController.getCurrency)
  .put(currencyController.updateCurrency)
  .delete(currencyController.deleteCurrency);

router
  .route("/settings/currencies/:id/exchange-rates")
  .post(currencyController.addExchangeRate);

router
  .route("/settings/currencies/:id/exchange-rates/:rateId")
  .delete(currencyController.deleteExchangeRate);

// Unit routes
router
  .route("/settings/units")
  .get(unitController.getUnits)
  .post(unitController.createUnit);

router
  .route("/settings/units/:id")
  .get(unitController.getUnit)
  .put(unitController.updateUnit)
  .delete(unitController.deleteUnit);

// Tax routes
router
  .route("/settings/taxes")
  .get(taxController.getTaxes)
  .post(taxController.createTax);

router
  .route("/settings/taxes/bulk")
  .post(taxController.createTaxesBulk);

router
  .route("/settings/taxes/disable-sales-tax")
  .post(taxController.disableSalesTax);

router
  .route("/settings/taxes/:id")
  .get(taxController.getTax)
  .put(taxController.updateTax)
  .delete(taxController.deleteTax);

router
  .route("/settings/taxes/:id/associated-records")
  .get(taxController.getTaxAssociatedRecords);

// Transaction Number Series routes
router
  .route("/settings/transaction-number-series")
  .get(transactionNumberSeriesController.getTransactionNumberSeries)
  .post(transactionNumberSeriesController.createTransactionNumberSeries);

router
  .route("/settings/transaction-number-series/batch")
  .post(transactionNumberSeriesController.createMultipleTransactionNumberSeries);

router
  .route("/settings/transaction-number-series/:id")
  .get(transactionNumberSeriesController.getTransactionNumberSeriesById)
  .put(transactionNumberSeriesController.updateTransactionNumberSeries)
  .delete(transactionNumberSeriesController.deleteTransactionNumberSeries);

router
  .route("/settings/transaction-number-series/:id/next")
  .get(transactionNumberSeriesController.getNextTransactionNumber);

// Reporting Tags routes
router
  .route("/settings/reporting-tags")
  .get(reportingTagController.getReportingTags)
  .post(reportingTagController.createReportingTag);

router
  .route("/settings/reporting-tags/bulk")
  .post(reportingTagController.bulkCreateReportingTags);

router
  .route("/settings/reporting-tags/:id")
  .get(reportingTagController.getReportingTagById)
  .put(reportingTagController.updateReportingTag)
  .delete(reportingTagController.deleteReportingTag);

router
  .route("/settings/reporting-tags/by-entity/:entityType")
  .get(reportingTagController.getTagsByEntityType);

// Tag Assignment routes
router
  .route("/tags/entity/:entityType/:entityId")
  .get(tagAssignmentController.getEntityTags);

router
  .route("/tags/assign")
  .post(tagAssignmentController.assignTags);

router
  .route("/tags/bulk-assign")
  .post(tagAssignmentController.bulkAssignTags);

router
  .route("/tags/remove/:entityType/:entityId/:tagId")
  .delete(tagAssignmentController.removeTag);

router
  .route("/tags/entities/:tagId/:entityType")
  .get(tagAssignmentController.getEntitiesByTag);

router
  .route("/tags/stats")
  .get(tagAssignmentController.getTagStats);

// Test route to verify reporting tags
router
  .route("/settings/reporting-tags/test")
  .get(async (_req, res) => {
    try {
      const ReportingTag = (await import("../models/ReportingTag.js")).default;
      const TagAssignment = (await import("../models/TagAssignment.js")).default;

      const tags = await ReportingTag.find({});
      const assignments = await TagAssignment.find({});

      res.json({
        success: true,
        message: "Reporting tags database connection test",
        data: {
          tagsCount: tags.length,
          assignmentsCount: assignments.length,
          tags: tags,
          assignments: assignments
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });

// Workflow routes
router
  .route("/settings/workflow-rules")
  .get(workflowController.getWorkflowRules)
  .post(workflowController.createWorkflowRule);

router
  .route("/settings/workflow-rules/stats")
  .get(workflowController.getWorkflowStats);

router
  .route("/settings/workflow-rules/reorder")
  .put(workflowController.reorderWorkflowRules);

router
  .route("/settings/workflow-rules/notification-preferences")
  .get(workflowController.getWorkflowNotificationPreferences)
  .put(workflowController.updateWorkflowNotificationPreferences);

router
  .route("/settings/workflow-rules/:id/clone")
  .post(workflowController.cloneWorkflowRule);

router
  .route("/settings/workflow-rules/:id")
  .get(workflowController.getWorkflowRule)
  .put(workflowController.updateWorkflowRule)
  .delete(workflowController.deleteWorkflowRule);

router
  .route("/settings/workflow-actions")
  .get(workflowController.getWorkflowActions)
  .post(workflowController.createWorkflowAction);

router
  .route("/settings/workflow-actions/:id")
  .put(workflowController.updateWorkflowAction)
  .delete(workflowController.deleteWorkflowAction);

router
  .route("/settings/workflow-logs")
  .get(workflowController.getWorkflowLogs);

router
  .route("/settings/workflow-schedules")
  .get(workflowController.getWorkflowSchedules)
  .post(workflowController.createWorkflowSchedule);

router
  .route("/settings/workflow-schedules/:id")
  .put(workflowController.updateWorkflowSchedule)
  .delete(workflowController.deleteWorkflowSchedule);

router
  .route("/settings/workflow-schedules/:id/toggle")
  .patch(workflowController.toggleWorkflowSchedule);

// Reminder routes
router
  .route("/settings/reminders")
  .get(reminderController.getReminders)
  .post(reminderController.createReminder);

router
  .route("/settings/reminders/:id")
  .get(reminderController.getReminder)
  .put(reminderController.updateReminder)
  .delete(reminderController.deleteReminder);

// Portal routes
router
  .route("/settings/customer-portal")
  .get(portalController.getCustomerPortal)
  .put(portalController.updateCustomerPortal);

router
  .route("/settings/vendor-portal")
  .get(portalController.getVendorPortal)
  .put(portalController.updateVendorPortal);

// Opening Balances
router
  .route("/settings/opening-balances")
  .get(openingBalanceController.getOpeningBalances)
  .post(openingBalanceController.saveOpeningBalances);

// Web Tabs routes
router
  .route("/settings/web-tabs")
  .get(webTabController.getWebTabs)
  .post(webTabController.createWebTab);

router
  .route("/settings/web-tabs/:id")
  .put(webTabController.updateWebTab)
  .delete(webTabController.deleteWebTab);

// Payment Mode routes
router
  .route("/settings/payment-modes")
  .get(paymentModeController.getPaymentModes)
  .post(paymentModeController.createPaymentMode);

router
  .route("/settings/payment-modes/seed")
  .post(paymentModeController.seedDefaultPaymentModes);

router
  .route("/settings/payment-modes/:id")
  .put(paymentModeController.updatePaymentMode)
  .delete(paymentModeController.deletePaymentMode);

// Approval Rule routes
router
  .route("/settings/approval-rules")
  .get(approvalRuleController.getApprovalRules)
  .post(approvalRuleController.createApprovalRule);

router
  .route("/settings/approval-rules/:id")
  .get(approvalRuleController.getApprovalRuleById)
  .put(approvalRuleController.updateApprovalRule)
  .delete(approvalRuleController.deleteApprovalRule);

// Sender Email routes
router
  .route("/settings/sender-emails")
  .get(senderEmailController.getSenderEmails)
  .post(senderEmailController.createSenderEmail);

router
  .route("/settings/sender-emails/primary")
  .get(senderEmailController.getPrimarySender);

router
  .route("/settings/sender-emails/:id")
  .put(senderEmailController.updateSenderEmail)
  .delete(senderEmailController.deleteSenderEmail);

// Email Template routes
router
  .route("/settings/email-templates")
  .get(emailTemplateController.getEmailTemplates);

router
  .route("/settings/email-templates/:key")
  .get(emailTemplateController.getEmailTemplateByKey)
  .put(emailTemplateController.upsertEmailTemplate);

// Email Notification Preferences routes
router
  .route("/settings/email-notification-preferences")
  .get(emailNotificationSettingsController.getEmailNotificationPreferences)
  .put(emailNotificationSettingsController.updateEmailNotificationPreferences);

// Email Relay routes
router
  .route("/settings/email-relay")
  .get(emailNotificationSettingsController.getEmailRelayServers)
  .post(emailNotificationSettingsController.createEmailRelayServer);

router
  .route("/settings/email-relay/:id")
  .put(emailNotificationSettingsController.updateEmailRelayServer)
  .delete(emailNotificationSettingsController.deleteEmailRelayServer);

router
  .route("/settings/email-relay/:id/toggle")
  .patch(emailNotificationSettingsController.toggleEmailRelayServer);

export default router;
