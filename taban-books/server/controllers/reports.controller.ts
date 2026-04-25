/**
 * Reports Controller
 * Handles reports catalog, report runs, scheduling, sharing, and custom reports.
 */

import { Response } from "express";
import mongoose from "mongoose";
import type { AuthRequest } from "../middleware/auth.middleware.js";
import Organization from "../models/Organization.js";
import CustomReport from "../models/CustomReport.js";
import ReportSchedule from "../models/ReportSchedule.js";
import ReportShare from "../models/ReportShare.js";
import { REPORT_CATEGORIES, SYSTEM_REPORTS, getSystemReportByKey } from "../utils/reportsCatalog.js";
import { runSystemReport } from "../utils/reportsEngine.js";

const DEFAULT_LAYOUT = {
  tableDensity: "Classic",
  tableDesign: "Bordered",
  paperSize: "A4",
  orientation: "Portrait",
  fontFamily: "Open Sans",
  margins: { top: "0.7", right: "0.2", bottom: "0.7", left: "0.55" },
  details: {
    showOrganizationName: true,
    showReportBasis: true,
    showPageNumber: true,
    showGeneratedBy: true,
    showGeneratedDate: true,
    showGeneratedTime: false,
  },
};

const HOME_FILTERS = [
  { id: "home", label: "All Reports" },
  { id: "favorites", label: "Favorites" },
  { id: "shared", label: "Shared Reports" },
  { id: "my", label: "My Reports" },
  { id: "scheduled", label: "Scheduled Reports" },
];

const toObjectId = (value: string): mongoose.Types.ObjectId => new mongoose.Types.ObjectId(value);
const isValidObjectId = (value: string): boolean => mongoose.Types.ObjectId.isValid(value);
const normalizeReportKey = (reportKey: string): string => String(reportKey || "").trim();
const isCustomReportKey = (reportKey: string): boolean => normalizeReportKey(reportKey).startsWith("custom-");
const extractCustomReportId = (reportKey: string): string | null => {
  const key = normalizeReportKey(reportKey);
  if (!key.startsWith("custom-")) return null;
  return key.substring(7);
};

const CUSTOM_MODULE_SOURCE_REPORT_KEYS: Record<string, string> = {
  quote: "quote_details",
  invoice: "invoice_details",
  "credit note": "credit_note_details",
  "customer payment": "payments_received",
  "sales receipt": "payments_received",
  "purchase order": "purchase_order_details",
  expense: "payments_made",
  bill: "ap_aging_details",
  "vendor credits": "vendor_credit_details",
  "vendor payment": "payments_made",
  journal: "account_transactions",
  projects: "project_summary",
  timesheet: "timesheet_details",
};

const CUSTOM_REPORT_COLUMN_ALIASES: Record<string, Record<string, string>> = {
  quote_details: {
    "quote#": "quoteNumber",
    "quote date": "quoteDate",
    "expiry date": "expiryDate",
    "customer name": "customerName",
    "quote amount": "amount",
    status: "status",
  },
  invoice_details: {
    "invoice#": "invoiceNumber",
    "invoice date": "invoiceDate",
    "due date": "dueDate",
    "customer name": "customerName",
    "invoice amount": "amount",
    "balance due": "balanceDue",
    amount: "amount",
    status: "status",
  },
  credit_note_details: {
    "credit note#": "creditNoteNumber",
    "credit note date": "date",
    "credit note amount": "creditNoteAmount",
    "customer name": "customerName",
    "balance amount": "balanceAmount",
    balance: "balanceAmount",
    amount: "creditNoteAmount",
    status: "status",
  },
  payments_received: {
    "payment#": "paymentNumber",
    "payment date": "date",
    "customer name": "customerName",
    "payment amount": "amount",
    "payment method": "paymentMethod",
    status: "status",
  },
  payments_made: {
    "payment#": "paymentNumber",
    "payment date": "date",
    "vendor name": "vendorName",
    "payment amount": "amount",
    "payment method": "paymentMethod",
    "payment reference": "paymentReference",
  },
  purchase_order_details: {
    "po#": "purchaseOrderNumber",
    "po date": "date",
    "expected date": "expectedDate",
    "vendor name": "vendorName",
    "po amount": "total",
    amount: "total",
    status: "status",
  },
  vendor_credit_details: {
    "credit#": "vendorCreditNumber",
    "credit date": "date",
    "vendor name": "vendorName",
    "credit amount": "total",
    balance: "balance",
    status: "status",
  },
  ap_aging_details: {
    "bill#": "transactionNumber",
    "bill date": "date",
    "vendor name": "vendorName",
    amount: "amount",
    "balance due": "balanceDue",
    bucket: "bucket",
    age: "age",
    status: "status",
  },
  project_summary: {
    "project name": "projectName",
    "customer name": "customerName",
    "project budget": "budgetAmount",
    "logged hours": "loggedHours",
    "actual revenue": "actualRevenue",
    performance: "performance",
    status: "status",
  },
  timesheet_details: {
    date: "date",
    "project name": "projectName",
    task: "task",
    staff: "staff",
    notes: "notes",
    "logged hours": "loggedHours",
    status: "status",
    "billing amount": "billingAmount",
    "customer name": "customerName",
  },
  account_transactions: {
    date: "date",
    "transaction type": "transactionType",
    "reference#": "referenceNumber",
    account: "account",
    debit: "debit",
    credit: "credit",
    balance: "balance",
  },
};

