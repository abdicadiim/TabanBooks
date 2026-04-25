import { accountantAPI, currenciesAPI } from "../../services/api";

export const sampleJournals = [];
export const sampleBudgets = [];

const toJournalNumber = (value: any) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeJournalStatusValue = (rawStatus: any): string | undefined => {
  const status = String(rawStatus || "").trim().toLowerCase();
  if (!status) return undefined;
  if (status === "published" || status === "posted") return "posted";
  if (status === "draft") return "draft";
  if (status === "pending approval" || status === "pending_approval" || status === "pending-approval") return "pending_approval";
  if (status === "approved") return "approved";
  if (status === "rejected") return "rejected";
  if (status === "cancelled" || status === "canceled") return "cancelled";
  return status;
};

const normalizeReportingMethodValue = (rawMethod: any) => {
  const value = String(rawMethod || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-")
    .replace(/\s+/g, "-");

  if (!value) return undefined;
  if (value === "accrual-and-cash" || value === "accrual-cash") return "accrual-and-cash";
  if (value === "accrual-only" || value === "accrual") return "accrual-only";
  if (value === "cash-only" || value === "cash") return "cash-only";
  return undefined;
};

const resolveJournalLineDirection = (line: any): "debit" | "credit" | undefined => {
  const explicit = String(line?.debit_or_credit ?? line?.debitOrCredit ?? line?.type ?? "")
    .trim()
    .toLowerCase();

  if (explicit === "debit" || explicit === "credit") return explicit;

  const debit = toJournalNumber(line?.debit ?? line?.debits);
  const credit = toJournalNumber(line?.credit ?? line?.credits);
  if (debit > 0 && credit <= 0) return "debit";
  if (credit > 0 && debit <= 0) return "credit";
  return undefined;
};

const normalizeJournalLine = (line: any, index: number) => {
  const debitValue = toJournalNumber(line?.debit ?? line?.debits);
  const creditValue = toJournalNumber(line?.credit ?? line?.credits);
  const direction = resolveJournalLineDirection(line);
  const explicitAmount = toJournalNumber(line?.amount);
  const amount =
    explicitAmount > 0
      ? explicitAmount
      : direction === "debit"
        ? debitValue
        : direction === "credit"
          ? creditValue
          : Math.max(debitValue, creditValue, 0);
  const debit = direction === "debit" ? amount : direction ? 0 : debitValue;
  const credit = direction === "credit" ? amount : direction ? 0 : creditValue;

  return {
    ...line,
    id: line?.id ?? line?.lineId ?? line?.line_id ?? line?._id ?? index + 1,
    lineId: line?.lineId ?? line?.line_id ?? line?._id ?? String(index + 1),
    accountId: line?.accountId ?? line?.account_id ?? line?.account ?? "",
    account: line?.accountName ?? line?.account_name ?? line?.account ?? "",
    accountName: line?.accountName ?? line?.account_name ?? line?.account ?? "",
    customerId: line?.customerId ?? line?.customer_id ?? "",
    customerName: line?.customerName ?? line?.customer_name ?? "",
    contact: line?.contact ?? "",
    description: line?.description ?? "",
    type: line?.type ?? "",
    tax: line?.tax ?? line?.taxName ?? line?.tax_name ?? "",
    taxId: line?.taxId ?? line?.tax_id ?? line?.tax?._id ?? line?.tax?.id ?? "",
    taxName: line?.taxName ?? line?.tax_name ?? (typeof line?.tax === "string" ? line.tax : line?.tax?.name) ?? "",
    project: line?.project ?? line?.projectId ?? line?.project_id ?? "",
    projectId: line?.projectId ?? line?.project_id ?? line?.project ?? "",
    projectName: line?.projectName ?? line?.project_name ?? "",
    reportingTags: line?.reportingTags ?? line?.reporting_tags ?? "",
    amount,
    debit,
    credit,
    debits: debit > 0 ? String(debit) : "",
    credits: credit > 0 ? String(credit) : "",
    debitOrCredit: direction,
    debit_or_credit: direction,
  };
};

const normalizeJournalRecord = (journal: any) => {
  const sourceLines = Array.isArray(journal?.line_items)
    ? journal.line_items
    : Array.isArray(journal?.lines)
      ? journal.lines
      : Array.isArray(journal?.entries)
        ? journal.entries
        : [];
  const lines = sourceLines.map((line: any, index: number) => normalizeJournalLine(line, index));
  const totalDebit = lines.reduce((sum: number, line: any) => sum + toJournalNumber(line.debit), 0);
  const totalCredit = lines.reduce((sum: number, line: any) => sum + toJournalNumber(line.credit), 0);
  const amount = toJournalNumber(journal?.amount ?? journal?.total) || Math.max(totalDebit, totalCredit, 0);
  const normalizedStatus = normalizeJournalStatusValue(journal?.status) ?? journal?.status;

  return {
    ...journal,
    id: journal?._id || journal?.id,
    journalId: journal?.journalId || journal?.journal_id || journal?._id || journal?.id,
    journalNumber:
      journal?.journalNumber ??
      journal?.entryNumber ??
      journal?.entry_number ??
      journal?.journal_number ??
      "",
    entryNumber:
      journal?.entryNumber ??
      journal?.entry_number ??
      journal?.journalNumber ??
      journal?.journal_number ??
      "",
    referenceNumber:
      journal?.referenceNumber ?? journal?.reference_number ?? journal?.reference ?? "",
    reference: journal?.reference ?? journal?.referenceNumber ?? journal?.reference_number ?? "",
    date: journal?.date ?? journal?.journalDate ?? journal?.journal_date ?? "",
    journalDate: journal?.journalDate ?? journal?.journal_date ?? journal?.date ?? "",
    notes: journal?.notes ?? journal?.description ?? "",
    description: journal?.description ?? journal?.notes ?? "",
    reportingMethod:
      normalizeReportingMethodValue(journal?.reportingMethod ?? journal?.reporting_method) ??
      journal?.reportingMethod ??
      "accrual-and-cash",
    currency:
      journal?.currency ?? journal?.currency_code ?? journal?.currency_id ?? "",
    status: normalizedStatus,
    amount,
    total: amount,
    lines,
    entries: lines,
    line_items: lines,
  };
};

const buildJournalPayload = (journalData: any) => {
  const sourceLines = Array.isArray(journalData?.line_items)
    ? journalData.line_items
    : Array.isArray(journalData?.lines)
      ? journalData.lines
      : Array.isArray(journalData?.entries)
        ? journalData.entries
        : [];

  const normalizedLines = sourceLines.map((line: any, index: number) => normalizeJournalLine(line, index));
  const line_items = normalizedLines
    .map((line: any, index: number) => {
      const direction = line?.debit > 0 ? "debit" : line?.credit > 0 ? "credit" : line?.debitOrCredit;
      const amount = toJournalNumber(line?.amount) || Math.max(toJournalNumber(line?.debit), toJournalNumber(line?.credit), 0);

      return {
        line_id: line?.lineId ?? String(index + 1),
        account_id: line?.accountId ?? line?.account ?? "",
        account_name: line?.accountName ?? line?.account ?? "",
        customer_id: line?.customerId || undefined,
        customer_name: line?.customerName || undefined,
        contact: line?.contact || undefined,
        description: line?.description || "",
        type: line?.type || "",
        tax_id: line?.taxId || undefined,
        tax_name: line?.taxName || (typeof line?.tax === "string" ? line.tax : line?.tax?.name) || undefined,
        tax: line?.tax || undefined,
        amount,
        debit_or_credit: direction,
        project_id: line?.projectId ?? line?.project ?? undefined,
        project_name: line?.projectName || undefined,
        reporting_tags: line?.reportingTags || undefined,
        tags: Array.isArray(line?.tags) ? line.tags : undefined,
        location_id: line?.locationId ?? undefined,
      };
    })
    .filter((line: any) => line.account_id && line.amount > 0 && (line.debit_or_credit === "debit" || line.debit_or_credit === "credit"));

  const lines = line_items.map((line: any) => ({
    lineId: line.line_id,
    account: line.account_id,
    accountName: line.account_name,
    customerId: line.customer_id,
    customerName: line.customer_name,
    contact: line.contact,
    description: line.description,
    type: line.type,
    taxId: line.tax_id,
    taxName: line.tax_name,
    tax: line.tax,
    amount: line.amount,
    debitOrCredit: line.debit_or_credit,
    debit: line.debit_or_credit === "debit" ? line.amount : 0,
    credit: line.debit_or_credit === "credit" ? line.amount : 0,
    project: line.project_id,
    projectName: line.project_name,
    reportingTags: line.reporting_tags,
    tags: line.tags,
    locationId: line.location_id,
  }));

  const totalDebit = lines.reduce((sum: number, line: any) => sum + toJournalNumber(line.debit), 0);
  const totalCredit = lines.reduce((sum: number, line: any) => sum + toJournalNumber(line.credit), 0);
  const amount = toJournalNumber(journalData?.amount) || Math.max(totalDebit, totalCredit, 0);
  const reportingMethod =
    normalizeReportingMethodValue(journalData?.reportingMethod ?? journalData?.reporting_method) ??
    undefined;
  const status = normalizeJournalStatusValue(journalData?.status);
  const dateValue = journalData?.journal_date ?? journalData?.journalDate ?? journalData?.date;
  const entryNumber =
    journalData?.entryNumber ??
    journalData?.entry_number ??
    journalData?.journalNumber ??
    "";
  const reference =
    journalData?.reference ??
    journalData?.referenceNumber ??
    journalData?.reference_number ??
    "";
  const currency = String(
    journalData?.currency ??
    journalData?.currency_code ??
    journalData?.currency_id ??
    ""
  ).trim().toUpperCase();

  return {
    ...journalData,
    date: dateValue,
    journal_date: dateValue,
    entryNumber,
    entry_number: entryNumber,
    journalNumber: entryNumber,
    reference,
    referenceNumber: reference,
    reference_number: reference,
    notes: journalData?.notes ?? journalData?.description ?? "",
    description: journalData?.description ?? journalData?.notes ?? "",
    reportingMethod: reportingMethod ?? journalData?.reportingMethod,
    reporting_method: reportingMethod,
    currency,
    currency_code: currency,
    currency_id: currency,
    status,
    amount,
    lines,
    entries: lines,
    line_items,
  };
};

// --- Chart of Accounts ---

export const getAccounts = async (params = {}) => {
  try {
    // Filter out undefined, null, or empty string params to avoid sending them as strings in URL
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== "")
    );
    const response = await accountantAPI.getAccounts(cleanParams);
    return response;
  } catch (error) {
    console.error("Error fetching accounts:", error);
    return { success: false, data: [] };
  }
};

