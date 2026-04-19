/**
 * Recurring Invoices Job
 * Scheduled job to create recurring invoices
 */

import RecurringInvoice from "../models/RecurringInvoice.js";
import Invoice from "../models/Invoice.js";
import Organization from "../models/Organization.js";
import Customer from "../models/Customer.js";
import { sendEmail } from "../services/email.service.js";
import { generateInvoiceNumber } from "../utils/numberSeries.js";
import JournalEntry from "../models/JournalEntry.js";
import ChartOfAccount from "../models/ChartOfAccount.js";
import { updateAccountBalances } from "../utils/accounting.js";

type RecurringInvoiceOrgSettings = {
  enabled: boolean;
  invoiceMode: "draft" | "sent";
  sendEmailToCustomer: boolean;
};

const isModuleEnabled = (modules: any, key: string, defaultEnabled: boolean): boolean => {
  if (!modules) return defaultEnabled;
  if (modules instanceof Map) {
    const value = modules.get(key);
    return value === undefined ? defaultEnabled : Boolean(value);
  }
  if (typeof modules === "object") {
    const value = (modules as any)[key];
    return value === undefined ? defaultEnabled : Boolean(value);
  }
  return defaultEnabled;
};

const getRecurringInvoiceOrgSettings = async (
  organizationId: string,
  cache: Map<string, RecurringInvoiceOrgSettings>
): Promise<RecurringInvoiceOrgSettings> => {
  const cached = cache.get(organizationId);
  if (cached) return cached;

  const organization = await Organization.findById(organizationId)
    .select("settings.modules settings.recurringInvoiceSettings")
    .lean();

  const modules = (organization as any)?.settings?.modules;
  const enabled = isModuleEnabled(modules, "recurringInvoice", true);

  const invoiceModeRaw = (organization as any)?.settings?.recurringInvoiceSettings?.invoiceMode;
  const invoiceMode: "draft" | "sent" = invoiceModeRaw === "sent" ? "sent" : "draft";

  const sendEmailToCustomer = Boolean(
    (organization as any)?.settings?.recurringInvoiceSettings?.sendEmailToCustomer
  );

  const settings = { enabled, invoiceMode, sendEmailToCustomer };
  cache.set(organizationId, settings);
  return settings;
};

const startOfDay = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const addDays = (date: Date, days: number): Date => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

const parsePaymentTermDays = (paymentTerms?: string): number => {
  const term = String(paymentTerms || "").trim().toLowerCase();
  if (!term) return 30;
  if (term === "due_on_receipt" || term === "due on receipt") return 0;

  const match = term.match(/net\s*_?\s*(\d+)/);
  if (match) return Math.max(0, Number(match[1]) || 30);

  return 30;
};

/**
 * Process recurring invoices and create new ones
 */
