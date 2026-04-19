import { Request, Response } from "express";
import Organization from "../models/Organization.js";

type EmailTemplateRecord = {
  key: string;
  name: string;
  from?: string;
  cc?: string;
  bcc?: string;
  subject?: string;
  body?: string;
  setAsDefault?: boolean;
  updatedAt?: string;
};

const DEFAULT_TEMPLATES: EmailTemplateRecord[] = [
  {
    key: "invoice_notification",
    name: "Default",
    subject: "Invoice - %InvoiceNumber% from %CompanyName%",
    body: "Dear %CustomerName%,\n\nPlease find your invoice attached.\n\nRegards,\n%SenderName%",
    setAsDefault: true,
  },
  {
    key: "quote_notification",
    name: "Default",
    subject: "Quote from %CompanyName% (Quote #: %QuoteNumber%)",
    body: "Dear %CustomerName%,\n\nPlease find your quote attached.\n\nRegards,\n%SenderName%",
    setAsDefault: true,
  },
  {
    key: "customer_statement",
    name: "Default",
    subject: "Account Statement from %StartDate% to %EndDate%",
    body: "Dear %CustomerName%,\n\nPlease find your account statement attached.\n\nRegards,\n%SenderName%",
    setAsDefault: true,
  },
  {
    key: "vendor_statement",
    name: "Default",
    subject: "Account Statement from %StartDate% to %EndDate%",
    body: "Dear %VendorName%,\n\nPlease find your account statement attached.\n\nRegards,\n%SenderName%",
    setAsDefault: true,
  },
  {
    key: "purchase_order_notification",
    name: "Default",
    subject: "Purchase Order (PO #: %PurchaseOrderNumber%) from %CompanyName%",
    body: "Dear %VendorName%,\n\nPlease find your purchase order attached.\n\nRegards,\n%SenderName%",
    setAsDefault: true,
  },
  {
    key: "payment_made_notification",
    name: "Default",
    subject: "Payment has been made for your invoice(s)",
    body: "Dear %VendorName%,\n\nPayment has been made for your invoice(s).\n\nRegards,\n%SenderName%",
    setAsDefault: true,
  },
  {
    key: "bill_notification",
    name: "Default",
    subject: "Bill from %CompanyName%",
    body: "Dear %VendorName%,\n\nPlease find your bill attached.\n\nRegards,\n%SenderName%",
    setAsDefault: true,
  },
  {
    key: "invoice_manual_overdue_reminder",
    name: "Default",
    subject: "Payment of %Balance% is outstanding for %InvoiceNumber%",
    body:
      "Dear %CustomerName%,\n\nYou might have missed the payment date and the invoice is now overdue by %OverdueDays% days.\n\nInvoice#: %InvoiceNumber%\nInvoice Date: %InvoiceDate%\nDue Date: %DueDate%\nBalance: %Balance%\n\nIf you have already paid, please accept our apologies and kindly ignore this payment reminder.\n\nRegards,\n%UserName%\n%CompanyName%",
    setAsDefault: true,
  },
  {
    key: "invoice_manual_sent_reminder",
    name: "Default",
    subject: "Your invoice %InvoiceNumber% is due on %DueDate%",
    body:
      "Dear %CustomerName%,\n\nThis is a friendly reminder that your invoice will be due on %DueDate%.\n\nInvoice#: %InvoiceNumber%\nInvoice Date: %InvoiceDate%\nDue Date: %DueDate%\nBalance: %Balance%\n\nIf you have already paid, please ignore this reminder.\n\nRegards,\n%UserName%\n%CompanyName%",
    setAsDefault: true,
  },
];

const normalizeTemplates = (rawTemplates: any): Record<string, EmailTemplateRecord> => {
  if (!rawTemplates || typeof rawTemplates !== "object") {
    return {};
  }
  return Object.entries(rawTemplates).reduce((acc, [key, value]) => {
    acc[key] = {
      key,
      ...(value as object),
    } as EmailTemplateRecord;
    return acc;
  }, {} as Record<string, EmailTemplateRecord>);
};

const ensureDefaults = (templates: Record<string, EmailTemplateRecord>) => {
  const merged = { ...templates };
  for (const template of DEFAULT_TEMPLATES) {
    if (!merged[template.key]) {
      merged[template.key] = template;
    }
  }
  return merged;
};

export const getEmailTemplates = async (req: Request, res: Response): Promise<void> => {
  try {
    const organizationId = (req as any).user?.organizationId;
    if (!organizationId) {
      res.status(401).json({ success: false, message: "Organization ID is required" });
      return;
    }

    const org = await Organization.findById(organizationId);
    if (!org) {
      res.status(404).json({ success: false, message: "Organization not found" });
      return;
    }

    const templates = ensureDefaults(
      normalizeTemplates((org as any).settings?.emailTemplates)
    );

    (org as any).settings = (org as any).settings || {};
    (org as any).settings.emailTemplates = templates;
    await org.save();

    res.json({ success: true, data: templates });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getEmailTemplateByKey = async (req: Request, res: Response): Promise<void> => {
  try {
    const organizationId = (req as any).user?.organizationId;
    const { key } = req.params;

    if (!organizationId) {
      res.status(401).json({ success: false, message: "Organization ID is required" });
      return;
    }

    const org = await Organization.findById(organizationId);
    if (!org) {
      res.status(404).json({ success: false, message: "Organization not found" });
      return;
    }

    const templates = ensureDefaults(
      normalizeTemplates((org as any).settings?.emailTemplates)
    );

    const template = templates[key];
    if (!template) {
      res.status(404).json({ success: false, message: "Email template not found" });
      return;
    }

    res.json({ success: true, data: template });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const upsertEmailTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const organizationId = (req as any).user?.organizationId;
    const { key } = req.params;

    if (!organizationId) {
      res.status(401).json({ success: false, message: "Organization ID is required" });
      return;
    }

    const org = await Organization.findById(organizationId);
    if (!org) {
      res.status(404).json({ success: false, message: "Organization not found" });
      return;
    }

    const existingTemplates = ensureDefaults(
      normalizeTemplates((org as any).settings?.emailTemplates)
    );

    const incoming = req.body || {};
    existingTemplates[key] = {
      ...(existingTemplates[key] || {}),
      ...incoming,
      key,
      updatedAt: new Date().toISOString(),
    };

    (org as any).settings = (org as any).settings || {};
    (org as any).settings.emailTemplates = existingTemplates;
    await org.save();

    res.json({ success: true, data: existingTemplates[key] });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