const normalizeLookupKey = (value: any): string =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

const resolveCustomSourceReportKey = (customReport: any): string | null => {
  const explicitKey = String(
    customReport?.general?.sourceReportKey ||
      customReport?.general?.baseReportKey ||
      customReport?.sourceReportKey ||
      customReport?.baseReportKey ||
      "",
  ).trim();
  if (explicitKey && getSystemReportByKey(explicitKey)) {
    return explicitKey;
  }

  const parentModule = String(customReport?.modules?.[0]?.parent || "").trim().toLowerCase();
  if (parentModule && CUSTOM_MODULE_SOURCE_REPORT_KEYS[parentModule]) {
    const mapped = CUSTOM_MODULE_SOURCE_REPORT_KEYS[parentModule];
    if (getSystemReportByKey(mapped)) {
      return mapped;
    }
  }

  return null;
};

const resolveCustomColumnKey = (sourceReportKey: string, requestedColumn: string, sampleRow?: Record<string, any>): string => {
  const normalizedLabel = normalizeLookupKey(requestedColumn);
  const aliasMap = CUSTOM_REPORT_COLUMN_ALIASES[sourceReportKey] || {};
  const directAlias = aliasMap[String(requestedColumn || "").trim().toLowerCase()] || aliasMap[normalizedLabel];
  if (directAlias) return directAlias;

  if (sampleRow && typeof sampleRow === "object") {
    if (Object.prototype.hasOwnProperty.call(sampleRow, requestedColumn)) {
      return requestedColumn;
    }

    const exactCaseInsensitive = Object.keys(sampleRow).find((key) => key.toLowerCase() === String(requestedColumn || "").trim().toLowerCase());
    if (exactCaseInsensitive) return exactCaseInsensitive;

    const normalizedMatch = Object.keys(sampleRow).find((key) => normalizeLookupKey(key) === normalizedLabel);
    if (normalizedMatch) return normalizedMatch;
  }

  return requestedColumn;
};

const parseVisibility = (shareWith?: string): "only_me" | "selected" | "everyone" => {
  const normalized = String(shareWith || "").trim().toLowerCase();
  if (normalized === "everyone") return "everyone";
  if (normalized.includes("selected")) return "selected";
  return "only_me";
};

const normalizePermission = (permission?: string): "view_only" | "view_export" | "view_export_schedule" => {
  const normalized = String(permission || "").trim().toLowerCase();
  if (normalized.includes("schedule")) return "view_export_schedule";
  if (normalized.includes("export")) return "view_export";
  return "view_only";
};

const parseSharePayload = (body: any) => {
  const sharedUsers = Array.isArray(body.sharedUsers)
    ? body.sharedUsers
        .filter((entry: any) => entry && (entry.userId || entry.id))
        .map((entry: any) => ({
          userId: entry.userId || entry.id,
          permission: normalizePermission(entry.permission),
          skipModuleAccess: Boolean(entry.skipModuleAccess),
        }))
    : [];

  const sharedRoles = Array.isArray(body.sharedRoles)
    ? body.sharedRoles
        .filter((entry: any) => entry && (entry.roleId || entry.roleName || entry.name))
        .map((entry: any) => ({
          roleId: entry.roleId || undefined,
          roleName: entry.roleName || entry.name || undefined,
          permission: normalizePermission(entry.permission),
        }))
    : [];

  return { sharedUsers, sharedRoles };
};

const canAccessCustomReport = (customReport: any, user: AuthRequest["user"]): boolean => {
  if (!user) return false;

  const userId = String(user.userId);
  const role = String(user.role || "").toLowerCase();

  if (String(customReport.createdBy) === userId) return true;
  if (String(customReport.visibility) === "everyone") return true;

  if (String(customReport.visibility) === "selected") {
    const sharedUsers = Array.isArray(customReport.sharedUsers) ? customReport.sharedUsers : [];
    const sharedRoles = Array.isArray(customReport.sharedRoles) ? customReport.sharedRoles : [];

    const hasUserAccess = sharedUsers.some((entry: any) => String(entry.userId) === userId);
    const hasRoleAccess = sharedRoles.some((entry: any) => {
      const roleName = String(entry.roleName || "").toLowerCase();
      const roleId = String(entry.roleId || "").toLowerCase();
      return roleName === role || roleId === role;
    });

    return hasUserAccess || hasRoleAccess;
  }

  return false;
};

const mapCustomReportToListItem = (customReport: any): any => {
  const reportId = `custom-${String(customReport._id)}`;
  return {
    id: reportId,
    key: reportId,
    name: customReport.name,
    category: "Custom Reports",
    reportType: "custom",
    supportsChart: true,
    supportsSchedule: true,
    supportsShare: true,
    supportsExport: true,
    customizable: true,
    createdBy: String(customReport.createdBy),
    createdAt: customReport.createdAt,
    updatedAt: customReport.updatedAt,
    lastVisited: customReport.lastRunAt || null,
  };
};