// Return chart of accounts (same as getAccounts for now, kept for clarity/use in UI)
export const getChartOfAccounts = async (params = {}) => {
  try {
    const response = await getAccounts(params);
    // normalize response to array of accounts
    if (!response) return [];
    if (Array.isArray(response)) return response;
    return response.data || response;
  } catch (error) {
    console.error("Error fetching chart of accounts:", error);
    return [];
  }
};

export const createAccount = async (accountData: any) => {
  try {
    const response = await accountantAPI.createAccount(accountData);
    return response.success ? response.data : null;
  } catch (error) {
    console.error("Error creating account:", error);
    throw error;
  }
};

export const updateAccount = async (id: string, accountData: any) => {
  try {
    const response = await accountantAPI.updateAccount(id, accountData);
    return response.success ? response.data : null;
  } catch (error) {
    console.error("Error updating account:", error);
    throw error;
  }
};

export const deleteAccount = async (id: string) => {
  try {
    const response = await accountantAPI.deleteAccount(id);
    return response.success;
  } catch (error) {
    console.error("Error deleting account:", error);
    throw error;
  }
};

export const bulkDeleteAccounts = async (ids: string[]) => {
  try {
    const response = await accountantAPI.bulkDeleteAccounts(ids);
    return response.success ? response : { success: false };
  } catch (error) {
    console.error("Error bulk deleting accounts:", error);
    throw error;
  }
};

