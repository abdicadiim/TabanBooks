import WorkflowRule from "../models/WorkflowRule.js";
import WorkflowAction from "../models/WorkflowAction.js";
import WorkflowLog from "../models/WorkflowLog.js";
import Organization from "../models/Organization.js";
import Salesperson from "../models/Salesperson.js";
import { sendEmail } from "./email.service.js";
import { buildSimplePdf } from "../utils/simplePdf.js";
import type { IQuote } from "../models/Quote.js";
import type { ICustomer } from "../models/Customer.js";

type WorkflowEvent = "on_create" | "on_update" | "on_create_or_update" | "on_delete";

type QuoteWorkflowContext = {
  organizationId: string;
  quote: IQuote;
  customer?: ICustomer | null;
  actorEmail?: string;
};

type ActionExecutionResult = {
  actionType: string;
  status: "success" | "failed";
  message?: string;
  executedAt: Date;
};

type WorkflowActionLike = {
  _id?: any;
  name?: string;
  type?: string;
  config?: Record<string, any>;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const DEFAULT_QUOTE_TEMPLATE_KEY = "quote_notification";

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeText = (value: any): string => String(value ?? "").trim();

const normalizeLower = (value: any): string => normalizeText(value).toLowerCase();

const normalizeEmails = (value: any): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((entry) => normalizeLower(entry))
      .filter((entry) => EMAIL_REGEX.test(entry));
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((entry) => normalizeLower(entry))
      .filter((entry) => EMAIL_REGEX.test(entry));
  }
  return [];
};