const calculateNextRunAt = (
  frequency: string,
  dayOfWeek: number | undefined,
  dayOfMonth: number | undefined,
  monthOfYear: number | undefined,
  time: string | undefined
): Date => {
  const now = new Date();
  const [hourStr, minuteStr] = String(time || "09:00").split(":");
  const targetHour = Number(hourStr) || 9;
  const targetMinute = Number(minuteStr) || 0;

  const next = new Date(now);
  next.setSeconds(0, 0);
  next.setHours(targetHour, targetMinute, 0, 0);

  const normalizedFrequency = String(frequency || "weekly").toLowerCase();

  if (normalizedFrequency === "weekly") {
    const target = Number.isFinite(dayOfWeek as number) ? Number(dayOfWeek) : 0;
    const current = next.getDay();
    let addDays = (target - current + 7) % 7;
    if (addDays === 0 && next <= now) addDays = 7;
    next.setDate(next.getDate() + addDays);
    return next;
  }

  if (normalizedFrequency === "monthly") {
    const targetDay = Number.isFinite(dayOfMonth as number) ? Number(dayOfMonth) : 1;
    next.setDate(Math.min(Math.max(targetDay, 1), 28));
    if (next <= now) {
      next.setMonth(next.getMonth() + 1);
      next.setDate(Math.min(Math.max(targetDay, 1), 28));
    }
    return next;
  }

  if (normalizedFrequency === "quarterly") {
    const targetDay = Number.isFinite(dayOfMonth as number) ? Number(dayOfMonth) : 1;
    next.setDate(Math.min(Math.max(targetDay, 1), 28));
    if (next <= now) {
      next.setMonth(next.getMonth() + 3);
      next.setDate(Math.min(Math.max(targetDay, 1), 28));
    }
    return next;
  }

  const targetMonth = Number.isFinite(monthOfYear as number) ? Number(monthOfYear) : 1;
  const targetDay = Number.isFinite(dayOfMonth as number) ? Number(dayOfMonth) : 1;
  next.setMonth(Math.min(Math.max(targetMonth - 1, 0), 11), Math.min(Math.max(targetDay, 1), 28));
  if (next <= now) next.setFullYear(next.getFullYear() + 1);
  return next;
};

const ensureUserContext = (req: AuthRequest, res: Response): boolean => {
  if (!req.user?.organizationId || !req.user?.userId) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return false;
  }
  return true;
};

const resolveSystemCatalogItems = () =>
  SYSTEM_REPORTS.map((report) => ({
    ...report,
    id: report.key,
    key: report.key,
    createdBy: "System Generated",
    lastVisited: null,
  }));

export const getReports = async (req: AuthRequest, res: Response): Promise<void> => {
  return getReportsCatalog(req, res);
};

