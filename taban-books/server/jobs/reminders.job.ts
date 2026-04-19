/**
 * Reminders Job
 * Scheduled job to send email reminders
 */

import Reminder from "../models/Reminder.js";
import ReminderLog from "../models/ReminderLog.js";
import Invoice from "../models/Invoice.js";
import Bill from "../models/Bill.js";
import User from "../models/User.js";
import Organization from "../models/Organization.js";
import SenderEmail from "../models/SenderEmail.js";
import { sendEmail } from "../services/email.service.js";

type OrgContext = {
  orgName: string;
  senderName?: string;
};

const isValidEmail = (email: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());

const startOfDay = (date: Date): Date => {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const addDays = (date: Date, days: number): Date => {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
};

const diffDays = (from: Date, to: Date): number => {
  const a = startOfDay(from).getTime();
  const b = startOfDay(to).getTime();
  return Math.floor((a - b) / (1000 * 60 * 60 * 24));
};

const normalizeEmails = (emails: Array<string | undefined | null>): string[] => {
  const unique = new Set<string>();
  for (const raw of emails) {
    const value = String(raw || "").trim();
    if (!value) continue;
    // Allow comma-separated in custom inputs.
    const parts = value.split(",").map((p) => p.trim()).filter(Boolean);
    for (const email of parts) {
      if (isValidEmail(email)) unique.add(email.toLowerCase());
    }
  }
  return Array.from(unique);
};

const hasHtmlTags = (content: string): boolean => /<([a-z][\s\S]*?)>/i.test(content || "");

const escapeHtml = (value: string): string =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const textToHtml = (text: string): string => {
  const normalized = String(text || "").replace(/\r\n/g, "\n");
  const escaped = escapeHtml(normalized);
  // very small formatting: **bold**
  const withBold = escaped.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  const withBreaks = withBold.replace(/\n/g, "<br/>");
  return `<div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #111827;">${withBreaks}</div>`;
};

const applyPlaceholders = (template: string, values: Record<string, string>): string => {
  if (!template) return "";
  return template.replace(/%([A-Za-z0-9_]+)%/g, (_match, key) => {
    const value = values[key];
    return value !== undefined ? value : `%${key}%`;
  });
};

const getDefaultEmailTemplate = (reminder: any): { subject: string; body: string } => {
  const entityType = String(reminder?.entityType || "");
  if (entityType.toLowerCase() === "bill") {
    return {
      subject: "Bill %BillNumber% is due on %DueDate%",
      body:
        "Hello,\n\nThis is a reminder that bill %BillNumber% is due on %DueDate%.\n\nVendor: %VendorName%\nBalance: %Balance%\n\nRegards,\n%CompanyName%",
    };
  }

  // Invoice defaults
  if (String(reminder?.type || "") === "payment_due") {
    return {
      subject: "Payment expected for %InvoiceNumber%",
      body:
        "Dear %CustomerName%,\n\nThis is a reminder that payment is expected for invoice %InvoiceNumber%.\nExpected Payment Date: %ExpectedPaymentDate%\nBalance: %Balance%\n\nIf you have already paid, please ignore this reminder.\n\nRegards,\n%CompanyName%",
    };
  }

  return {
    subject: "Payment of %Balance% is outstanding for %InvoiceNumber%",
    body:
      "Dear %CustomerName%,\n\nThis is a friendly reminder about the payment for the below invoice.\n\nInvoice#: %InvoiceNumber%\nInvoice Date: %InvoiceDate%\nDue Date: %DueDate%\nOverdue By: %OverdueDays% day(s)\nBalance: %Balance%\n\nIf you have already paid, please accept our apologies and kindly ignore this payment reminder.\n\nRegards,\n%CompanyName%",
  };
};

const resolveOrgContext = async (organizationId: string): Promise<OrgContext> => {
  const org = await Organization.findById(organizationId).select("name").lean();
  const sender = await SenderEmail.findOne({
    organization: organizationId,
    isPrimary: true,
  })
    .select("name")
    .lean();

  return {
    orgName: String(org?.name || "Taban Books"),
    senderName: sender?.name ? String(sender.name) : undefined,
  };
};

const buildInvoicePlaceholders = (params: {
  invoice: any;
  customer: any;
  org: OrgContext;
}): Record<string, string> => {
  const { invoice, customer, org } = params;
  const currency = String(invoice?.currency || "");
  const balance = Number(invoice?.balance ?? Math.max(0, Number(invoice?.total || 0) - Number(invoice?.paidAmount || 0)));
  const dueDate = invoice?.dueDate ? new Date(invoice.dueDate) : null;
  const invoiceDate = invoice?.date ? new Date(invoice.date) : null;
  const expectedPaymentDate = (invoice as any)?.expectedPaymentDate ? new Date((invoice as any).expectedPaymentDate) : null;

  return {
    CompanyName: org.orgName,
    UserName: org.senderName || "Taban Team",
    CustomerName: String(customer?.displayName || customer?.name || "Customer"),
    InvoiceNumber: String(invoice?.invoiceNumber || ""),
    InvoiceDate: invoiceDate ? invoiceDate.toLocaleDateString("en-GB") : "",
    DueDate: dueDate ? dueDate.toLocaleDateString("en-GB") : "",
    ExpectedPaymentDate: expectedPaymentDate ? expectedPaymentDate.toLocaleDateString("en-GB") : "",
    OverdueDays: dueDate ? String(Math.max(0, diffDays(new Date(), dueDate))) : "0",
    Balance: `${currency} ${balance.toFixed(2)}`.trim(),
    Total: `${currency} ${Number(invoice?.total || 0).toFixed(2)}`.trim(),
  };
};

const buildBillPlaceholders = (params: {
  bill: any;
  vendor: any;
  org: OrgContext;
}): Record<string, string> => {
  const { bill, vendor, org } = params;
  const currency = String(bill?.currency || "");
  const balance = Number(bill?.balance ?? Math.max(0, Number(bill?.total || 0) - Number(bill?.paidAmount || 0)));
  const dueDate = bill?.dueDate ? new Date(bill.dueDate) : null;
  const billDate = bill?.date ? new Date(bill.date) : null;
  const expectedPaymentDate = (bill as any)?.expectedPaymentDate ? new Date((bill as any).expectedPaymentDate) : null;

  return {
    CompanyName: org.orgName,
    UserName: org.senderName || "Taban Team",
    VendorName: String(vendor?.displayName || vendor?.name || bill?.vendorName || "Vendor"),
    BillNumber: String(bill?.billNumber || ""),
    BillDate: billDate ? billDate.toLocaleDateString("en-GB") : "",
    DueDate: dueDate ? dueDate.toLocaleDateString("en-GB") : "",
    ExpectedPaymentDate: expectedPaymentDate ? expectedPaymentDate.toLocaleDateString("en-GB") : "",
    OverdueDays: dueDate ? String(Math.max(0, diffDays(new Date(), dueDate))) : "0",
    Balance: `${currency} ${balance.toFixed(2)}`.trim(),
    Total: `${currency} ${Number(bill?.total || 0).toFixed(2)}`.trim(),
  };
};

const resolveReminderRecipients = async (params: {
  reminder: any;
  entityType: "Invoice" | "Bill";
  entity: any;
}): Promise<string[]> => {
  const { reminder, entityType, entity } = params;

  const recipients = reminder?.recipients || {};
  const customEmails = Array.isArray(recipients.customEmails) ? recipients.customEmails : [];
  const internalUserIds = Array.isArray(recipients.internalUsers) ? recipients.internalUsers : [];

  const emails: Array<string | undefined | null> = [];

  if (entityType === "Invoice" && recipients.customer) {
    const customer = entity?.customer;
    emails.push(customer?.email);
  }

  if (entityType === "Bill" && recipients.vendor) {
    const vendor = entity?.vendor;
    emails.push(vendor?.email);
  }

  if (internalUserIds.length > 0) {
    const users = await User.find({ _id: { $in: internalUserIds } })
      .select("email")
      .lean();
    for (const user of users) {
      emails.push((user as any)?.email);
    }
  }

  for (const custom of customEmails) emails.push(custom);

  return normalizeEmails(emails);
};

/**
 * Send reminders for invoices/bills based on settings in Reminder documents.
 */
export const sendReminders = async (): Promise<void> => {
  const jobStartedAt = new Date();
  const today = startOfDay(jobStartedAt);
  const tomorrow = addDays(today, 1);

  console.log(`[REMINDERS] Running reminders job for ${today.toISOString().slice(0, 10)}...`);

  const reminders = await Reminder.find({ isActive: true }).lean();
  if (reminders.length === 0) {
    console.log("[REMINDERS] No active reminders found.");
    return;
  }

  const orgCache = new Map<string, OrgContext>();

  for (const reminder of reminders) {
    const organizationId = String(reminder.organization);

    try {
      if (!orgCache.has(organizationId)) {
        orgCache.set(organizationId, await resolveOrgContext(organizationId));
      }
      const org = orgCache.get(organizationId)!;

      const basedOn =
        reminder?.conditions?.basedOn ||
        (reminder.type === "payment_due" ? "expectedPaymentDate" : "dueDate");
      const dateField = basedOn === "expectedPaymentDate" ? "expectedPaymentDate" : "dueDate";

      const daysBefore = Number.isFinite(reminder?.conditions?.daysBefore)
        ? Number(reminder.conditions.daysBefore)
        : undefined;
      const daysAfter = Number.isFinite(reminder?.conditions?.daysAfter)
        ? Number(reminder.conditions.daysAfter)
        : undefined;

      // We send "today". Convert daysBefore/After into a query for the base date.
      let baseDateStart = today;
      if (typeof daysBefore === "number") {
        baseDateStart = addDays(today, daysBefore);
      } else if (typeof daysAfter === "number") {
        baseDateStart = addDays(today, -daysAfter);
      }
      const baseDateEnd = addDays(baseDateStart, 1);

      const statusFilter = Array.isArray(reminder?.conditions?.status) && reminder.conditions.status.length > 0
        ? { $in: reminder.conditions.status }
        : undefined;

      const scheduledFor = today;

      if (String(reminder.entityType || "").toLowerCase() === "bill") {
        const billQuery: any = {
          organization: reminder.organization,
          [dateField]: { $gte: baseDateStart, $lt: baseDateEnd },
          balance: { $gt: 0 },
          status: statusFilter || { $nin: ["paid", "void", "cancelled"] },
        };

        const bills = await Bill.find(billQuery)
          .populate("vendor", "displayName name email")
          .lean();

        if (bills.length === 0) continue;

        for (const bill of bills) {
          const logId = {
            reminder: reminder._id,
            entityType: "Bill",
            entityId: (bill as any)._id,
            scheduledFor,
          };

          const existingLog = await ReminderLog.findOne(logId).select("success attempts").lean();
          if (existingLog?.success) continue;
          if (existingLog && Number(existingLog.attempts || 0) >= 3) continue;

          await ReminderLog.updateOne(
            logId,
            {
              $set: { organization: reminder.organization, lastAttemptAt: new Date() },
              $inc: { attempts: 1 },
              $setOnInsert: { to: [] },
            },
            { upsert: true }
          );

          const toEmails = await resolveReminderRecipients({
            reminder,
            entityType: "Bill",
            entity: bill,
          });
          if (toEmails.length === 0) {
            await ReminderLog.updateOne(logId, {
              $set: { success: false, error: "No recipients found" },
            });
            continue;
          }

          const defaults = getDefaultEmailTemplate(reminder);
          const subjectTemplate = reminder?.email?.subject || defaults.subject;
          const bodyTemplate = reminder?.email?.body || defaults.body;

          const placeholders = buildBillPlaceholders({
            bill,
            vendor: (bill as any).vendor,
            org,
          });

          const subject = applyPlaceholders(subjectTemplate, placeholders) || defaults.subject;
          const renderedBody = applyPlaceholders(bodyTemplate, placeholders) || defaults.body;
          const html = hasHtmlTags(renderedBody) ? renderedBody : textToHtml(renderedBody);

          const result = await sendEmail({
            to: toEmails.join(", "),
            cc: reminder?.email?.cc,
            bcc: reminder?.email?.bcc,
            subject,
            html,
            from: reminder?.email?.from,
            organizationId,
          });

          await ReminderLog.updateOne(logId, {
            $set: {
              to: toEmails,
              success: !!result?.success,
              error: result?.success ? undefined : result?.error || "Failed to send",
              sentAt: result?.success ? new Date() : undefined,
            },
          });
        }
      } else {
        // Default to invoices
        const invoiceQuery: any = {
          organization: reminder.organization,
          [dateField]: { $gte: baseDateStart, $lt: baseDateEnd },
          balance: { $gt: 0 },
          remindersStopped: { $ne: true },
          status: statusFilter || { $nin: ["draft", "paid", "void"] },
        };

        const invoices = await Invoice.find(invoiceQuery)
          .populate("customer", "displayName name email")
          .lean();

        if (invoices.length === 0) continue;

        for (const invoice of invoices) {
          const logId = {
            reminder: reminder._id,
            entityType: "Invoice",
            entityId: (invoice as any)._id,
            scheduledFor,
          };

          const existingLog = await ReminderLog.findOne(logId).select("success attempts").lean();
          if (existingLog?.success) continue;
          if (existingLog && Number(existingLog.attempts || 0) >= 3) continue;

          await ReminderLog.updateOne(
            logId,
            {
              $set: { organization: reminder.organization, lastAttemptAt: new Date() },
              $inc: { attempts: 1 },
              $setOnInsert: { to: [] },
            },
            { upsert: true }
          );

          const toEmails = await resolveReminderRecipients({
            reminder,
            entityType: "Invoice",
            entity: invoice,
          });
          if (toEmails.length === 0) {
            await ReminderLog.updateOne(logId, {
              $set: { success: false, error: "No recipients found" },
            });
            continue;
          }

          const defaults = getDefaultEmailTemplate(reminder);
          const subjectTemplate = reminder?.email?.subject || defaults.subject;
          const bodyTemplate = reminder?.email?.body || defaults.body;

          const placeholders = buildInvoicePlaceholders({
            invoice,
            customer: (invoice as any).customer,
            org,
          });

          const subject = applyPlaceholders(subjectTemplate, placeholders) || defaults.subject;
          const renderedBody = applyPlaceholders(bodyTemplate, placeholders) || defaults.body;
          const html = hasHtmlTags(renderedBody) ? renderedBody : textToHtml(renderedBody);

          const result = await sendEmail({
            to: toEmails.join(", "),
            cc: reminder?.email?.cc,
            bcc: reminder?.email?.bcc,
            subject,
            html,
            from: reminder?.email?.from,
            organizationId,
          });

          await ReminderLog.updateOne(logId, {
            $set: {
              to: toEmails,
              success: !!result?.success,
              error: result?.success ? undefined : result?.error || "Failed to send",
              sentAt: result?.success ? new Date() : undefined,
            },
          });
        }
      }

      // Update reminder run markers (best-effort)
      await Reminder.updateOne(
        { _id: reminder._id },
        { $set: { lastRun: new Date(), nextRun: tomorrow } }
      );
    } catch (error: any) {
      console.error(`[REMINDERS] Error processing reminder ${reminder?._id}:`, error?.message || error);
    }
  }

  console.log("[REMINDERS] Job finished.");
};

export default { sendReminders };

