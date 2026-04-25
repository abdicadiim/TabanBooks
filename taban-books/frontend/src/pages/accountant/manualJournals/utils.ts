import type {
  ManualJournal,
  ManualJournalEntry,
} from "../manualJournalTypes";
import type {
  BuildManualJournalPayloadArgs,
  BuildManualJournalPayloadResult,
  ManualJournalFormState,
  ManualJournalTemplateRecord,
  ManualJournalTotals,
} from "./types";

export const getManualJournalTemplateLines = (
  template: ManualJournalTemplateRecord | ManualJournal | null | undefined,
): any[] => {
  if (!template) {
    return [];
  }

  if (Array.isArray(template.line_items)) {
    return template.line_items;
  }

  if (Array.isArray(template.lines)) {
    return template.lines;
  }

  if (Array.isArray(template.entries)) {
    return template.entries;
  }

  return [];
};

export const mapLinesToManualJournalEntries = (
  lines: any[] | undefined,
): ManualJournalEntry[] =>
  (lines || []).map((line, index) => {
    const debit =
      line.debits ??
      line.debit ??
      (line.debit_or_credit === "debit" ? line.amount : "");
    const credit =
      line.credits ??
      line.credit ??
      (line.debit_or_credit === "credit" ? line.amount : "");

    return {
      id: line.id || line.lineId || line.line_id || line._id || index + 1,
      account: line.accountName || line.account_name || line.account || "",
      accountId: line.accountId || line.account_id || line.account || "",
      description: line.description || "",
      contact: line.contact || line.customerName || line.customer_name || "",
      type: line.type || "",
      tax: line.tax || line.taxName || line.tax_name || "",
      project: line.project || line.projectId || line.project_id || "",
      reportingTags: line.reportingTags || line.reporting_tags || "",
      debits: debit ? String(debit) : "",
      credits: credit ? String(credit) : "",
    };
  });

export const applyTemplateToManualJournalForm = (
  previousForm: ManualJournalFormState,
  template: ManualJournalTemplateRecord,
): ManualJournalFormState => ({
  ...previousForm,
  reference:
    template.referenceNumber || template.reference || previousForm.reference,
  notes: template.notes || template.description || previousForm.notes,
  reportingMethod:
    template.reportingMethod || previousForm.reportingMethod,
  currency: template.currency || previousForm.currency,
});

export const calculateManualJournalTotals = (
  entries: ManualJournalEntry[],
): ManualJournalTotals => {
  const totals = entries.reduce(
    (result, entry) => {
      result.totalDebits += Number.parseFloat(entry.debits) || 0;
      result.totalCredits += Number.parseFloat(entry.credits) || 0;
      return result;
    },
    { totalDebits: 0, totalCredits: 0, difference: 0 },
  );

  return {
    ...totals,
    difference: totals.totalDebits - totals.totalCredits,
  };
};

const hasLineContent = (entry: ManualJournalEntry) =>
  Boolean(
    (entry.accountId || entry.account || "").trim() ||
      (Number.parseFloat(entry.debits) || 0) > 0 ||
      (Number.parseFloat(entry.credits) || 0) > 0 ||
      entry.description ||
      entry.contact ||
      entry.type ||
      entry.tax ||
      entry.project ||
      entry.reportingTags,
  );

const formatLineValidationError = (index: number, message: string) =>
  `Line ${index + 1}: ${message}`;

export const buildManualJournalPayload = ({
  attachmentsCount,
  availableContacts,
  availableTaxes,
  entries,
  formData,
  journal,
  status,
}: BuildManualJournalPayloadArgs): BuildManualJournalPayloadResult => {
  if (!formData.date) {
    return { error: "Please choose a journal date." };
  }

  const populatedEntries = entries.filter(hasLineContent);
  if (populatedEntries.length === 0) {
    return { error: "Please add at least one journal line with an account." };
  }

  const normalizedEntries = [];

  for (let index = 0; index < populatedEntries.length; index += 1) {
    const entry = populatedEntries[index];
    const accountId = (entry.accountId || entry.account || "").trim();
    const debit = Number.parseFloat(entry.debits) || 0;
    const credit = Number.parseFloat(entry.credits) || 0;

    if (!accountId) {
      return {
        error: formatLineValidationError(index, "select an account."),
      };
    }

    if (debit > 0 && credit > 0) {
      return {
        error: formatLineValidationError(
          index,
          "enter either a debit or a credit amount, not both.",
        ),
      };
    }

    if (debit <= 0 && credit <= 0) {
      return {
        error: formatLineValidationError(
          index,
          "enter a debit or credit amount.",
        ),
      };
    }

    const selectedContact = availableContacts.find(
      (contact) => contact.name === entry.contact,
    );
    const selectedTax = availableTaxes.find((tax) => tax.name === entry.tax);

    normalizedEntries.push({
      id: entry.id,
      lineId: String(index + 1),
      accountId,
      account: entry.account.trim(),
      description: entry.description || "",
      contact: entry.contact || "",
      customerId:
        selectedContact?.type === "Customer" ? selectedContact.id : undefined,
      customerName:
        selectedContact?.type === "Customer"
          ? selectedContact.name
          : undefined,
      type: entry.type || "",
      tax: entry.tax || undefined,
      taxId: selectedTax?._id || selectedTax?.id,
      taxName: selectedTax?.name || entry.tax || undefined,
      project: entry.project || undefined,
      reportingTags: entry.reportingTags || undefined,
      debits: debit > 0 ? String(debit) : "",
      credits: credit > 0 ? String(credit) : "",
    });
  }

  const totals = calculateManualJournalTotals(normalizedEntries);
  if (Math.abs(totals.difference) > 0.01) {
    return {
      error: `Journal entries must be balanced. Debits: ${totals.totalDebits.toFixed(2)}, Credits: ${totals.totalCredits.toFixed(2)}.`,
    };
  }

  return {
    payload: {
      ...(journal || {}),
      date: formData.date,
      journal_date: formData.date,
      entryNumber: formData.journalNumber || undefined,
      journalNumber: formData.journalNumber || "",
      reference: formData.reference || "",
      reference_number: formData.reference || "",
      notes: formData.notes || "",
      description: formData.notes || "",
      reportingMethod: formData.reportingMethod || "accrual-and-cash",
      currency: formData.currency || "SOS",
      amount: Math.max(totals.totalDebits, totals.totalCredits, 0),
      entries: normalizedEntries,
      attachments: attachmentsCount,
      status,
    },
  };
};

export const getManualJournalTemplateName = (
  template: ManualJournalTemplateRecord,
) => template.templateName || template.name || "Untitled template";

export const getManualJournalTemplateCreatedBy = (
  template: ManualJournalTemplateRecord,
) => template.createdBy?.name || template.createdBy?.email || "System";