export const getReportsCatalog = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!ensureUserContext(req, res)) return;

    const { search = "", category = "", filter = "home" } = req.query as any;
    const orgId = req.user!.organizationId;

    const [customReports, schedules, shares] = await Promise.all([
      CustomReport.find({ organization: toObjectId(orgId), isArchived: { $ne: true } }).lean(),
      ReportSchedule.find({ organization: toObjectId(orgId), status: "active" }).lean(),
      ReportShare.find({ organization: toObjectId(orgId) }).lean(),
    ]);

    const systemItems = resolveSystemCatalogItems();
    const customItems = customReports
      .filter((customReport: any) => canAccessCustomReport(customReport, req.user))
      .map((customReport: any) => mapCustomReportToListItem(customReport));

    const allItems = [...systemItems, ...customItems];
    const lowerSearch = String(search || "").trim().toLowerCase();
    const selectedCategory = String(category || "").trim();
    const selectedFilter = String(filter || "home").trim().toLowerCase();

    const filteredItems = allItems.filter((item: any) => {
      if (selectedCategory && selectedCategory !== "all" && item.category !== selectedCategory) return false;

      if (lowerSearch) {
        const haystack = `${item.name} ${item.category} ${item.createdBy || ""}`.toLowerCase();
        if (!haystack.includes(lowerSearch)) return false;
      }

      if (selectedFilter === "scheduled") {
        return schedules.some((schedule: any) => schedule.reportKey === item.key || schedule.reportKey === item.id);
      }

      if (selectedFilter === "shared") {
        if (item.reportType === "system") return shares.some((share: any) => share.reportKey === item.key);
        return item.createdBy !== req.user!.userId;
      }

      if (selectedFilter === "my") {
        return item.reportType === "custom" && String(item.createdBy) === String(req.user!.userId);
      }

      return true;
    });

    const categoryCounts = REPORT_CATEGORIES.map((categoryDefinition) => ({
      id: categoryDefinition.key,
      label: categoryDefinition.name,
      count: filteredItems.filter((item: any) => item.category === categoryDefinition.name).length,
    }));

    const customCount = filteredItems.filter((item: any) => item.category === "Custom Reports").length;
    categoryCounts.push({ id: "custom_reports", label: "Custom Reports", count: customCount });

    res.json({
      success: true,
      data: {
        homeFilters: HOME_FILTERS,
        categories: categoryCounts,
        reports: filteredItems,
        totals: {
          all: filteredItems.length,
          custom: customItems.length,
          system: systemItems.length,
        },
      },
    });
  } catch (error: any) {
    console.error("[REPORTS] Error fetching catalog:", error);
    res.status(500).json({ success: false, message: "Error fetching reports catalog", error: error.message });
  }
};
export const getReportByKey = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!ensureUserContext(req, res)) return;

    const reportKey = normalizeReportKey(req.params.reportKey);
    const orgId = req.user!.organizationId;

    if (isCustomReportKey(reportKey)) {
      const customId = extractCustomReportId(reportKey);
      if (!customId || !isValidObjectId(customId)) {
        res.status(400).json({ success: false, message: "Invalid custom report key" });
        return;
      }

      const customReport = await CustomReport.findOne({ _id: toObjectId(customId), organization: toObjectId(orgId), isArchived: { $ne: true } }).lean();
      if (!customReport) {
        res.status(404).json({ success: false, message: "Custom report not found" });
        return;
      }

      if (!canAccessCustomReport(customReport, req.user)) {
        res.status(403).json({ success: false, message: "Access denied" });
        return;
      }

      const schedulesCount = await ReportSchedule.countDocuments({ organization: toObjectId(orgId), reportKey });

      res.json({
        success: true,
        data: {
          ...mapCustomReportToListItem(customReport),
          config: customReport,
          schedulesCount,
        },
      });
      return;
    }

    const reportDefinition = getSystemReportByKey(reportKey);
    if (!reportDefinition) {
      res.status(404).json({ success: false, message: "Report not found" });
      return;
    }

    const [share, schedulesCount] = await Promise.all([
      ReportShare.findOne({ organization: toObjectId(orgId), reportKey }).lean(),
      ReportSchedule.countDocuments({ organization: toObjectId(orgId), reportKey }),
    ]);

    res.json({
      success: true,
      data: {
        ...reportDefinition,
        id: reportDefinition.key,
        key: reportDefinition.key,
        createdBy: "System Generated",
        share: share || null,
        schedulesCount,
      },
    });
  } catch (error: any) {
    console.error("[REPORTS] Error fetching report:", error);
    res.status(500).json({ success: false, message: "Error fetching report", error: error.message });
  }
};

export const runReportByKey = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!ensureUserContext(req, res)) return;

    const reportKey = normalizeReportKey(req.params.reportKey);
    const orgId = req.user!.organizationId;

    let options: any = {
      organizationId: orgId,
      reportKey,
      ...req.body,
    };

    if (isCustomReportKey(reportKey)) {
      const customId = extractCustomReportId(reportKey);
      if (!customId || !isValidObjectId(customId)) {
        res.status(400).json({ success: false, message: "Invalid custom report key" });
        return;
      }

      const customReport = await CustomReport.findOne({ _id: toObjectId(customId), organization: toObjectId(orgId), isArchived: { $ne: true } });
      if (!customReport) {
        res.status(404).json({ success: false, message: "Custom report not found" });
        return;
      }

      if (!canAccessCustomReport(customReport.toObject(), req.user)) {
        res.status(403).json({ success: false, message: "Access denied" });
        return;
      }

      const mappedKey = resolveCustomSourceReportKey(customReport.toObject());
      if (!mappedKey) {
        res.status(400).json({
          success: false,
          message: "Custom report source report is not configured or supported",
        });
        return;
      }

      options = {
        organizationId: orgId,
        reportKey: mappedKey,
        dateRange: req.body?.dateRange || customReport.general?.dateRange,
        startDate: req.body?.startDate || customReport.general?.startDate,
        endDate: req.body?.endDate || customReport.general?.endDate,
        reportBasis: req.body?.reportBasis || customReport.general?.reportBasis || "accrual",
        reportBy: req.body?.reportBy || customReport.general?.reportBy,
        ratioName: req.body?.ratioName,
      };

      const result = await runSystemReport(options);

      const selectedColumns = Array.isArray(customReport.columns) && customReport.columns.length > 0 ? customReport.columns : result.columns;
      const sampleRow = (Array.isArray(result.rows) ? result.rows : []).find((row: any) => row && typeof row === "object") || {};
      const columnKeyMap: Record<string, string> = {};
      selectedColumns.forEach((columnName: string) => {
        columnKeyMap[columnName] = resolveCustomColumnKey(mappedKey, columnName, sampleRow);
      });

      const filteredRows = (Array.isArray(result.rows) ? result.rows : []).map((row: any) => {
        const picked: Record<string, any> = {};
        selectedColumns.forEach((columnName: string) => {
          const resolvedKey = columnKeyMap[columnName];
          if (row[resolvedKey] !== undefined) {
            picked[columnName] = row[resolvedKey];
            return;
          }

          const fallbackKey = Object.keys(row).find((key) => normalizeLookupKey(key) === normalizeLookupKey(columnName));
          if (fallbackKey) {
            picked[columnName] = row[fallbackKey];
            return;
          }

          picked[columnName] = null;
        });
        return picked;
      });

      customReport.lastRunAt = new Date();
      await customReport.save();

      res.json({
        success: true,
        data: {
          ...result,
          reportKey,
          reportName: customReport.name,
          columns: selectedColumns,
          rows: filteredRows,
          isCustomReport: true,
          sourceReportKey: mappedKey,
        },
      });
      return;
    }

    const reportDefinition = getSystemReportByKey(reportKey);
    if (!reportDefinition) {
      res.status(404).json({ success: false, message: "Report not found" });
      return;
    }

    const result = await runSystemReport(options);
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error("[REPORTS] Error running report:", error);
    res.status(500).json({ success: false, message: "Error running report", error: error.message });
  }
};