export const bulkUpdateAccountStatus = async (ids: string[], isActive: boolean) => {
  try {
    const response = await accountantAPI.bulkUpdateAccountStatus(ids, isActive);
    return response.success ? response : { success: false };
  } catch (error) {
    console.error("Error bulk updating account status:", error);
    throw error;
  }
};

// --- Journal Management Functions ---

export const getJournals = async (params = {}) => {
  try {
    const response = await accountantAPI.getJournals(params);
    if (response?.data && Array.isArray(response.data)) {
      return {
        ...response,
        data: response.data.map((journal: any) => normalizeJournalRecord(journal)),
      };
    }
    return response;
  } catch (error) {
    console.error("Error getting journals:", error);
    return { success: false, data: [] };
  }
};

export const getJournalById = async (id: string) => {
  try {
    const response = await accountantAPI.getJournalById(id);
    return response.success ? normalizeJournalRecord(response.data) : null;
  } catch (error) {
    console.error("Error getting journal by id:", error);
    return null;
  }
};

export const saveJournal = async (journalData: any) => {
  try {
    const payload = buildJournalPayload(journalData);

    if (journalData._id || journalData.id) {
      const id = journalData._id || journalData.id;
      const response = await accountantAPI.updateJournal(id, payload);
      return response.success;
    } else {
      const response = await accountantAPI.createJournal(payload);
      return response.success;
    }
  } catch (error) {
    console.error("Error saving journal:", error);
    // Throw parsing error to be caught by UI
    throw error;
  }

};

export const createJournal = saveJournal;

export const deleteJournal = async (id: string) => {
  try {
    const response = await accountantAPI.deleteJournal(id);
    return response.success;
  } catch (error) {
    console.error("Error deleting journal:", error);
    return false;
  }
};

// --- Budget Management Functions ---

export const getBudgets = async (params = {}) => {
  try {
    const response = await accountantAPI.getBudgets(params);
    return response;
  } catch (error) {
    console.error("Error getting budgets:", error);
    return { success: false, data: [] };
  }
};