const toNumber = (value: any): number | undefined => {
  if (value === null || value === undefined || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const isEmptyValue = (value: any): boolean => {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  return false;
};

const formatDate = (value: any): string => {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const resolvePlaceholder = (template: string, values: Record<string, string>): string => {
  return String(template || "").replace(/%([A-Za-z0-9_]+)%/g, (_match, key) => {
    return values[key] ?? "";
  });
};

const toHtml = (value: string): string => {
  const source = String(value || "");
  if (/<([a-z][\s\S]*?)>/i.test(source)) return source;
  return source
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\r\n/g, "\n")
    .replace(/\n/g, "<br/>");
};

const mapActionEvent = (rule: any): WorkflowEvent => {
  const triggerEvent = normalizeLower(rule?.trigger?.event);
  if (triggerEvent === "on_update") return "on_update";
  if (triggerEvent === "on_create_or_update") return "on_create_or_update";
  if (triggerEvent === "on_delete") return "on_delete";
  if (triggerEvent === "on_create") return "on_create";

  const actionType = normalizeLower(rule?.actionType);
  if (actionType === "edited") return "on_update";
  if (actionType === "created or edited") return "on_create_or_update";
  if (actionType === "deleted") return "on_delete";
  return "on_create";
};

const isRuleEventMatch = (rule: any, event: WorkflowEvent): boolean => {
  const configured = mapActionEvent(rule);
  if (configured === event) return true;
  if (configured === "on_create_or_update" && (event === "on_create" || event === "on_update")) return true;
  return false;
};

const getQuoteFieldValue = (quote: IQuote, customer: ICustomer | null | undefined, fieldName: any): any => {
  const field = normalizeLower(fieldName);
  const normalized = field
    .replace(/#/g, "number")
    .replace(/[%]/g, "")
    .replace(/[^a-z0-9]/g, "");

  const numericMap: Record<string, number | undefined> = {
    total: toNumber((quote as any).total),
    subtotal: toNumber((quote as any).subtotal ?? (quote as any).subTotal),
    tax: toNumber((quote as any).tax),
    discount: toNumber((quote as any).discount),
    shippingcharge: toNumber((quote as any).shippingCharges),
    shippingcharges: toNumber((quote as any).shippingCharges),
    adjustment: toNumber((quote as any).adjustment),
    roundoff: toNumber((quote as any).roundOff),
  };

  if (Object.prototype.hasOwnProperty.call(numericMap, normalized)) {
    return numericMap[normalized];
  }

  const simpleMap: Record<string, any> = {
    quotenumber: (quote as any).quoteNumber,
    referencenumber: (quote as any).referenceNumber,
    status: (quote as any).status,
    currency: (quote as any).currency,
    date: (quote as any).date,
    quotedate: (quote as any).date,
    expirydate: (quote as any).expiryDate,
    customername: customer?.displayName || customer?.name || customer?.companyName || "",
    customeremail: customer?.email || "",
    projectname: (quote as any).projectName,
    notes: (quote as any).notes,
    termsconditions: (quote as any).terms,
    termsandconditions: (quote as any).terms,
    salesperson: (quote as any).salesperson,
  };

  if (Object.prototype.hasOwnProperty.call(simpleMap, normalized)) {
    return simpleMap[normalized];
  }

  if ((quote as any)[fieldName] !== undefined) return (quote as any)[fieldName];
  if ((quote as any)[normalized] !== undefined) return (quote as any)[normalized];

  return undefined;
};

const compareCriteria = (actual: any, operator: string, expected: any): boolean => {
  const normalizedOperator = normalizeLower(operator);
  const actualNumber = toNumber(actual);
  const expectedNumber = toNumber(expected);

  if (normalizedOperator === "is empty") return isEmptyValue(actual);
  if (normalizedOperator === "is not empty") return !isEmptyValue(actual);

  if (["=", "==", "is", "equals"].includes(normalizedOperator)) {
    if (actualNumber !== undefined && expectedNumber !== undefined) return actualNumber === expectedNumber;
    return normalizeLower(actual) === normalizeLower(expected);
  }

  if (["!=", "isn't", "is not", "not equals"].includes(normalizedOperator)) {
    if (actualNumber !== undefined && expectedNumber !== undefined) return actualNumber !== expectedNumber;
    return normalizeLower(actual) !== normalizeLower(expected);
  }

  if (["greater than", ">"].includes(normalizedOperator)) {
    if (actualNumber === undefined || expectedNumber === undefined) return false;
    return actualNumber > expectedNumber;
  }

  if (["greater than or equal", ">="].includes(normalizedOperator)) {
    if (actualNumber === undefined || expectedNumber === undefined) return false;
    return actualNumber >= expectedNumber;
  }

  if (["less than", "<"].includes(normalizedOperator)) {
    if (actualNumber === undefined || expectedNumber === undefined) return false;
    return actualNumber < expectedNumber;
  }

  if (["less than or equal", "<="].includes(normalizedOperator)) {
    if (actualNumber === undefined || expectedNumber === undefined) return false;
    return actualNumber <= expectedNumber;
  }

  if (normalizedOperator === "contains") {
    return normalizeLower(actual).includes(normalizeLower(expected));
  }

  if (normalizedOperator === "does not contain") {
    return !normalizeLower(actual).includes(normalizeLower(expected));
  }

  if (normalizedOperator === "starts with") {
    return normalizeLower(actual).startsWith(normalizeLower(expected));
  }

  if (normalizedOperator === "ends with") {
    return normalizeLower(actual).endsWith(normalizeLower(expected));
  }

  if (normalizedOperator === "between") {
    const actualVal = toNumber(actual);
    if (actualVal === undefined) return false;
    const [minRaw, maxRaw] = String(expected || "")
      .split(",")
      .map((entry) => Number(entry.trim()));
    if (!Number.isFinite(minRaw) || !Number.isFinite(maxRaw)) return false;
    return actualVal >= minRaw && actualVal <= maxRaw;
  }

  return false;
};

const getRuleCriteria = (rule: any): any[] => {
  if (Array.isArray(rule?.criteria) && rule.criteria.length > 0) return rule.criteria;
  if (Array.isArray(rule?.trigger?.conditions) && rule.trigger.conditions.length > 0) return rule.trigger.conditions;
  return [];
};

const doesRuleMatchRecord = (rule: any, quote: IQuote, customer: ICustomer | null | undefined): boolean => {
  const criteria = getRuleCriteria(rule);
  if (!criteria.length) return true;

  let aggregate: boolean | null = null;

  for (const criterion of criteria) {
    if (normalizeLower(criterion?.field) === "criteria_formula") {
      // Formula parser is not implemented yet. Treating configured formula as pass keeps behavior predictable.
      const formulaIsPresent = normalizeText(criterion?.value).length > 0;
      aggregate = aggregate === null ? formulaIsPresent : aggregate && formulaIsPresent;
      continue;
    }

    const actualValue = getQuoteFieldValue(quote, customer, criterion?.field);
    const conditionMatched = compareCriteria(actualValue, criterion?.operator, criterion?.value);
    const joinWith = normalizeText(criterion?.joinWith || "AND").toUpperCase() === "OR" ? "OR" : "AND";

    if (aggregate === null) {
      aggregate = conditionMatched;
    } else if (joinWith === "OR") {
      aggregate = aggregate || conditionMatched;
    } else {
      aggregate = aggregate && conditionMatched;
    }
  }

  return Boolean(aggregate);
};

const resolveTemplateRecord = (templates: Record<string, any>, selectedTemplate: any): any => {
  const selected = normalizeText(selectedTemplate);
  if (selected && templates[selected]) {
    return templates[selected];
  }

  if (selected) {
    const byName = Object.values(templates).find((entry: any) => normalizeLower(entry?.name) === normalizeLower(selected));
    if (byName) return byName;
  }

  if (templates[DEFAULT_QUOTE_TEMPLATE_KEY]) {
    return templates[DEFAULT_QUOTE_TEMPLATE_KEY];
  }

  const first = Object.values(templates)[0];
  return first || null;
};

const resolveQuoteRecipients = async (
  context: QuoteWorkflowContext,
  orgEmail: string,
  recipientRoles: string[],
  additionalRecipients: string[]
): Promise<string[]> => {
  const recipients = new Set<string>();
  const customer = context.customer || null;
  const customerContactPersons = Array.isArray((customer as any)?.contactPersons) ? (customer as any).contactPersons : [];

  const primaryContact = customerContactPersons.find((entry: any) => entry?.isPrimary && EMAIL_REGEX.test(normalizeLower(entry?.email)));
  const salespersonId = (context.quote as any)?.salesperson;
  let salespersonEmail = "";

  if (salespersonId) {
    const salesperson = await Salesperson.findOne({
      _id: salespersonId,
      organization: context.organizationId,
      isActive: true,
    }).select("email");
    salespersonEmail = normalizeLower((salesperson as any)?.email);
  }

  for (const rawRole of recipientRoles) {
    const role = normalizeLower(rawRole);
    if (role.includes("customer")) {
      const email = normalizeLower((customer as any)?.email);
      if (EMAIL_REGEX.test(email)) recipients.add(email);
    }
    if (role.includes("primary contact")) {
      const email = normalizeLower(primaryContact?.email);
      if (EMAIL_REGEX.test(email)) recipients.add(email);
      if (!email) {
        const firstContactEmail = normalizeLower(customerContactPersons[0]?.email);
        if (EMAIL_REGEX.test(firstContactEmail)) recipients.add(firstContactEmail);
      }
    }
    if (role.includes("all contact persons")) {
      for (const person of customerContactPersons) {
        const email = normalizeLower(person?.email);
        if (EMAIL_REGEX.test(email)) recipients.add(email);
      }
    }
    if (role.includes("owner")) {
      const actorEmail = normalizeLower(context.actorEmail);
      if (EMAIL_REGEX.test(actorEmail)) recipients.add(actorEmail);
      const normalizedOrgEmail = normalizeLower(orgEmail);
      if (EMAIL_REGEX.test(normalizedOrgEmail)) recipients.add(normalizedOrgEmail);
    }
    if (role.includes("assigned users")) {
      if (EMAIL_REGEX.test(salespersonEmail)) recipients.add(salespersonEmail);
    }
  }

  for (const email of additionalRecipients) {
    const normalized = normalizeLower(email);
    if (EMAIL_REGEX.test(normalized)) recipients.add(normalized);
  }

  return Array.from(recipients);
};

const executeQuoteEmailAlert = async (
  action: WorkflowActionLike,
  context: QuoteWorkflowContext,
  organization: any
): Promise<ActionExecutionResult> => {
  const executedAt = new Date();
  const config = action?.config && typeof action.config === "object" ? action.config : {};
  const templates = (organization as any)?.settings?.emailTemplates && typeof (organization as any).settings.emailTemplates === "object"
    ? (organization as any).settings.emailTemplates
    : {};
  const templateRecord = resolveTemplateRecord(templates, config.emailTemplate);

  const recipientRoles = Array.isArray(config.emailRecipients)
    ? config.emailRecipients.map((entry: any) => normalizeText(entry)).filter(Boolean)
    : [];
  const additionalRecipients = normalizeEmails(config.additionalRecipients);
  const recipients = await resolveQuoteRecipients(
    context,
    normalizeText((organization as any)?.email),
    recipientRoles,
    additionalRecipients
  );

  if (!recipients.length) {
    return {
      actionType: "email_alert",
      status: "failed",
      message: "No valid recipient email addresses resolved for this email alert",
      executedAt,
    };
  }

  const customerName =
    normalizeText((context.customer as any)?.displayName) ||
    normalizeText((context.customer as any)?.name) ||
    normalizeText((context.customer as any)?.companyName) ||
    "Customer";

  const companyName = normalizeText((organization as any)?.name) || "Taban Books";
  const totalAmount = Number((context.quote as any)?.total || 0).toFixed(2);
  const placeholders: Record<string, string> = {
    CompanyName: companyName,
    CustomerName: customerName,
    SenderName: companyName,
    UserName: companyName,
    QuoteNumber: normalizeText((context.quote as any)?.quoteNumber),
    QuoteDate: formatDate((context.quote as any)?.date),
    ExpiryDate: formatDate((context.quote as any)?.expiryDate),
    ReferenceNumber: normalizeText((context.quote as any)?.referenceNumber),
    Total: `${normalizeText((context.quote as any)?.currency || "USD")} ${totalAmount}`,
  };

  const fallbackSubject = "Quote from %CompanyName% (Quote #: %QuoteNumber%)";
  const fallbackBody = "Dear %CustomerName%,\n\nPlease find your quote attached.\n\nRegards,\n%SenderName%";
  const subject = resolvePlaceholder(normalizeText(templateRecord?.subject) || fallbackSubject, placeholders);
  const bodyRaw = resolvePlaceholder(normalizeText(templateRecord?.body) || fallbackBody, placeholders);
  const html = toHtml(bodyRaw);

  const cc = normalizeEmails(config.cc || templateRecord?.cc).join(", ");
  const bcc = normalizeEmails(config.bcc || templateRecord?.bcc).join(", ");
  const from = normalizeText(config.from || templateRecord?.from);

  const attachments: Array<{ filename: string; content: Buffer; contentType: string }> = [];
  if (Boolean(config.attachPDF)) {
    const lines = [
      `${companyName} Quote`,
      `Quote Number: ${normalizeText((context.quote as any)?.quoteNumber) || "-"}`,
      `Date: ${formatDate((context.quote as any)?.date) || "-"}`,
      `Total: ${normalizeText((context.quote as any)?.currency || "USD")} ${totalAmount}`,
    ];
    attachments.push({
      filename: `${normalizeText((context.quote as any)?.quoteNumber) || "quote"}.pdf`,
      content: buildSimplePdf(lines),
      contentType: "application/pdf",
    });
  }

  const emailResult = await sendEmail({
    to: recipients.join(", "),
    cc: cc || undefined,
    bcc: bcc || undefined,
    from: from || undefined,
    subject,
    html,
    organizationId: context.organizationId,
    attachments,
  });

  if (!emailResult.success) {
    return {
      actionType: "email_alert",
      status: "failed",
      message: emailResult.error || "Failed to send email alert",
      executedAt,
    };
  }

  return {
    actionType: "email_alert",
    status: "success",
    message: `Email alert sent to ${recipients.join(", ")}`,
    executedAt,
  };
};

const buildRuleActionList = (
  rule: any,
  linkedActionsById: Map<string, any>,
  fallbackEmailActions: any[]
): WorkflowActionLike[] => {
  const resolved: WorkflowActionLike[] = [];

  const addResolvedEntry = (entry: any) => {
    const actionId = normalizeText(entry?.actionId || entry?._id);
    if (actionId && linkedActionsById.has(actionId)) {
      resolved.push(linkedActionsById.get(actionId));
      return;
    }

    if (entry?.type || entry?.config) {
      resolved.push({
        _id: entry?._id || entry?.actionId,
        name: entry?.name,
        type: entry?.type,
        config: entry?.config || {},
      });
    }
  };

  if (Array.isArray(rule?.immediateActions)) {
    for (const actionRef of rule.immediateActions) addResolvedEntry(actionRef);
  }

  if (Array.isArray(rule?.actions)) {
    for (const actionRef of rule.actions) addResolvedEntry(actionRef);
  }

  if (!resolved.length && Array.isArray(fallbackEmailActions) && fallbackEmailActions.length) {
    for (const fallback of fallbackEmailActions) {
      resolved.push(fallback);
    }
  }

  return resolved;
};

const executeRuleActions = async (
  actions: WorkflowActionLike[],
  context: QuoteWorkflowContext,
  organization: any
): Promise<ActionExecutionResult[]> => {
  const results: ActionExecutionResult[] = [];
  const executedActionIds = new Set<string>();

  for (const action of actions) {
    const actionId = normalizeText(action?._id);
    if (actionId && executedActionIds.has(actionId)) {
      continue;
    }
    if (actionId) executedActionIds.add(actionId);

    const actionType = normalizeLower(action?.type);
    if (actionType === "email_alert" || actionType === "send_email" || actionType === "email") {
      const result = await executeQuoteEmailAlert(action, context, organization);
      results.push(result);
      continue;
    }

    results.push({
      actionType: actionType || "unknown",
      status: "failed",
      message: `Action type "${action?.type || "unknown"}" execution is not implemented yet`,
      executedAt: new Date(),
    });
  }

  return results;
};

export const executeQuoteCreateWorkflows = async (context: QuoteWorkflowContext): Promise<void> => {
  const organizationId = normalizeText(context.organizationId);
  if (!organizationId) return;

  const organization = await Organization.findById(organizationId).select("name email settings.emailTemplates");
  if (!organization) return;

  const allRules = await WorkflowRule.find({
    organization: organizationId,
    isActive: true,
    workflowType: "event_based",
  }).sort({ executionOrder: 1, createdAt: 1 });

  const quoteRules = allRules.filter((rule: any) => new RegExp(`^${escapeRegex("Quote")}$`, "i").test(normalizeText(rule?.module)));
  if (!quoteRules.length) return;

  const linkedActionIds = new Set<string>();
  for (const rule of quoteRules) {
    for (const actionRef of Array.isArray((rule as any)?.immediateActions) ? (rule as any).immediateActions : []) {
      const ref = actionRef as any;
      const id = normalizeText(ref?.actionId || ref?._id);
      if (id) linkedActionIds.add(id);
    }
    for (const actionRef of Array.isArray((rule as any)?.actions) ? (rule as any).actions : []) {
      const ref = actionRef as any;
      const id = normalizeText(ref?.actionId || ref?._id);
      if (id) linkedActionIds.add(id);
    }
  }

  const linkedActions = linkedActionIds.size
    ? await WorkflowAction.find({
        organization: organizationId,
        _id: { $in: Array.from(linkedActionIds) },
        isActive: true,
      })
    : [];
  const linkedActionsById = new Map<string, any>(linkedActions.map((action: any) => [String(action._id), action]));

  // Backward-compatible fallback for current UI flow where a workflow rule may be created without explicit action linkage.
  const fallbackEmailActions = await WorkflowAction.find({
    organization: organizationId,
    module: { $regex: /^quote$/i },
    type: "email_alert",
    isActive: true,
  });

  for (const rule of quoteRules) {
    if (!isRuleEventMatch(rule, "on_create")) continue;
    if (!doesRuleMatchRecord(rule, context.quote, context.customer)) continue;

    const actions = buildRuleActionList(rule, linkedActionsById, fallbackEmailActions);
    const actionResults = await executeRuleActions(actions, context, organization);

    const successCount = actionResults.filter((result) => result.status === "success").length;
    const failedCount = actionResults.filter((result) => result.status === "failed").length;
    const logStatus: "success" | "failed" = failedCount > 0 || successCount === 0 ? "failed" : "success";

    await WorkflowLog.create({
      organization: organizationId,
      workflowRule: rule._id,
      entityType: "Quote",
      entityId: context.quote._id,
      status: logStatus,
      executedAt: new Date(),
      actionsExecuted: actionResults.map((result) => ({
        actionType: result.actionType,
        status: result.status,
        message: result.message,
        executedAt: result.executedAt,
      })),
      error: logStatus === "failed" ? actionResults.filter((result) => result.status === "failed").map((result) => result.message).filter(Boolean).join("; ") : undefined,
      metadata: {
        event: "on_create",
        quoteNumber: (context.quote as any)?.quoteNumber,
      },
    });
  }
};