export const getReportLayout = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!ensureUserContext(req, res)) return;

    const organization = await Organization.findById(req.user!.organizationId).select("settings").lean();
    const layout = organization?.settings?.reportLayout || DEFAULT_LAYOUT;

    res.json({ success: true, data: layout });
  } catch (error: any) {
    console.error("[REPORTS] Error fetching report layout:", error);
    res.status(500).json({ success: false, message: "Error fetching report layout", error: error.message });
  }
};

export const updateReportLayout = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!ensureUserContext(req, res)) return;

    const payload = req.body || {};

    await Organization.findByIdAndUpdate(req.user!.organizationId, {
      $set: {
        "settings.reportLayout": {
          ...DEFAULT_LAYOUT,
          ...payload,
          margins: { ...DEFAULT_LAYOUT.margins, ...(payload.margins || {}) },
          details: { ...DEFAULT_LAYOUT.details, ...(payload.details || {}) },
        },
      },
    });

    res.json({ success: true, message: "Report layout updated" });
  } catch (error: any) {
    console.error("[REPORTS] Error updating report layout:", error);
    res.status(500).json({ success: false, message: "Error updating report layout", error: error.message });
  }
};

export const getReportSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!ensureUserContext(req, res)) return;

    const organization = await Organization.findById(req.user!.organizationId).select("settings").lean();
    const sendWeeklySummary = Boolean(organization?.settings?.reportSettings?.sendWeeklySummary);

    res.json({ success: true, data: { sendWeeklySummary } });
  } catch (error: any) {
    console.error("[REPORTS] Error fetching report settings:", error);
    res.status(500).json({ success: false, message: "Error fetching report settings", error: error.message });
  }
};

export const updateReportSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!ensureUserContext(req, res)) return;

    await Organization.findByIdAndUpdate(req.user!.organizationId, {
      $set: { "settings.reportSettings.sendWeeklySummary": Boolean(req.body?.sendWeeklySummary) },
    });

    res.json({ success: true, message: "Report settings updated" });
  } catch (error: any) {
    console.error("[REPORTS] Error updating report settings:", error);
    res.status(500).json({ success: false, message: "Error updating report settings", error: error.message });
  }
};

export const getCustomReports = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!ensureUserContext(req, res)) return;

    const reports = await CustomReport.find({ organization: toObjectId(req.user!.organizationId), isArchived: { $ne: true } }).sort({ createdAt: -1 }).lean();
    const accessible = reports.filter((report: any) => canAccessCustomReport(report, req.user));

    res.json({ success: true, data: accessible.map((report: any) => mapCustomReportToListItem(report)) });
  } catch (error: any) {
    console.error("[REPORTS] Error fetching custom reports:", error);
    res.status(500).json({ success: false, message: "Error fetching custom reports", error: error.message });
  }
};