export const getBudgetById = async (id: string) => {
  try {
    const response = await accountantAPI.getBudgetById(id);
    return response.success ? response.data : null;
  } catch (error) {
    console.error("Error getting budget by id:", error);
    return null;
  }
};

export const saveBudget = async (budgetData: any) => {
  try {
    const normalizedBudgetData = {
      ...budgetData,
      lines: Array.isArray(budgetData?.lines)
        ? budgetData.lines.map((line: any) => {
            const periods = Array.isArray(line?.periods)
              ? line.periods.map((p: any) => ({
                  ...p,
                  amount: Number(p?.amount) || 0,
                  actualAmount:
                    p?.actualAmount === undefined ? undefined : Number(p.actualAmount) || 0,
                }))
              : [];
            const amount =
              periods.length > 0
                ? periods.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0)
                : Number(line?.amount) || 0;
            return {
              ...line,
              amount,
              periods,
            };
          })
        : [],
    };

    if (budgetData._id || budgetData.id) {
      const id = budgetData._id || budgetData.id;
      const response = await accountantAPI.updateBudget(id, normalizedBudgetData);
      return response.success;
    } else {
      const response = await accountantAPI.createBudget(normalizedBudgetData);
      return response.success;
    }
  } catch (error) {
    console.error("Error saving budget:", error);
    return false;
  }
};

export const deleteBudget = async (id: string) => {
  try {
    const response = await accountantAPI.deleteBudget(id);
    return response.success;
  } catch (error) {
    console.error("Error deleting budget:", error);
    return false;
  }
};

// --- Journal Template Functions ---

export const getJournalTemplates = async (params = {}) => {
  try {
    const response = await accountantAPI.getJournalTemplates(params);
    return response;
  } catch (error) {
    console.error("Error getting journal templates:", error);
    return { success: false, data: [] };
  }
};

export const getJournalTemplateById = async (id: string) => {
  try {
    const response = await accountantAPI.getJournalTemplateById(id);
    return response.success ? response.data : null;
  } catch (error) {
    console.error("Error getting journal template by id:", error);
    return null;
  }
};

export const saveJournalTemplate = async (templateData: any) => {
  try {
    if (templateData._id || templateData.id) {
      const id = templateData._id || templateData.id;
      const response = await accountantAPI.updateJournalTemplate(id, templateData);
      return response.success;
    } else {
      const response = await accountantAPI.createJournalTemplate(templateData);
      return response.success;
    }
  } catch (error) {
    console.error("Error saving journal template:", error);
    return false;
  }
};

export const createJournalTemplate = saveJournalTemplate;

export const deleteJournalTemplate = async (id: string) => {
  try {
    const response = await accountantAPI.deleteJournalTemplate(id);
    return response.success;
  } catch (error) {
    console.error("Error deleting journal template:", error);
    return false;
  }
};

// --- Transaction Locking Functions ---

export const getTransactionLocks = async (params = {}) => {
  try {
    const response = await accountantAPI.getTransactionLocks(params);
    return response;
  } catch (error) {
    console.error("Error getting transaction locks:", error);
    return { success: false, data: [] };
  }
};

export const createTransactionLock = async (lockData: any) => {
  try {
    const response = await accountantAPI.createTransactionLock(lockData);
    return response.success ? response.data : null;
  } catch (error) {
    console.error("Error creating transaction lock:", error);
    return null;
  }
};

export const unlockTransaction = async (id: string) => {
  try {
    const response = await accountantAPI.unlockTransaction(id);
    return response.success ? response.data : null;
  } catch (error) {
    console.error("Error unlocking transaction:", error);
    return null;
  }
};

export const bulkUnlockTransactions = async (modules: string[]) => {
  try {
    const response = await accountantAPI.bulkUnlockTransactions(modules);
    return response.success ? response : { success: false };
  } catch (error) {
    console.error("Error bulk unlocking transactions:", error);
    return { success: false };
  }
};

export const getBaseCurrency = async () => {
  try {
    const response = await currenciesAPI.getBaseCurrency();
    return response.success ? response.data : null;
  } catch (error) {
    console.error("Error fetching base currency:", error);
    return null;
  }
};

export default {
  getAccounts, createAccount, updateAccount, deleteAccount, bulkDeleteAccounts, bulkUpdateAccountStatus,
  getJournals, getJournalById, saveJournal, createJournal, deleteJournal,
  getBudgets, getBudgetById, saveBudget, deleteBudget,
  getJournalTemplates, getJournalTemplateById, saveJournalTemplate, createJournalTemplate, deleteJournalTemplate,
  getTransactionLocks, createTransactionLock, unlockTransaction, bulkUnlockTransactions,
  getBaseCurrency
};