export const processRecurringInvoices = async (): Promise<void> => {
  try {
    console.log("[RECURRING INVOICES] Processing recurring invoices...");

    const now = new Date();

    const dueRecurringInvoices = await RecurringInvoice.find({
      status: "active",
      nextInvoiceDate: { $lte: now },
      $or: [{ endDate: { $gte: now } }, { endDate: { $exists: false } }],
    })
      .populate("customer", "displayName name companyName email")
      .populate("items.item", "name sku");

    console.log(`[RECURRING INVOICES] Found ${dueRecurringInvoices.length} recurring invoices to process`);

    const orgSettingsCache = new Map<string, RecurringInvoiceOrgSettings>();

    for (const recurringInvoice of dueRecurringInvoices) {
      try {
        const organizationId = recurringInvoice.organization?.toString?.() || String(recurringInvoice.organization);
        const orgSettings = await getRecurringInvoiceOrgSettings(organizationId, orgSettingsCache);

        if (!orgSettings.enabled) {
          console.log(`[RECURRING INVOICES] Skipping ${recurringInvoice._id} (module disabled)`);
          continue;
        }

        const scheduledDate = recurringInvoice.nextInvoiceDate ? new Date(recurringInvoice.nextInvoiceDate) : now;
        const scheduledDayStart = startOfDay(scheduledDate);
        const scheduledDayEnd = addDays(scheduledDayStart, 1);

        // Idempotency: if an invoice for this profile already exists for this scheduled date, advance the schedule.
        const existingInvoice = await Invoice.findOne({
          organization: recurringInvoice.organization,
          recurringInvoiceId: recurringInvoice._id,
          date: { $gte: scheduledDayStart, $lt: scheduledDayEnd },
        }).select("_id invoiceNumber date status");

        if (existingInvoice) {
          const lastInvoiceDate = recurringInvoice.lastInvoiceDate ? new Date(recurringInvoice.lastInvoiceDate) : null;
          if (!lastInvoiceDate || lastInvoiceDate < scheduledDate) {
            recurringInvoice.lastInvoiceDate = scheduledDate;
            if (recurringInvoice.endDate && new Date(recurringInvoice.endDate) <= scheduledDayStart) {
              recurringInvoice.status = "expired";
            }
            await recurringInvoice.save();
          }
          console.log(
            `[RECURRING INVOICES] Invoice already exists for ${recurringInvoice._id} (${existingInvoice.invoiceNumber || existingInvoice._id}).`
          );
          continue;
        }

        // Generate invoice number using central series tracking
        const nextInvoiceNumber = await generateInvoiceNumber(organizationId, true);

        const invoiceStatus: "draft" | "sent" = orgSettings.invoiceMode === "sent" ? "sent" : "draft";

        const paymentTerms = (recurringInvoice as any).paymentTerms;
        const dueDays = parsePaymentTermDays(paymentTerms);
        const dueDate = addDays(scheduledDate, dueDays);

        const newInvoice = new Invoice({
          organization: recurringInvoice.organization,
          customer: recurringInvoice.customer,
          invoiceNumber: nextInvoiceNumber,
          orderNumber: (recurringInvoice as any).orderNumber || `RI-${recurringInvoice.profileName}`,
          items: recurringInvoice.items,
          subtotal: recurringInvoice.subtotal,
          tax: recurringInvoice.tax,
          discount: recurringInvoice.discount,
          shippingCharges: (recurringInvoice as any).shippingCharges || 0,
          shippingChargeTax: String((recurringInvoice as any).shippingChargeTax || ""),
          adjustment: (recurringInvoice as any).adjustment || 0,
          total: recurringInvoice.total,
          currency: recurringInvoice.currency,
          paymentTerms,
          accountsReceivable: (recurringInvoice as any).accountsReceivable,
          notes: recurringInvoice.notes,
          terms: recurringInvoice.terms,
          status: invoiceStatus,
          date: scheduledDate,
          dueDate: dueDate,
          isRecurringInvoice: true,
          recurringProfileId: recurringInvoice._id,
          recurringInvoiceId: recurringInvoice._id,
          paidAmount: 0,
          balance: recurringInvoice.total,
        });

        await newInvoice.save();

        // If invoice is created as 'sent', create accounting journal entry and update customer receivables
        if (invoiceStatus === "sent") {
          try {
            const orgId = recurringInvoice.organization;

            // Find Accounts Receivable account
            const arAccount = await ChartOfAccount.findOne({
              organization: orgId,
              accountType: "Asset",
              accountSubtype: "Accounts Receivable",
            });

            // Find Sales/Revenue account
            const salesAccount = await ChartOfAccount.findOne({
              organization: orgId,
              accountName: { $regex: /Sales Income|Sales|Income/i },
            });

            // Find tax account if invoice has tax
            let taxAccount;
            if (newInvoice.tax && newInvoice.tax > 0) {
              taxAccount = await ChartOfAccount.findOne({
                organization: orgId,
                accountType: "Liability",
                accountSubtype: { $in: ["Sales Tax Payable", "Tax Payable"] },
              });
            }

            const journalNumber = `JE-INV-${newInvoice.invoiceNumber}-${Date.now()}`;
            const lines: any[] = [];

            // Debit: Accounts Receivable (total)
            lines.push({
              account: arAccount ? arAccount._id.toString() : "Accounts Receivable",
              accountName: arAccount ? arAccount.accountName || arAccount.name : "Accounts Receivable",
              description: `Invoice ${newInvoice.invoiceNumber}`,
              debit: newInvoice.total || 0,
              credit: 0,
            });

            // Credit: Sales (total - tax)
            const salesAmount = (newInvoice.total || 0) - (newInvoice.tax || 0);
            lines.push({
              account: salesAccount ? salesAccount._id.toString() : "Sales Income",
              accountName: salesAccount ? salesAccount.accountName || salesAccount.name : "Sales Income",
              description: `Invoice ${newInvoice.invoiceNumber}`,
              debit: 0,
              credit: salesAmount,
            });

            // Credit: Tax payable (if applicable)
            if (newInvoice.tax && newInvoice.tax > 0 && taxAccount) {
              lines.push({
                account: taxAccount._id.toString(),
                accountName: taxAccount.name,
                description: `Sales Tax - Invoice ${newInvoice.invoiceNumber}`,
                debit: 0,
                credit: newInvoice.tax,
              });
            } else if (newInvoice.tax && newInvoice.tax > 0) {
              // If no tax account found, still add line with generic name
              lines.push({
                account: "Sales Tax Payable",
                accountName: "Sales Tax Payable",
                description: `Sales Tax - Invoice ${newInvoice.invoiceNumber}`,
                debit: 0,
                credit: newInvoice.tax,
              });
            }

            const journalEntry = await JournalEntry.create({
              organization: orgId,
              entryNumber: journalNumber,
              date: newInvoice.date || new Date(),
              description: `Invoice ${newInvoice.invoiceNumber}`,
              reference: newInvoice.invoiceNumber,
              status: "posted",
              postedAt: new Date(),
              sourceId: newInvoice._id,
              sourceType: "invoice",
              lines,
            });

            // Update account balances
            try {
              await updateAccountBalances(journalEntry.lines, orgId.toString());
            } catch (balanceErr) {
              console.error(
                `[RECURRING INVOICES] Failed to update account balances for invoice ${newInvoice.invoiceNumber}:`,
                balanceErr
              );
            }

            // Link journal to invoice
            newInvoice.journalEntryCreated = true;
            newInvoice.journalEntryId = journalEntry._id;
            await newInvoice.save();

            // Update customer receivables
            try {
              await Customer.findByIdAndUpdate(newInvoice.customer, {
                $inc: { receivables: newInvoice.total || 0 },
              });
            } catch (custError: any) {
              console.error(
                `[RECURRING INVOICES] Failed to update customer receivables for invoice ${newInvoice.invoiceNumber}:`,
                custError?.message || custError
              );
            }
          } catch (acctError) {
            console.error(
              `[RECURRING INVOICES] Error creating accounting journal for invoice ${newInvoice.invoiceNumber}:`,
              acctError
            );
          }
        }

        // Update recurring invoice dates (nextInvoiceDate is calculated by model middleware)
        recurringInvoice.lastInvoiceDate = scheduledDate;

        // Expire after the final invoice (if endDate is set and we've reached/passed it)
        if (recurringInvoice.endDate && new Date(recurringInvoice.endDate) <= scheduledDayStart) {
          recurringInvoice.status = "expired";
        }

        await recurringInvoice.save();

        // Send email notification (if enabled)
        const customerData = recurringInvoice.customer as any;
        if (orgSettings.sendEmailToCustomer && customerData?.email) {
          try {
            const invoiceDateLabel = scheduledDate.toLocaleDateString();
            const dueDateLabel = newInvoice.dueDate?.toLocaleDateString?.() || "";
            const nextDateLabel = recurringInvoice.nextInvoiceDate?.toLocaleDateString?.() || "";
            const totalLabel = `${recurringInvoice.currency || "USD"} ${Number(recurringInvoice.total || 0).toFixed(2)}`;

            const emailHtml = `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Recurring Invoice Generated</title>
                <style>
                  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                  .header { background: #156372; color: white; padding: 20px; text-align: center; }
                  .content { padding: 20px; background: #f9f9f9; }
                  .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h2>Invoice Generated</h2>
                  </div>
                  <div class="content">
                    <p>Dear ${customerData.displayName || customerData.name || "Customer"},</p>
                    <p>A new invoice has been generated from your recurring invoice profile:</p>
                    <p><strong>Invoice Number:</strong> ${newInvoice.invoiceNumber}</p>
                    <p><strong>Profile Name:</strong> ${recurringInvoice.profileName}</p>
                    <p><strong>Status:</strong> ${String(newInvoice.status || "").toUpperCase()}</p>
                    <p><strong>Invoice Date:</strong> ${invoiceDateLabel}</p>
                    <p><strong>Due Date:</strong> ${dueDateLabel}</p>
                    <p><strong>Total Amount:</strong> ${totalLabel}</p>
                    ${nextDateLabel ? `<p><strong>Next Invoice:</strong> ${nextDateLabel}</p>` : ""}
                    <p>Thank you for your business!</p>
                  </div>
                  <div class="footer">
                    <p>This email was sent automatically from Taban Books</p>
                  </div>
                </div>
              </body>
              </html>
            `;

            await sendEmail({
              to: customerData.email,
              subject: `Invoice Generated: ${newInvoice.invoiceNumber}`,
              html: emailHtml,
            });
          } catch (emailError) {
            console.error(
              `[RECURRING INVOICES] Error sending email for invoice ${newInvoice.invoiceNumber}:`,
              emailError
            );
          }
        }

        console.log(
          `[RECURRING INVOICES] Invoice ${newInvoice.invoiceNumber} generated from profile ${recurringInvoice._id}`
        );
      } catch (error) {
        console.error(`[RECURRING INVOICES] Error processing recurring invoice ${recurringInvoice._id}:`, error);
      }
    }

    console.log("[RECURRING INVOICES] Processing completed");
  } catch (error) {
    console.error("[RECURRING INVOICES] Job failed:", error);
  }
};

export default { processRecurringInvoices };