export const createCustomReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!ensureUserContext(req, res)) return;

    const { sharedUsers, sharedRoles } = parseSharePayload(req.body || {});

    const customReport = await CustomReport.create({
      organization: toObjectId(req.user!.organizationId),
      name: String(req.body?.name || req.body?.reportName || "Untitled Custom Report").trim(),
      exportName: String(req.body?.exportName || req.body?.name || req.body?.reportName || "Untitled Custom Report").trim(),
      description: String(req.body?.description || "").trim(),
      modules: Array.isArray(req.body?.modules) ? req.body.modules : [],
      general: {
        dateRange: req.body?.dateRange,
        startDate: req.body?.startDate,
        endDate: req.body?.endDate,
        reportBasis: req.body?.reportBasis,
        groupBy: req.body?.groupBy,
        reportBy: req.body?.reportBy,
        filters: Array.isArray(req.body?.filters) ? req.body.filters : [],
        sourceReportKey: resolveCustomSourceReportKey(req.body || {}),
      },
      columns: Array.isArray(req.body?.columns || req.body?.selectedCols) ? req.body.columns || req.body.selectedCols : [],
      layout: req.body?.layout || {},
      visibility: parseVisibility(req.body?.shareWith),
      sharedUsers,
      sharedRoles,
      createdBy: toObjectId(req.user!.userId),
      updatedBy: toObjectId(req.user!.userId),
    });

    res.status(201).json({
      success: true,
      message: "Custom report created",
      data: {
        ...mapCustomReportToListItem(customReport.toObject()),
        config: customReport,
      },
    });
  } catch (error: any) {
    console.error("[REPORTS] Error creating custom report:", error);
    res.status(500).json({ success: false, message: "Error creating custom report", error: error.message });
  }
};
export const updateCustomReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!ensureUserContext(req, res)) return;

    const customId = req.params.id;
    if (!isValidObjectId(customId)) {
      res.status(400).json({ success: false, message: "Invalid custom report ID" });
      return;
    }

    const customReport = await CustomReport.findOne({ _id: toObjectId(customId), organization: toObjectId(req.user!.organizationId), isArchived: { $ne: true } });
    if (!customReport) {
      res.status(404).json({ success: false, message: "Custom report not found" });
      return;
    }

    if (String(customReport.createdBy) !== String(req.user!.userId)) {
      res.status(403).json({ success: false, message: "Only the report owner can update this report" });
      return;
    }

    const { sharedUsers, sharedRoles } = parseSharePayload(req.body || {});

    if (req.body?.name !== undefined) customReport.name = String(req.body.name).trim();
    if (req.body?.exportName !== undefined) customReport.exportName = String(req.body.exportName).trim();
    if (req.body?.description !== undefined) customReport.description = String(req.body.description).trim();
    if (req.body?.modules !== undefined) customReport.modules = Array.isArray(req.body.modules) ? req.body.modules : [];
    if (req.body?.general !== undefined) {
      const nextGeneral: any = {
        ...(customReport.general || {}),
        ...req.body.general,
      };
      if (!nextGeneral.sourceReportKey) {
        nextGeneral.sourceReportKey = resolveCustomSourceReportKey(customReport.toObject());
      }
      customReport.general = nextGeneral;
    }
    if (req.body?.columns !== undefined) customReport.columns = Array.isArray(req.body.columns) ? req.body.columns : [];
    if (req.body?.layout !== undefined) customReport.layout = req.body.layout || {};
    if (req.body?.shareWith !== undefined) customReport.visibility = parseVisibility(req.body.shareWith);
    if (Array.isArray(req.body?.sharedUsers)) customReport.sharedUsers = sharedUsers as any;
    if (Array.isArray(req.body?.sharedRoles)) customReport.sharedRoles = sharedRoles as any;

    customReport.updatedBy = toObjectId(req.user!.userId);
    await customReport.save();

    res.json({ success: true, message: "Custom report updated", data: customReport });
  } catch (error: any) {
    console.error("[REPORTS] Error updating custom report:", error);
    res.status(500).json({ success: false, message: "Error updating custom report", error: error.message });
  }
};

export const deleteCustomReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!ensureUserContext(req, res)) return;

    const customId = req.params.id;
    if (!isValidObjectId(customId)) {
      res.status(400).json({ success: false, message: "Invalid custom report ID" });
      return;
    }

    const customReport = await CustomReport.findOne({ _id: toObjectId(customId), organization: toObjectId(req.user!.organizationId), isArchived: { $ne: true } });
    if (!customReport) {
      res.status(404).json({ success: false, message: "Custom report not found" });
      return;
    }

    if (String(customReport.createdBy) !== String(req.user!.userId)) {
      res.status(403).json({ success: false, message: "Only the report owner can delete this report" });
      return;
    }

    customReport.isArchived = true;
    customReport.updatedBy = toObjectId(req.user!.userId);
    await customReport.save();

    await Promise.all([
      ReportSchedule.deleteMany({ organization: toObjectId(req.user!.organizationId), customReportId: toObjectId(customId) }),
      ReportShare.deleteMany({ organization: toObjectId(req.user!.organizationId), customReportId: toObjectId(customId) }),
    ]);

    res.json({ success: true, message: "Custom report deleted" });
  } catch (error: any) {
    console.error("[REPORTS] Error deleting custom report:", error);
    res.status(500).json({ success: false, message: "Error deleting custom report", error: error.message });
  }
};

export const getReportSchedules = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!ensureUserContext(req, res)) return;

    const query: any = { organization: toObjectId(req.user!.organizationId) };
    if (req.query.status) query.status = String(req.query.status);
    if (req.query.reportKey) query.reportKey = String(req.query.reportKey);

    const schedules = await ReportSchedule.find(query).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: schedules });
  } catch (error: any) {
    console.error("[REPORTS] Error fetching schedules:", error);
    res.status(500).json({ success: false, message: "Error fetching report schedules", error: error.message });
  }
};

export const createReportSchedule = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!ensureUserContext(req, res)) return;

    const reportKey = normalizeReportKey(req.body?.reportKey);
    if (!reportKey) {
      res.status(400).json({ success: false, message: "Report key is required" });
      return;
    }

    let reportType: "system" | "custom" = "system";
    let reportName = "Report";
    let customReportId: mongoose.Types.ObjectId | undefined;

    if (isCustomReportKey(reportKey)) {
      const customId = extractCustomReportId(reportKey);
      if (!customId || !isValidObjectId(customId)) {
        res.status(400).json({ success: false, message: "Invalid custom report key" });
        return;
      }

      const customReport = await CustomReport.findOne({ _id: toObjectId(customId), organization: toObjectId(req.user!.organizationId), isArchived: { $ne: true } });
      if (!customReport) {
        res.status(404).json({ success: false, message: "Custom report not found" });
        return;
      }

      if (!canAccessCustomReport(customReport.toObject(), req.user)) {
        res.status(403).json({ success: false, message: "Access denied" });
        return;
      }

      reportType = "custom";
      reportName = customReport.name;
      customReportId = customReport._id as any;
    } else {
      const definition = getSystemReportByKey(reportKey);
      if (!definition) {
        res.status(404).json({ success: false, message: "Report not found" });
        return;
      }
      reportName = definition.name;
    }

    const recipients = Array.isArray(req.body?.recipients) ? req.body.recipients : [];
    const normalizedRecipients = recipients
      .filter((entry: any) => entry && (entry.email || entry.userId))
      .map((entry: any) => ({
        userId: entry.userId || undefined,
        email: String(entry.email || req.user!.email || "").trim().toLowerCase(),
      }))
      .filter((entry: any) => Boolean(entry.email));

    if (normalizedRecipients.length === 0 && req.user!.email) {
      normalizedRecipients.push({ userId: toObjectId(req.user!.userId), email: req.user!.email });
    }

    const frequency = String(req.body?.frequency || "weekly").toLowerCase();
    const nextRunAt = calculateNextRunAt(frequency, req.body?.dayOfWeek, req.body?.dayOfMonth, req.body?.monthOfYear, req.body?.time);

    const schedule = await ReportSchedule.create({
      organization: toObjectId(req.user!.organizationId),
      reportKey,
      reportName,
      reportType,
      customReportId,
      frequency,
      dayOfWeek: req.body?.dayOfWeek,
      dayOfMonth: req.body?.dayOfMonth,
      monthOfYear: req.body?.monthOfYear,
      time: req.body?.time || "09:00",
      timezone: req.body?.timezone || "UTC",
      recipients: normalizedRecipients,
      format: String(req.body?.format || "pdf").toLowerCase(),
      status: req.body?.status === "inactive" ? "inactive" : "active",
      nextRunAt,
      createdBy: toObjectId(req.user!.userId),
      updatedBy: toObjectId(req.user!.userId),
    });

    res.status(201).json({ success: true, message: "Report schedule created", data: schedule });
  } catch (error: any) {
    console.error("[REPORTS] Error creating schedule:", error);
    res.status(500).json({ success: false, message: "Error creating report schedule", error: error.message });
  }
};

export const updateReportSchedule = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!ensureUserContext(req, res)) return;

    const scheduleId = req.params.id;
    if (!isValidObjectId(scheduleId)) {
      res.status(400).json({ success: false, message: "Invalid schedule ID" });
      return;
    }

    const schedule = await ReportSchedule.findOne({ _id: toObjectId(scheduleId), organization: toObjectId(req.user!.organizationId) });
    if (!schedule) {
      res.status(404).json({ success: false, message: "Schedule not found" });
      return;
    }

    const updatableFields = ["frequency", "dayOfWeek", "dayOfMonth", "monthOfYear", "time", "timezone", "format", "status"];
    updatableFields.forEach((field) => {
      if (req.body?.[field] !== undefined) (schedule as any)[field] = req.body[field];
    });

    if (Array.isArray(req.body?.recipients)) {
      schedule.recipients = req.body.recipients
        .filter((entry: any) => entry && (entry.email || entry.userId))
        .map((entry: any) => ({ userId: entry.userId || undefined, email: String(entry.email || req.user!.email || "").trim().toLowerCase() })) as any;
    }

    schedule.nextRunAt = calculateNextRunAt(String(schedule.frequency), schedule.dayOfWeek, schedule.dayOfMonth, schedule.monthOfYear, schedule.time);
    schedule.updatedBy = toObjectId(req.user!.userId);
    await schedule.save();

    res.json({ success: true, message: "Report schedule updated", data: schedule });
  } catch (error: any) {
    console.error("[REPORTS] Error updating schedule:", error);
    res.status(500).json({ success: false, message: "Error updating report schedule", error: error.message });
  }
};

export const toggleReportSchedule = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!ensureUserContext(req, res)) return;

    const scheduleId = req.params.id;
    if (!isValidObjectId(scheduleId)) {
      res.status(400).json({ success: false, message: "Invalid schedule ID" });
      return;
    }

    const schedule = await ReportSchedule.findOne({ _id: toObjectId(scheduleId), organization: toObjectId(req.user!.organizationId) });
    if (!schedule) {
      res.status(404).json({ success: false, message: "Schedule not found" });
      return;
    }

    schedule.status = schedule.status === "active" ? "inactive" : "active";
    schedule.updatedBy = toObjectId(req.user!.userId);
    await schedule.save();

    res.json({ success: true, message: `Schedule ${schedule.status}`, data: schedule });
  } catch (error: any) {
    console.error("[REPORTS] Error toggling schedule:", error);
    res.status(500).json({ success: false, message: "Error toggling report schedule", error: error.message });
  }
};

export const deleteReportSchedule = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!ensureUserContext(req, res)) return;

    const scheduleId = req.params.id;
    if (!isValidObjectId(scheduleId)) {
      res.status(400).json({ success: false, message: "Invalid schedule ID" });
      return;
    }

    const result = await ReportSchedule.deleteOne({ _id: toObjectId(scheduleId), organization: toObjectId(req.user!.organizationId) });
    if (!result.deletedCount) {
      res.status(404).json({ success: false, message: "Schedule not found" });
      return;
    }

    res.json({ success: true, message: "Report schedule deleted" });
  } catch (error: any) {
    console.error("[REPORTS] Error deleting schedule:", error);
    res.status(500).json({ success: false, message: "Error deleting report schedule", error: error.message });
  }
};

export const getReportShare = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!ensureUserContext(req, res)) return;

    const reportKey = normalizeReportKey(req.params.reportKey);
    const orgObjectId = toObjectId(req.user!.organizationId);

    if (isCustomReportKey(reportKey)) {
      const customId = extractCustomReportId(reportKey);
      if (!customId || !isValidObjectId(customId)) {
        res.status(400).json({ success: false, message: "Invalid custom report key" });
        return;
      }

      const customReport = await CustomReport.findOne({ _id: toObjectId(customId), organization: orgObjectId, isArchived: { $ne: true } }).lean();
      if (!customReport) {
        res.status(404).json({ success: false, message: "Custom report not found" });
        return;
      }

      if (!canAccessCustomReport(customReport, req.user)) {
        res.status(403).json({ success: false, message: "Access denied" });
        return;
      }

      res.json({
        success: true,
        data: {
          reportKey,
          reportName: customReport.name,
          reportType: "custom",
          visibility: customReport.visibility,
          sharedUsers: customReport.sharedUsers || [],
          sharedRoles: customReport.sharedRoles || [],
        },
      });
      return;
    }

    const definition = getSystemReportByKey(reportKey);
    if (!definition) {
      res.status(404).json({ success: false, message: "Report not found" });
      return;
    }

    const share = await ReportShare.findOne({ organization: orgObjectId, reportKey }).lean();

    res.json({
      success: true,
      data:
        share || {
          reportKey,
          reportName: definition.name,
          reportType: "system",
          sharedUsers: [],
          sharedRoles: [],
        },
    });
  } catch (error: any) {
    console.error("[REPORTS] Error fetching report share:", error);
    res.status(500).json({ success: false, message: "Error fetching report share", error: error.message });
  }
};

export const updateReportShare = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!ensureUserContext(req, res)) return;

    const reportKey = normalizeReportKey(req.params.reportKey);
    const orgObjectId = toObjectId(req.user!.organizationId);
    const { sharedUsers, sharedRoles } = parseSharePayload(req.body || {});

    if (isCustomReportKey(reportKey)) {
      const customId = extractCustomReportId(reportKey);
      if (!customId || !isValidObjectId(customId)) {
        res.status(400).json({ success: false, message: "Invalid custom report key" });
        return;
      }

      const customReport = await CustomReport.findOne({ _id: toObjectId(customId), organization: orgObjectId, isArchived: { $ne: true } });
      if (!customReport) {
        res.status(404).json({ success: false, message: "Custom report not found" });
        return;
      }

      if (String(customReport.createdBy) !== String(req.user!.userId)) {
        res.status(403).json({ success: false, message: "Only report owner can update sharing" });
        return;
      }

      customReport.visibility = parseVisibility(req.body?.shareWith || req.body?.visibility || "selected");
      customReport.sharedUsers = sharedUsers as any;
      customReport.sharedRoles = sharedRoles as any;
      customReport.updatedBy = toObjectId(req.user!.userId);
      await customReport.save();

      res.json({ success: true, message: "Custom report sharing updated", data: customReport });
      return;
    }

    const definition = getSystemReportByKey(reportKey);
    if (!definition) {
      res.status(404).json({ success: false, message: "Report not found" });
      return;
    }

    const share = await ReportShare.findOneAndUpdate(
      { organization: orgObjectId, reportKey },
      {
        $set: {
          reportKey,
          reportName: definition.name,
          reportType: "system",
          sharedUsers,
          sharedRoles,
          updatedBy: toObjectId(req.user!.userId),
        },
      },
      { new: true, upsert: true }
    );

    res.json({ success: true, message: "Report sharing updated", data: share });
  } catch (error: any) {
    console.error("[REPORTS] Error updating share:", error);
    res.status(500).json({ success: false, message: "Error updating report share", error: error.message });
  }
};

export default {
  getReports,
  getReportsCatalog,
  getReportByKey,
  runReportByKey,
  getReportLayout,
  updateReportLayout,
  getReportSettings,
  updateReportSettings,
  getCustomReports,
  createCustomReport,
  updateCustomReport,
  deleteCustomReport,
  getReportSchedules,
  createReportSchedule,
  updateReportSchedule,
  toggleReportSchedule,
  deleteReportSchedule,
  getReportShare,
  updateReportShare,
};
