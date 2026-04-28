/**
 * Purchases Controller
 * Handles Vendors and Bills
 */

import { Request, Response } from "express";
import Vendor from "../models/Vendor.js";
import Bill from "../models/Bill.js";
import Receipt from "../models/Receipt.js";
import PurchaseOrder from "../models/PurchaseOrder.js";
import JournalEntry from "../models/JournalEntry.js";
import ChartOfAccount from "../models/ChartOfAccount.js";
import Item from "../models/Item.js";
import VendorCredit from "../models/VendorCredit.js";
import PaymentMade from "../models/PaymentMade.js";
import RecurringBill from "../models/RecurringBill.js";
import Expense from "../models/Expense.js";
import RecurringExpense from "../models/RecurringExpense.js";
import BankTransaction from "../models/BankTransaction.js";
import Currency from "../models/Currency.js";
import Organization from "../models/Organization.js";
import { updateAccountBalances } from "../utils/accounting.js";
import { sendEmail } from "../services/email.service.js";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import type { AuthRequest } from "../middleware/auth.middleware.js";
import { logRequestTiming, measureRequestStep, recordRequestTiming } from "../utils/requestTiming.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface VendorQuery {
  page?: string;
  limit?: string;
  search?: string;
  status?: string;
  vendorType?: string;
  sortBy?: string;
  sortOrder?: string;
}

const buildOrganizationFilter = (organizationId: string): any => {
  const normalizedOrgId = String(organizationId || "").trim();
  if (!normalizedOrgId) return {};

  if (mongoose.Types.ObjectId.isValid(normalizedOrgId)) {
    return {
      $or: [
        { organization: new mongoose.Types.ObjectId(normalizedOrgId) },
        { organization: normalizedOrgId }
      ]
    };
  }

  return { organization: normalizedOrgId };
};

const toObjectId = (value: string): mongoose.Types.ObjectId | null => {
  const normalized = String(value || "").trim();
  if (!normalized || !mongoose.Types.ObjectId.isValid(normalized)) {
    return null;
  }
  return new mongoose.Types.ObjectId(normalized);
};

const normalizeDuplicateText = (value: unknown): string => {
  return String(value || "").trim().toLowerCase();
};

const normalizePhoneForDuplicateCheck = (value: unknown): string => {
  return String(value || "").replace(/[^\d+]/g, "").trim().toLowerCase();
};

const roundMoney = (value: number): number => {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric)) return 0;
  return Math.round(numeric * 100) / 100;
};

const deriveBillPaymentStatus = (bill: any, balance: number, settledAmount: number): string => {
  const currentStatus = String(bill?.status || "").toLowerCase();
  if (currentStatus === "draft" || currentStatus === "void" || currentStatus === "cancelled") {
    return currentStatus;
  }
  const total = roundMoney(Number(bill?.total || 0));
  if (balance <= 0 && total > 0) {
    return "paid";
  }
  if (settledAmount > 0 && balance > 0) {
    return "partially paid";
  }
  return "open";
};

const hydrateBillBalancesAndStatuses = async (organizationId: string, bills: any[]) => {
  if (!Array.isArray(bills) || bills.length === 0) {
    return [];
  }

  const billIds = bills
    .map((bill: any) => String(bill?._id || bill?.id || "").trim())
    .filter(Boolean)
    .filter((id: string) => mongoose.Types.ObjectId.isValid(id))
    .map((id: string) => new mongoose.Types.ObjectId(id));

  const paidByBillRows = billIds.length > 0
    ? await PaymentMade.aggregate([
        {
          $match: {
            ...buildOrganizationFilter(organizationId),
            "allocations.bill": { $in: billIds },
          },
        },
        { $unwind: "$allocations" },
        { $match: { "allocations.bill": { $in: billIds } } },
        {
          $group: {
            _id: "$allocations.bill",
            totalPaid: { $sum: { $ifNull: ["$allocations.amount", 0] } },
          },
        },
      ])
    : [];

  const paidByBillMap = new Map(
    paidByBillRows.map((row: any) => [String(row._id), roundMoney(Number(row.totalPaid || 0))])
  );

  return bills.map((bill: any) => {
    const billId = String(bill?._id || bill?.id || "").trim();
    const totalPaid = paidByBillMap.get(billId) ?? roundMoney(Number(bill?.paidAmount || 0));
    const vendorCreditsApplied = roundMoney(Number(bill?.vendorCreditsApplied || 0));
    const total = roundMoney(Number(bill?.total || 0));
    const settledAmount = roundMoney(totalPaid + vendorCreditsApplied);
    const computedBalance = roundMoney(Math.max(0, total - settledAmount));

    return {
      ...bill,
      paidAmount: totalPaid,
      vendorCreditsApplied,
      balance: computedBalance,
      balanceDue: computedBalance,
      status: deriveBillPaymentStatus(bill, computedBalance, settledAmount),
    };
  });
};

const buildVendorDuplicateConditions = (vendorData: any): any[] => {
  const conditions: any[] = [];
  const displayName = normalizeDuplicateText(vendorData.displayName || vendorData.name);
  const companyName = normalizeDuplicateText(vendorData.companyName);
  const email = normalizeDuplicateText(vendorData.email);
  const workPhone = normalizePhoneForDuplicateCheck(vendorData.workPhone);
  const mobile = normalizePhoneForDuplicateCheck(vendorData.mobile);

  if (email) {
    conditions.push({ email: { $regex: `^${escapeRegex(email)}$`, $options: "i" } });
  }

  if (displayName) {
    conditions.push({ displayName: { $regex: `^${escapeRegex(displayName)}$`, $options: "i" } });
    conditions.push({ name: { $regex: `^${escapeRegex(displayName)}$`, $options: "i" } });
  }

  if (companyName) {
    conditions.push({ companyName: { $regex: `^${escapeRegex(companyName)}$`, $options: "i" } });
  }

  if (workPhone) {
    conditions.push({ workPhone: { $regex: escapeRegex(workPhone).replace(/\+/g, "\\+").replace(/\d+/g, "\\d[\\d\\s-]*"), $options: "i" } });
  }

  if (mobile) {
    conditions.push({ mobile: { $regex: escapeRegex(mobile).replace(/\+/g, "\\+").replace(/\d+/g, "\\d[\\d\\s-]*"), $options: "i" } });
  }

  return conditions;
};

const findDuplicateVendor = async (
  organizationId: string,
  vendorData: any,
  excludeVendorId?: string
): Promise<any | null> => {
  const duplicateConditions = buildVendorDuplicateConditions(vendorData);
  if (!duplicateConditions.length) return null;

  const organizationFilter = buildOrganizationFilter(String(organizationId));
  const query: any = {
    ...organizationFilter,
    $or: duplicateConditions,
  };

  if (excludeVendorId) {
    const normalizedId = String(excludeVendorId).trim();
    query.$and = [
      {
        $nor: [
          ...(mongoose.Types.ObjectId.isValid(normalizedId) ? [{ _id: new mongoose.Types.ObjectId(normalizedId) }] : []),
          { id: normalizedId },
        ],
      },
    ];
  }

  return Vendor.findOne(query).lean();
};

const BILL_LIST_SELECT = [
  "_id",
  "billNumber",
  "orderNumber",
  "referenceNumber",
  "vendor",
  "vendorName",
  "date",
  "dueDate",
  "items",
  "subtotal",
  "total",
  "currency",
  "status",
  "paymentTerms",
  "terms",
  "locationId",
  "locationName",
  "warehouseLocationId",
  "warehouseLocationName",
  "paidAmount",
  "vendorCreditsApplied",
  "balance",
  "createdAt",
  "updatedAt",
].join(" ");

const BILL_LIST_VENDOR_SELECT = [
  "displayName",
  "name",
  "companyName",
  "billingAddress",
].join(" ");

// Get all vendors
export const getAllVendors = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (mongoose.connection.readyState !== 1) {
      res.status(503).json({
        success: false,
        message: 'Database not connected',
        error: 'MongoDB connection is not established.'
      });
      return;
    }

    if (!req.user || !req.user.organizationId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized - Organization ID required'
      });
      return;
    }

    const {
      page = '1',
      limit = '1000',
      search = '',
      status,
      vendorType,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query as VendorQuery;

    const query: any = {};
    const orgId = req.user.organizationId;

    // Build organization filter
    let orgFilter: any = {};
    if (mongoose.Types.ObjectId.isValid(orgId as string)) {
      try {
        const orgObjectId = new mongoose.Types.ObjectId(orgId as string);
        orgFilter = {
          $or: [
            { organization: orgObjectId },
            { organization: String(orgId) }
          ]
        };
      } catch (conversionError: any) {
        orgFilter = { organization: String(orgId) };
      }
    } else {
      orgFilter = { organization: String(orgId) };
    }

    // Combine filters
    const andConditions: any[] = [orgFilter];

    if (search && search.trim()) {
      andConditions.push({
        $or: [
          { displayName: { $regex: search.trim(), $options: 'i' } },
          { companyName: { $regex: search.trim(), $options: 'i' } },
          { email: { $regex: search.trim(), $options: 'i' } },
          { firstName: { $regex: search.trim(), $options: 'i' } },
          { lastName: { $regex: search.trim(), $options: 'i' } }
        ]
      });
    }

    if (andConditions.length > 1) {
      query.$and = andConditions;
    } else {
      Object.assign(query, orgFilter);
    }

    if (status) query.status = status;
    if (vendorType) query.vendorType = vendorType;

    const validSortFields = ['createdAt', 'updatedAt', 'displayName', 'name', 'email', 'companyName'];
    const safeSortBy = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const sort: any = {};
    sort[safeSortBy] = sortOrder === 'asc' ? 1 : -1;

    const skip = Math.max(0, (parseInt(page) - 1) * parseInt(limit));
    const limitValue = Math.max(1, Math.min(1000, parseInt(limit)));

    const vendors = await Vendor.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limitValue)
      .select('-__v')
      .lean();

    const total = await Vendor.countDocuments(query);

    const responsePayload = {
      success: true,
      data: vendors,
      pagination: {
        page: parseInt(page),
        limit: limitValue,
        total: total,
        pages: Math.ceil(total / limitValue),
      },
    };

    res.json(responsePayload);
  } catch (error) {
    console.error("Error in getAllVendors:", error);
    let errorMessage = "Unknown error";

    if (error instanceof Error) {
      errorMessage = error.message;
    }

    const errorPayload = {
      success: false,
      message: "Error fetching vendors",
      error: errorMessage,
    };

    res.status(500).json(errorPayload);
  }
};

/**
 * Get next vendor number
 * POST /api/vendors/next-number
 */
export const getNextVendorNumber = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.organizationId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { prefix = "VEN-", start = "0001" } = req.body;
    const orgId = req.user.organizationId;

    // Find the highest existing vendor number with this prefix
    const latestVendor = await Vendor.findOne({
      organization: orgId,
      vendorNumber: { $regex: `^${escapeRegex(String(prefix))}` }
    })
    .sort({ vendorNumber: -1 })
    .lean();

    let nextNumber = start;
    if (latestVendor && latestVendor.vendorNumber) {
      const currentNumberStr = latestVendor.vendorNumber.replace(String(prefix), "");
      const currentNumberInt = parseInt(currentNumberStr);
      if (!isNaN(currentNumberInt)) {
        const nextInt = currentNumberInt + 1;
        nextNumber = nextInt.toString().padStart(start.length, "0");
      }
    }

    res.json({
      success: true,
      data: {
        number: `${prefix}${nextNumber}`,
        nextNumber: `${prefix}${nextNumber}`
      }
    });
  } catch (error: any) {
    console.error("Error generating next vendor number:", error);
    res.status(500).json({
      success: false,
      message: "Error generating next vendor number",
      error: error.message
    });
  }
};

// Search vendors
export const searchVendors = async (req: AuthRequest, res: Response): Promise<void> => {
  getAllVendors(req, res);
};

// Get vendor by ID
export const getVendorById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const orgId = req.user.organizationId;

    let vendor = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      vendor = await Vendor.findOne({
        _id: id,
        organization: orgId
      }).lean();
    }

    if (!vendor) {
      vendor = await Vendor.findOne({
        id: id,
        organization: orgId
      }).lean();
    }

    if (!vendor) {
      res.status(404).json({ success: false, message: 'Vendor not found' });
      return;
    }

    res.json({ success: true, data: vendor });
  } catch (error: any) {
    console.error('Error in getVendorById:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching vendor',
      error: error.message
    });
  }
};

// Create vendor
export const createVendor = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    // Mirror the customer flow: always ensure the vendor has a stable identity.
    let displayName: string = String(req.body.displayName || req.body.name || "").trim();
    if (!displayName) {
      const firstName = String(req.body.firstName || "").trim();
      const lastName = String(req.body.lastName || "").trim();
      const companyName = String(req.body.companyName || "").trim();

      if (firstName || lastName) {
        displayName = `${firstName} ${lastName}`.trim();
      } else if (companyName) {
        displayName = companyName;
      } else {
        displayName = "Vendor";
      }
    }

    const vendorData: any = {
      ...req.body,
      displayName,
      name: displayName,
      organization: req.user.organizationId,
    };

    // Remove UI helper fields and undefined values before persisting.
    if (Object.prototype.hasOwnProperty.call(vendorData, "xSocial")) {
      vendorData.xHandle = String(vendorData.xSocial || "").trim();
      delete vendorData.xSocial;
    }

    Object.keys(vendorData).forEach((key) => {
      if (vendorData[key] === undefined) {
        delete vendorData[key];
      }
    });

    if (vendorData.billingAddress && typeof vendorData.billingAddress === "object") {
      vendorData.billingAddress = {
        ...(vendorData.billingAddress || {}),
      };
    }

    if (vendorData.shippingAddress && typeof vendorData.shippingAddress === "object") {
      vendorData.shippingAddress = {
        ...(vendorData.shippingAddress || {}),
      };
    }

    if (Array.isArray(vendorData.contactPersons)) {
      vendorData.contactPersons = vendorData.contactPersons
        .filter((person: any) => person && String(person.firstName || "").trim())
        .map((person: any) => ({
          ...person,
          salutation: String(person.salutation || "").trim(),
          firstName: String(person.firstName || "").trim(),
          lastName: String(person.lastName || "").trim(),
          email: String(person.email || "").trim(),
          workPhone: String(person.workPhone || "").trim(),
          mobile: String(person.mobile || "").trim(),
          designation: String(person.designation || "").trim(),
          department: String(person.department || "").trim(),
          skypeName: String(person.skypeName || "").trim(),
        }));
    }

    const duplicateVendor = await findDuplicateVendor(String(req.user.organizationId), vendorData);
    if (duplicateVendor) {
      res.status(409).json({
        success: false,
        message: "A vendor with the same name, email, or phone already exists",
        data: {
          duplicateVendorId: String(duplicateVendor._id || duplicateVendor.id || ""),
          duplicateVendorName: duplicateVendor.displayName || duplicateVendor.name || duplicateVendor.companyName || "Vendor",
        },
      });
      return;
    }

    const vendor = await Vendor.create(vendorData);
    res.status(201).json({ success: true, message: 'Vendor created successfully', data: vendor });
  } catch (error: any) {
    console.error('Error in createVendor:', error);

    if (error?.name === "ValidationError") {
      res.status(400).json({
        success: false,
        message: "Validation error",
        error: error.message,
        validationErrors: error.errors,
      });
      return;
    }

    if (error?.name === "CastError") {
      res.status(400).json({
        success: false,
        message: "Invalid vendor data",
        error: error.message,
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Error creating vendor',
      error: error.message || 'Unknown error',
    });
  }
};

const escapeRegex = (value: string): string => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

// Update vendor
export const updateVendor = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const organizationFilter = buildOrganizationFilter(String(req.user.organizationId));

    const updateData: any = { ...req.body };
    const normalizedId = String(id || "").trim();
    const rawStatus = typeof updateData.status === "string" ? updateData.status.trim().toLowerCase() : "";

    if (rawStatus) {
      if (rawStatus !== "active" && rawStatus !== "inactive") {
        res.status(400).json({ success: false, message: "Invalid status. Use 'active' or 'inactive'" });
        return;
      }
      updateData.status = rawStatus;
    } else if (typeof updateData.isActive === "boolean") {
      updateData.status = updateData.isActive ? "active" : "inactive";
    }

    if (Object.prototype.hasOwnProperty.call(updateData, "isActive")) delete updateData.isActive;
    if (Object.prototype.hasOwnProperty.call(updateData, "isInactive")) delete updateData.isInactive;
    if (Object.prototype.hasOwnProperty.call(updateData, "_id")) delete updateData._id;
    if (Object.prototype.hasOwnProperty.call(updateData, "id")) delete updateData.id;
    if (Object.prototype.hasOwnProperty.call(updateData, "organization")) delete updateData.organization;

    let existingVendor: any = null;

    if (mongoose.Types.ObjectId.isValid(normalizedId)) {
      existingVendor = await Vendor.findOne({ _id: normalizedId, ...organizationFilter });
    }

    if (!existingVendor) {
      existingVendor = await Vendor.findOne({ id: normalizedId, ...organizationFilter });
    }

    if (!existingVendor) {
      res.status(404).json({ success: false, message: 'Vendor not found' });
      return;
    }

    let displayName = String(updateData.displayName || updateData.name || existingVendor.displayName || existingVendor.name || "").trim();
    if (!displayName) {
      const firstName = String(updateData.firstName ?? existingVendor.firstName ?? "").trim();
      const lastName = String(updateData.lastName ?? existingVendor.lastName ?? "").trim();
      const companyName = String(updateData.companyName ?? existingVendor.companyName ?? "").trim();

      if (firstName || lastName) {
        displayName = `${firstName} ${lastName}`.trim();
      } else if (companyName) {
        displayName = companyName;
      } else {
        displayName = "Vendor";
      }
    }

    updateData.displayName = displayName;
    updateData.name = displayName;

    if (Object.prototype.hasOwnProperty.call(updateData, "xSocial")) {
      updateData.xHandle = String(updateData.xSocial || "").trim();
      delete updateData.xSocial;
    }

    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    if (updateData.billingAddress && typeof updateData.billingAddress === "object") {
      updateData.billingAddress = {
        ...(existingVendor.billingAddress?.toObject?.() || existingVendor.billingAddress || {}),
        ...updateData.billingAddress,
      };
    }

    if (updateData.shippingAddress && typeof updateData.shippingAddress === "object") {
      updateData.shippingAddress = {
        ...(existingVendor.shippingAddress?.toObject?.() || existingVendor.shippingAddress || {}),
        ...updateData.shippingAddress,
      };
    }

    if (Array.isArray(updateData.contactPersons)) {
      updateData.contactPersons = updateData.contactPersons
        .filter((person: any) => person && String(person.firstName || "").trim())
        .map((person: any) => ({
          ...person,
          salutation: String(person.salutation || "").trim(),
          firstName: String(person.firstName || "").trim(),
          lastName: String(person.lastName || "").trim(),
          email: String(person.email || "").trim(),
          workPhone: String(person.workPhone || "").trim(),
          mobile: String(person.mobile || "").trim(),
          designation: String(person.designation || "").trim(),
          department: String(person.department || "").trim(),
          skypeName: String(person.skypeName || "").trim(),
        }));
    }

    const duplicateVendor = await findDuplicateVendor(String(req.user.organizationId), updateData, String(existingVendor._id || existingVendor.id || ""));
    if (duplicateVendor) {
      res.status(409).json({
        success: false,
        message: "A vendor with the same name, email, or phone already exists",
        data: {
          duplicateVendorId: String(duplicateVendor._id || duplicateVendor.id || ""),
          duplicateVendorName: duplicateVendor.displayName || duplicateVendor.name || duplicateVendor.companyName || "Vendor",
        },
      });
      return;
    }

    let vendor = null;

    // Prefer Mongo ObjectId match when possible.
    if (mongoose.Types.ObjectId.isValid(normalizedId)) {
      vendor = await Vendor.findOneAndUpdate(
        { _id: normalizedId, ...organizationFilter },
        updateData,
        { new: true, runValidators: true }
      );
    }

    // Fallback for legacy vendors that use timestamp/string `id`.
    if (!vendor) {
      vendor = await Vendor.findOneAndUpdate(
        { id: normalizedId, ...organizationFilter },
        updateData,
        { new: true, runValidators: true }
      );
    }

    res.json({ success: true, data: vendor });
  } catch (error: any) {
    console.error('Error in updateVendor:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating vendor',
      error: error.message
    });
  }
};

// Delete vendor
export const deleteVendor = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const normalizedId = String(id || "").trim();
    const organizationFilter = buildOrganizationFilter(String(req.user.organizationId));

    let vendor = null;
    if (mongoose.Types.ObjectId.isValid(normalizedId)) {
      vendor = await Vendor.findOneAndDelete({
        _id: normalizedId,
        ...organizationFilter
      });
    }

    if (!vendor) {
      vendor = await Vendor.findOneAndDelete({
        id: normalizedId,
        ...organizationFilter
      });
    }

    if (!vendor) {
      res.status(404).json({ success: false, message: 'Vendor not found' });
      return;
    }

    res.json({ success: true, message: 'Vendor deleted' });
  } catch (error: any) {
    console.error('Error in deleteVendor:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting vendor',
      error: error.message
    });
  }
};

// Bulk delete vendors
export const deleteVendors = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const ids = Array.isArray(req.body.ids)
      ? req.body.ids
      : (Array.isArray(req.body.vendorIds) ? req.body.vendorIds : []);

    if (ids.length === 0) {
      res.status(400).json({ success: false, message: 'Please provide an array of vendor IDs' });
      return;
    }

    const normalizedIds = Array.from(
      new Set(
        ids
          .map((vendorId: any) => String(vendorId || "").trim())
          .filter(Boolean)
      )
    );

    if (normalizedIds.length === 0) {
      res.status(400).json({ success: false, message: 'Please provide valid vendor IDs' });
      return;
    }

    const objectIds = normalizedIds
      .filter((vendorId: string) => mongoose.Types.ObjectId.isValid(vendorId))
      .map((vendorId: string) => new mongoose.Types.ObjectId(vendorId));

    const organizationFilter = buildOrganizationFilter(String(req.user.organizationId));
    const deleteConditions: any[] = [{ id: { $in: normalizedIds } }];
    if (objectIds.length > 0) {
      deleteConditions.push({ _id: { $in: objectIds } });
    }

    const result = await Vendor.deleteMany({
      ...organizationFilter,
      $or: deleteConditions
    });

    res.json({ success: true, deletedCount: result.deletedCount });
  } catch (error: any) {
    console.error('Error in deleteVendors:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting vendors',
      error: error.message
    });
  }
};

// Bulk update vendors
export const bulkUpdateVendors = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const ids = Array.isArray(req.body.ids)
      ? req.body.ids
      : (Array.isArray(req.body.vendorIds) ? req.body.vendorIds : []);
    const updates = req.body.updates || req.body.updateData || {};

    if (ids.length === 0) {
      res.status(400).json({ success: false, message: 'Please provide an array of vendor IDs' });
      return;
    }

    if (!updates || Object.keys(updates).length === 0) {
      res.status(400).json({ success: false, message: 'Please provide update data' });
      return;
    }

    const normalizedUpdates: any = { ...updates };
    const rawStatus = typeof normalizedUpdates.status === "string"
      ? normalizedUpdates.status.trim().toLowerCase()
      : "";

    if (rawStatus) {
      if (rawStatus !== "active" && rawStatus !== "inactive") {
        res.status(400).json({ success: false, message: "Invalid status. Use 'active' or 'inactive'" });
        return;
      }
      normalizedUpdates.status = rawStatus;
    } else if (typeof normalizedUpdates.isActive === "boolean") {
      normalizedUpdates.status = normalizedUpdates.isActive ? "active" : "inactive";
    }

    if (Object.prototype.hasOwnProperty.call(normalizedUpdates, "isActive")) delete normalizedUpdates.isActive;
    if (Object.prototype.hasOwnProperty.call(normalizedUpdates, "isInactive")) delete normalizedUpdates.isInactive;

    const normalizedIds = Array.from(
      new Set(
        ids
          .map((vendorId: any) => String(vendorId || "").trim())
          .filter(Boolean)
      )
    );

    if (normalizedIds.length === 0) {
      res.status(400).json({ success: false, message: 'Please provide valid vendor IDs' });
      return;
    }

    const objectIds = normalizedIds
      .filter((vendorId: string) => mongoose.Types.ObjectId.isValid(vendorId))
      .map((vendorId: string) => new mongoose.Types.ObjectId(vendorId));

    const organizationFilter = buildOrganizationFilter(String(req.user.organizationId));
    const updateConditions: any[] = [{ id: { $in: normalizedIds } }];
    if (objectIds.length > 0) {
      updateConditions.push({ _id: { $in: objectIds } });
    }

    const result = await Vendor.updateMany(
      { ...organizationFilter, $or: updateConditions },
      { $set: normalizedUpdates }
    );

    res.json({ success: true, modifiedCount: result.modifiedCount });
  } catch (error: any) {
    console.error('Error in bulkUpdateVendors:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating vendors',
      error: error.message
    });
  }
};

// Merge vendors
export const mergeVendors = async (req: AuthRequest, res: Response): Promise<void> => {
  const session = await mongoose.startSession();

  try {
    if (!req.user || !req.user.organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const masterVendorId = String(req.body.masterVendorId || req.body.masterId || "").trim();
    const rawSourceIds = Array.isArray(req.body.sourceVendorIds)
      ? req.body.sourceVendorIds
      : (Array.isArray(req.body.sourceIds) ? req.body.sourceIds : []);

    const sourceVendorIds: string[] = Array.from(
      new Set(
        rawSourceIds
          .map((id: any) => String(id || "").trim())
          .filter(Boolean)
          .filter((id: string) => id !== masterVendorId)
      )
    ) as string[];

    if (!masterVendorId) {
      res.status(400).json({ success: false, message: 'masterVendorId is required' });
      return;
    }

    if (sourceVendorIds.length === 0) {
      res.status(400).json({ success: false, message: 'Please provide at least one source vendor to merge' });
      return;
    }

    const allIds: string[] = Array.from(new Set([masterVendorId, ...sourceVendorIds])) as string[];
    const objectIds: mongoose.Types.ObjectId[] = [];

    for (const id of allIds) {
      const parsed = toObjectId(id);
      if (!parsed) {
        res.status(400).json({ success: false, message: `Invalid vendor ID: ${id}` });
        return;
      }
      objectIds.push(parsed);
    }

    const masterObjectId = toObjectId(masterVendorId);
    if (!masterObjectId) {
      res.status(400).json({ success: false, message: 'Invalid master vendor ID' });
      return;
    }

    const sourceObjectIds = sourceVendorIds
      .map((id) => toObjectId(id))
      .filter(Boolean) as mongoose.Types.ObjectId[];

    const organizationFilter = buildOrganizationFilter(String(req.user.organizationId));
    const vendorQuery: any = { _id: { $in: objectIds }, ...organizationFilter };
    const vendors = await Vendor.find(vendorQuery).lean();

    if (vendors.length !== allIds.length) {
      res.status(404).json({
        success: false,
        message: 'One or more vendors were not found in your organization'
      });
      return;
    }

    const vendorMap = new Map<string, any>();
    vendors.forEach((vendor: any) => vendorMap.set(String(vendor._id), vendor));

    const masterVendor = vendorMap.get(String(masterObjectId));
    if (!masterVendor) {
      res.status(404).json({ success: false, message: 'Master vendor not found' });
      return;
    }

    const sourceVendors = sourceObjectIds
      .map((sourceId) => vendorMap.get(String(sourceId)))
      .filter(Boolean);

    const normalizeCurrency = (value: any): string => {
      const raw = String(value || "").trim();
      if (!raw) return "";
      return raw.split(" - ")[0].trim().toUpperCase();
    };

    const allVendorsInMerge = [masterVendor, ...sourceVendors];
    const currencyCodesInMerge = Array.from(
      new Set(
        allVendorsInMerge
          .map((vendor: any) => normalizeCurrency(vendor.currency))
          .filter(Boolean)
      )
    );

    const findLatestRate = (currencyDoc: any): number | null => {
      if (!currencyDoc) return null;
      if (currencyDoc.isBaseCurrency) return 1;

      const rates = Array.isArray(currencyDoc.exchangeRates) ? currencyDoc.exchangeRates : [];
      const latestRateEntry = rates
        .map((entry: any) => ({
          rate: Number(entry?.rate),
          time: new Date(entry?.date || 0).getTime()
        }))
        .filter((entry: any) => Number.isFinite(entry.rate) && entry.rate > 0)
        .sort((a: any, b: any) => b.time - a.time)[0];

      if (!latestRateEntry) return null;
      return Number(latestRateEntry.rate);
    };

    const currencyDocs = currencyCodesInMerge.length > 0
      ? await Currency.find({
          ...organizationFilter
        }).lean()
      : [];

    const currencyDocByCode = new Map<string, any>();
    currencyDocs.forEach((currency: any) => {
      const code = normalizeCurrency(currency.code);
      if (code) currencyDocByCode.set(code, currency);
    });

    let baseCurrencyCode = "";
    const baseCurrencyDoc = currencyDocs.find((currency: any) => Boolean(currency?.isBaseCurrency));
    if (baseCurrencyDoc) {
      baseCurrencyCode = normalizeCurrency(baseCurrencyDoc.code);
    }

    if (!baseCurrencyCode) {
      const fetchedBaseCurrencyDoc = await Currency.findOne({
        ...organizationFilter,
        isBaseCurrency: true
      }).lean();
      baseCurrencyCode = normalizeCurrency(fetchedBaseCurrencyDoc?.code);
    }

    if (!baseCurrencyCode) {
      const organization = await Organization.findOne(organizationFilter)
        .select("currency")
        .lean();
      baseCurrencyCode = normalizeCurrency((organization as any)?.currency);
    }

    const masterCurrency = normalizeCurrency(masterVendor.currency) || baseCurrencyCode || "USD";
    if (!baseCurrencyCode) {
      baseCurrencyCode = masterCurrency;
    }

    const vendorProvidedRates = new Map<string, number>();
    allVendorsInMerge.forEach((vendor: any) => {
      const code = normalizeCurrency(vendor.currency);
      const rate = Number(vendor.exchangeRate);
      if (code && Number.isFinite(rate) && rate > 0 && !vendorProvidedRates.has(code)) {
        vendorProvidedRates.set(code, rate);
      }
    });

    const resolveRateToBase = (currencyCode: string): number | null => {
      const normalizedCode = normalizeCurrency(currencyCode);
      if (!normalizedCode) return null;
      if (normalizedCode === baseCurrencyCode) return 1;

      const latestRate = findLatestRate(currencyDocByCode.get(normalizedCode));
      if (latestRate && latestRate > 0) return latestRate;

      const fallbackRate = vendorProvidedRates.get(normalizedCode);
      if (fallbackRate && fallbackRate > 0) return fallbackRate;

      return null;
    };

    const masterRateToBase = resolveRateToBase(masterCurrency);
    const conversionRateByVendorId = new Map<string, number>();
    const conversionDetails: Array<{
      vendorId: string;
      fromCurrency: string;
      toCurrency: string;
      rateUsed: number;
    }> = [];

    const missingCurrencies = new Set<string>();
    const missingRateVendorIds: string[] = [];

    if (!masterRateToBase) {
      missingCurrencies.add(masterCurrency);
    }

    for (const sourceVendor of sourceVendors) {
      const sourceVendorId = String(sourceVendor._id);
      const sourceCurrency = normalizeCurrency(sourceVendor.currency) || masterCurrency;

      if (sourceCurrency === masterCurrency) {
        conversionRateByVendorId.set(sourceVendorId, 1);
        continue;
      }

      const sourceRateToBase = resolveRateToBase(sourceCurrency);
      if (!sourceRateToBase || !masterRateToBase) {
        missingCurrencies.add(sourceCurrency);
        missingRateVendorIds.push(sourceVendorId);
        continue;
      }

      const rateUsed = sourceRateToBase / masterRateToBase;
      conversionRateByVendorId.set(sourceVendorId, rateUsed);
      conversionDetails.push({
        vendorId: sourceVendorId,
        fromCurrency: sourceCurrency,
        toCurrency: masterCurrency,
        rateUsed: Number(rateUsed.toFixed(8))
      });
    }

    if (missingCurrencies.size > 0) {
      res.status(400).json({
        success: false,
        message: "Exchange rate is missing for one or more currencies. Please add exchange rates and try again.",
        details: {
          baseCurrency: baseCurrencyCode,
          masterCurrency,
          missingCurrencies: Array.from(missingCurrencies),
          missingVendorIds: Array.from(new Set(missingRateVendorIds))
        }
      });
      return;
    }

    const masterName = String(
      masterVendor.displayName || masterVendor.name || masterVendor.companyName || "Vendor"
    ).trim() || "Vendor";
    const sourceNames = sourceVendors
      .map((vendor: any) => String(vendor.displayName || vendor.name || vendor.companyName || "").trim())
      .filter(Boolean);

    const toNumber = (value: any): number => {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    };
    const roundToMoney = (value: number): number => Number(value.toFixed(2));

    const firstNonEmpty = (values: any[]): string =>
      String(values.find((value) => String(value || "").trim()) || "").trim();

    const sourcePayablesInMasterCurrency = sourceVendors.reduce((sum: number, vendor: any) => {
      const rate = conversionRateByVendorId.get(String(vendor._id)) || 1;
      return sum + toNumber(vendor.payables) * rate;
    }, 0);

    const sourceUnusedCreditsInMasterCurrency = sourceVendors.reduce((sum: number, vendor: any) => {
      const rate = conversionRateByVendorId.get(String(vendor._id)) || 1;
      return sum + toNumber(vendor.unusedCredits) * rate;
    }, 0);

    const transferCounts: Record<string, number> = {};
    const trackUpdate = async (key: string, promise: Promise<any>): Promise<void> => {
      const result: any = await promise;
      transferCounts[key] = Number(result?.modifiedCount || result?.nModified || 0);
    };

    const scopedFilter = (filter: any): any => ({ ...filter, ...organizationFilter });

    session.startTransaction();

    await trackUpdate(
      "bills",
      Bill.updateMany(
        scopedFilter({ vendor: { $in: sourceObjectIds } }),
        { $set: { vendor: masterObjectId, vendorName: masterName } },
        { session }
      )
    );
    await trackUpdate(
      "purchaseOrders",
      PurchaseOrder.updateMany(
        scopedFilter({ vendor: { $in: sourceObjectIds } }),
        { $set: { vendor: masterObjectId, vendorName: masterName } },
        { session }
      )
    );
    await trackUpdate(
      "paymentsMade",
      PaymentMade.updateMany(
        scopedFilter({ vendor: { $in: sourceObjectIds } }),
        { $set: { vendor: masterObjectId } },
        { session }
      )
    );
    await trackUpdate(
      "vendorCredits",
      VendorCredit.updateMany(
        scopedFilter({ vendor: { $in: sourceObjectIds } }),
        { $set: { vendor: masterObjectId, vendorName: masterName } },
        { session }
      )
    );
    await trackUpdate(
      "recurringBills",
      RecurringBill.updateMany(
        scopedFilter({ vendor: { $in: sourceObjectIds } }),
        { $set: { vendor: masterObjectId } },
        { session }
      )
    );
    await trackUpdate(
      "expenses",
      Expense.updateMany(
        scopedFilter({ vendor_id: { $in: sourceObjectIds } }),
        { $set: { vendor_id: masterObjectId, vendor_name: masterName } },
        { session }
      )
    );
    await trackUpdate(
      "recurringExpenses",
      RecurringExpense.updateMany(
        scopedFilter({ vendor_id: { $in: sourceObjectIds } }),
        { $set: { vendor_id: masterObjectId, vendor_name: masterName } },
        { session }
      )
    );
    await trackUpdate(
      "bankTransactions",
      BankTransaction.updateMany(
        scopedFilter({ vendorId: { $in: sourceObjectIds } }),
        { $set: { vendorId: masterObjectId, vendorName: masterName } },
        { session }
      )
    );

    if (sourceNames.length > 0) {
      await trackUpdate(
        "receipts",
        Receipt.updateMany(
          scopedFilter({ vendor: { $in: sourceNames } }),
          { $set: { vendor: masterName } },
          { session }
        )
      );
    } else {
      transferCounts.receipts = 0;
    }

    const mergedNotes = [
      masterVendor.notes,
      ...sourceVendors.map((vendor: any) => vendor.notes || vendor.remarks)
    ]
      .map((value: any) => String(value || "").trim())
      .filter(Boolean)
      .join("\n\n");

    const masterUpdateData: any = {
      companyName: firstNonEmpty([masterVendor.companyName, ...sourceVendors.map((v: any) => v.companyName)]),
      email: firstNonEmpty([masterVendor.email, ...sourceVendors.map((v: any) => v.email)]),
      workPhone: firstNonEmpty([masterVendor.workPhone, ...sourceVendors.map((v: any) => v.workPhone)]),
      payables: roundToMoney(toNumber(masterVendor.payables) + sourcePayablesInMasterCurrency),
      unusedCredits: roundToMoney(toNumber(masterVendor.unusedCredits) + sourceUnusedCreditsInMasterCurrency),
      status: "active",
      updatedBy: req.user.userId || null,
      updatedAt: new Date()
    };

    if (mergedNotes) {
      masterUpdateData.notes = mergedNotes;
    }

    const updatedMasterVendor = await Vendor.findByIdAndUpdate(
      masterObjectId,
      { $set: masterUpdateData },
      { new: true, runValidators: true, session }
    );

    const inactivated = await Vendor.updateMany(
      scopedFilter({ _id: { $in: sourceObjectIds } }),
      {
        $set: {
          status: "inactive",
          updatedBy: req.user.userId || null,
          updatedAt: new Date()
        }
      },
      { session }
    );

    transferCounts.vendorsMarkedInactive = Number(inactivated?.modifiedCount || 0);

    await session.commitTransaction();

    res.json({
      success: true,
      message: `${sourceObjectIds.length} vendor(s) merged into ${masterName} successfully`,
      data: {
        masterVendor: updatedMasterVendor,
        masterVendorId: String(masterObjectId),
        sourceVendorIds,
        currencyConversion: {
          baseCurrency: baseCurrencyCode,
          masterCurrency,
          convertedVendors: conversionDetails
        },
        transferCounts
      }
    });
  } catch (error: any) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    console.error('Error in mergeVendors:', error);
    res.status(500).json({
      success: false,
      message: 'Error merging vendors',
      error: error.message
    });
  } finally {
    session.endSession();
  }
};

/**
 * Send vendor statement email
 * POST /api/vendors/:id/send-statement
 */
export const sendVendorStatementEmail = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const { to, subject, body } = req.body;

    if (!to) {
      res.status(400).json({ success: false, message: 'Recipient email is required' });
      return;
    }

    const vendor = await Vendor.findById(id);
    if (!vendor) {
      res.status(404).json({ success: false, message: 'Vendor not found' });
      return;
    }

    // Verify organization ownership
    if (vendor.organization && vendor.organization.toString() !== req.user.organizationId.toString()) {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }

    console.log(`[VENDOR STATEMENT EMAIL] Sending statement to ${to} for vendor ${vendor.displayName || vendor.name}`);

    // Call email service with organizationId for dynamic sender resolution
    await sendEmail({
      to,
      subject,
      html: body,
      organizationId: req.user.organizationId
    });

    res.json({ success: true, message: 'Statement email sent successfully' });
  } catch (error: any) {
    console.error('[VENDOR STATEMENT EMAIL] Error sending email:', error);
    res.status(500).json({ success: false, message: 'Error sending email', error: error.message });
  }
};

// Get all bills
export const getBills = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const parseStartedAt = Date.now();
    const {
      page = '1',
      limit = '50',
      search = '',
      status,
      vendorId,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query as any;

    const query: any = { organization: req.user.organizationId };

    if (status) query.status = status;
    if (vendorId) query.vendor = vendorId;
    if (req.query.purchaseOrderId) query.purchaseOrderId = req.query.purchaseOrderId;

    if (search) {
      const searchRegex = new RegExp(search as string, 'i');
      query.$or = [
        { billNumber: searchRegex },
        { orderNumber: searchRegex }
      ];
    }

    const limitNum = parseInt(limit as string) || 50;
    const pageNum = parseInt(page as string) || 1;
    const skip = (pageNum - 1) * limitNum;

    const sort: any = {};
    const sortField = sortBy === 'date' ? 'date' : 'createdAt'; // Default to createdAt if not specific
    sort[sortField] = sortOrder === 'desc' ? -1 : 1;

    recordRequestTiming(req, "bills.parse-query", parseStartedAt, {
      page: pageNum,
      limit: limitNum,
      sortField,
      sortOrder,
      hasSearch: Boolean(search),
      hasStatus: Boolean(status),
      hasVendorFilter: Boolean(vendorId),
    });

    const [bills, total] = await Promise.all([
      measureRequestStep(
        req,
        "bills.find",
        () =>
          Bill.find(query)
            .select(BILL_LIST_SELECT)
            .sort(sort)
            .skip(skip)
            .limit(limitNum)
            .lean(),
        { projection: BILL_LIST_SELECT, limit: limitNum, skip, sortField, sortOrder }
      ),
      measureRequestStep(
        req,
        "bills.count",
        () => Bill.countDocuments(query),
        { filterKeys: Object.keys(query) }
      )
    ]);

    const vendorIds = Array.from(
      new Set(
        (bills as any[])
          .map((bill) => String(bill?.vendor || "").trim())
          .filter((id) => mongoose.Types.ObjectId.isValid(id))
      )
    );

    const vendors = vendorIds.length
      ? await measureRequestStep(
          req,
          "bills.vendor-lookup",
          () => Vendor.find({ _id: { $in: vendorIds } }).select(BILL_LIST_VENDOR_SELECT).lean(),
          { vendorCount: vendorIds.length, projection: BILL_LIST_VENDOR_SELECT }
        )
      : [];

    const vendorMapStartedAt = Date.now();
    const vendorMap = new Map(
      (vendors as any[]).map((vendor) => [String(vendor?._id || ""), vendor])
    );
    recordRequestTiming(req, "bills.vendor-map", vendorMapStartedAt, {
      vendorCount: vendorIds.length,
      matchedVendors: vendorMap.size,
    });

    const normalizeStartedAt = Date.now();
    const hydratedBills = await hydrateBillBalancesAndStatuses(req.user.organizationId, bills as any[]);
    const normalizedBills = hydratedBills.map((bill: any) => {
      const vendorDoc = vendorMap.get(String(bill?.vendor || "").trim());
      return {
        ...bill,
        vendor: vendorDoc || bill?.vendor,
      };
    });
    recordRequestTiming(req, "bills.normalize-response", normalizeStartedAt, {
      rows: normalizedBills.length,
    });

    logRequestTiming(req, {
      handler: "getBills",
      rows: normalizedBills.length,
      total,
      queryShape: {
        sortField,
        sortOrder,
        status: status || null,
        vendorId: vendorId || null,
        hasSearch: Boolean(search),
      },
    });

    res.json({
      success: true,
      data: normalizedBills,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error: any) {
    console.error('Error in getBills:', error);
    logRequestTiming(req, {
      handler: "getBills",
      failed: true,
      error: error.message,
    });
    res.status(500).json({
      success: false,
      message: 'Error fetching bills',
      error: error.message
    });
  }
};

// Get bill by ID
export const getBill = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid bill ID format' });
      return;
    }
    const bill = await Bill.findOne({
      _id: id,
      organization: req.user.organizationId
    }).populate('vendor').lean();

    if (!bill) {
      res.status(404).json({ success: false, message: 'Bill not found' });
      return;
    }

    const [hydratedBill] = await hydrateBillBalancesAndStatuses(req.user.organizationId, [bill as any]);

    res.json({
      success: true,
      data: {
        ...(hydratedBill || (bill as any)),
      }
    });
  } catch (error: any) {
    console.error('Error in getBill:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching bill',
      error: error.message
    });
  }
};

// Helper function to find account by name
const findAccountByName = async (orgId: string, accountName: string): Promise<string | null> => {
  try {
    const account = await ChartOfAccount.findOne({
      organization: orgId,
      accountName: { $regex: new RegExp(accountName, 'i') },
      isActive: true
    });
    return account ? account._id.toString() : null;
  } catch (error) {
    console.error(`[BILLS] Error finding account ${accountName}:`, error);
    return null;
  }
};

const resolveAccountByNames = async (
  orgId: string,
  accountNames: string[]
): Promise<{ id: string | null; name: string }> => {
  for (const name of accountNames) {
    const accountId = await findAccountByName(orgId, name);
    if (!accountId) continue;

    const accountDoc = await ChartOfAccount.findById(accountId).lean();
    return {
      id: accountId,
      name: accountDoc?.accountName || accountDoc?.name || name
    };
  }

  return { id: null, name: accountNames[0] || "Unknown Account" };
};

const isVendorCreditPostingStatus = (status?: string): boolean => {
  const normalizedStatus = String(status || "").toLowerCase().trim();
  return normalizedStatus !== "draft" && normalizedStatus !== "cancelled" && normalizedStatus !== "void";
};

const collectVendorCreditItemQuantities = (items: any[] = []): Map<string, number> => {
  const quantities = new Map<string, number>();

  for (const line of items || []) {
    const rawItemId = line?.item || line?.itemId;
    const itemId = rawItemId?._id || rawItemId?.id || rawItemId;
    const normalizedItemId = itemId ? String(itemId) : "";
    if (!normalizedItemId || !mongoose.Types.ObjectId.isValid(normalizedItemId)) continue;

    const quantity = Math.abs(Number(line?.quantity || 0));
    if (!Number.isFinite(quantity) || quantity <= 0) continue;

    quantities.set(normalizedItemId, (quantities.get(normalizedItemId) || 0) + quantity);
  }

  return quantities;
};

const buildVendorCreditStockDelta = (
  previousItems: any[] = [],
  previousStatus?: string,
  nextItems: any[] = [],
  nextStatus?: string
): Map<string, number> => {
  const previousAffectsStock = isVendorCreditPostingStatus(previousStatus);
  const nextAffectsStock = isVendorCreditPostingStatus(nextStatus);

  if (!previousAffectsStock && !nextAffectsStock) {
    return new Map<string, number>();
  }

  const previousQuantities = previousAffectsStock ? collectVendorCreditItemQuantities(previousItems) : new Map<string, number>();
  const nextQuantities = nextAffectsStock ? collectVendorCreditItemQuantities(nextItems) : new Map<string, number>();

  const itemIds = new Set<string>([
    ...Array.from(previousQuantities.keys()),
    ...Array.from(nextQuantities.keys()),
  ]);

  const stockDelta = new Map<string, number>();
  for (const itemId of itemIds) {
    // Vendor credit represents purchase returns, so stock effect is negative quantity.
    // Delta = previousEffect - nextEffect = previousQty - nextQty.
    const previousQty = previousQuantities.get(itemId) || 0;
    const nextQty = nextQuantities.get(itemId) || 0;
    const delta = previousQty - nextQty;
    if (delta !== 0) stockDelta.set(itemId, delta);
  }

  return stockDelta;
};

const applyVendorCreditStockDelta = async (
  organizationId: string,
  stockDelta: Map<string, number>,
  session?: mongoose.ClientSession
): Promise<void> => {
  if (!stockDelta.size) return;

  const { getItemsSettings } = await import("../utils/itemsSettings.js");
  const settings = await getItemsSettings(String(organizationId));
  if (!settings.enableInventoryTracking) return;

  for (const [itemId, delta] of stockDelta.entries()) {
    if (!delta || !mongoose.Types.ObjectId.isValid(itemId)) continue;

    const itemQuery = Item.findById(itemId);
    if (session) itemQuery.session(session);
    const itemDoc = await itemQuery;

    if (!itemDoc || !itemDoc.trackInventory) continue;

    const currentStock = Number(itemDoc.stockQuantity || 0);
    const updatedStock = currentStock + Number(delta);

    if (settings.preventNegativeStock && updatedStock < 0) {
      throw new Error(
        `Insufficient stock for item "${itemDoc.name}". Current: ${currentStock}, Requested change: ${delta}`
      );
    }

    const updateQuery = Item.findByIdAndUpdate(itemId, { $set: { stockQuantity: updatedStock } });
    if (session) updateQuery.session(session);
    await updateQuery;
  }
};

const createVendorCreditJournalEntry = async (
  credit: any,
  orgId: string,
  userId?: string
): Promise<mongoose.Types.ObjectId | null> => {
  try {
    const totalAmount = Number(credit.total || 0);
    if (totalAmount <= 0) return null;

    const accountsPayable = await resolveAccountByNames(orgId, [
      credit.accountsPayable || "Accounts Payable",
      "Accounts Payable"
    ]);

    const purchaseReturns = await resolveAccountByNames(orgId, [
      "Purchase Returns",
      "Cost of Goods Sold",
      "Purchases"
    ]);

    const journalNumber = `JE-VC-${credit.vendorCreditNumber}-${Date.now()}`;
    const journalEntry = await JournalEntry.create({
      organization: orgId,
      entryNumber: journalNumber,
      date: credit.date || new Date(),
      description: `Vendor Credit ${credit.vendorCreditNumber} - ${credit.vendorName || "Vendor"}`,
      reference: credit.vendorCreditNumber,
      status: "posted",
      postedBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
      postedAt: new Date(),
      sourceId: credit._id,
      sourceType: "vendor_credit",
      lines: [
        {
          account: accountsPayable.id || "Accounts Payable",
          accountName: accountsPayable.name,
          description: `Vendor Credit ${credit.vendorCreditNumber} - Accounts Payable`,
          debit: totalAmount,
          credit: 0
        },
        {
          account: purchaseReturns.id || "Purchase Returns",
          accountName: purchaseReturns.name,
          description: `Vendor Credit ${credit.vendorCreditNumber} - Purchase Returns`,
          debit: 0,
          credit: totalAmount
        }
      ]
    });

    await updateAccountBalances(journalEntry.lines, orgId);
    return journalEntry._id;
  } catch (error: any) {
    console.error("[VENDOR CREDITS] Error creating journal entry:", error);
    return null;
  }
};

const reverseAndDeleteVendorCreditJournals = async (
  sourceIds: Array<string | mongoose.Types.ObjectId>,
  orgId: string
): Promise<void> => {
  if (!sourceIds.length) return;

  const normalizedIds = sourceIds
    .filter((id) => !!id)
    .map((id) => new mongoose.Types.ObjectId(id.toString()));

  if (!normalizedIds.length) return;

  const journals = await JournalEntry.find({
    organization: orgId,
    sourceType: "vendor_credit",
    sourceId: { $in: normalizedIds }
  });

  for (const entry of journals) {
    await updateAccountBalances(entry.lines, orgId, true);
  }

  await JournalEntry.deleteMany({
    organization: orgId,
    sourceType: "vendor_credit",
    sourceId: { $in: normalizedIds }
  });
};

const resolveVendorReference = async (
  rawVendor: any,
  organizationId: string,
  session: mongoose.ClientSession
): Promise<mongoose.Types.ObjectId> => {
  const candidate = typeof rawVendor === "object"
    ? (rawVendor?._id || rawVendor?.id)
    : rawVendor;

  if (!candidate) {
    throw new Error("Vendor is required");
  }

  if (mongoose.Types.ObjectId.isValid(candidate)) {
    const vendorByObjectId = await Vendor.findOne({
      _id: candidate,
      organization: organizationId,
    }).session(session).select("_id");

    if (vendorByObjectId?._id) {
      return vendorByObjectId._id as mongoose.Types.ObjectId;
    }
  }

  const vendorByLegacyId = await Vendor.findOne({
    id: String(candidate),
    organization: organizationId,
  }).session(session).select("_id");

  if (vendorByLegacyId?._id) {
    return vendorByLegacyId._id as mongoose.Types.ObjectId;
  }

  throw new Error("Invalid vendor reference");
};

// Helper function to create journal entry for bill
const createBillJournalEntry = async (
  bill: any,
  orgId: string,
  userId?: string
): Promise<mongoose.Types.ObjectId | null> => {
  try {
    // 1. Find Credit Account (Accounts Payable)
    const apAccountName = bill.accountsPayable || 'Accounts Payable';
    let apAccountId = await findAccountByName(orgId, apAccountName);

    if (!apAccountId) {
      console.warn(`[BILLS] AP account "${apAccountName}" not found, using default search`);
      apAccountId = await findAccountByName(orgId, 'Accounts Payable');
    }

    // 2. Map items to Debit accounts
    const journalLines: any[] = [];

    // Debit lines for each item
    for (const item of bill.items) {
      let debitAccountId = item.account;
      let debitAccountName = 'Expense';

      if (debitAccountId && mongoose.Types.ObjectId.isValid(debitAccountId)) {
        const coaAcc = await ChartOfAccount.findById(debitAccountId);
        if (coaAcc) {
          debitAccountName = coaAcc.accountName || coaAcc.name;
        }
      } else if (typeof debitAccountId === 'string' && debitAccountId) {
        // If it's a name, try to find the ID
        const coaAcc = await findAccountByName(orgId, debitAccountId);
        if (coaAcc) {
          const accDoc = await ChartOfAccount.findById(coaAcc);
          debitAccountId = coaAcc;
          debitAccountName = accDoc?.accountName || accDoc?.name || debitAccountId;
        }
      }

      journalLines.push({
        account: debitAccountId || 'Expense',
        accountName: debitAccountName,
        description: item.name || item.description || `Item for Bill ${bill.billNumber}`,
        debit: item.total || 0,
        credit: 0,
      });
    }

    // Credit line for Accounts Payable
    journalLines.push({
      account: apAccountId || 'Accounts Payable',
      accountName: apAccountName,
      description: `Bill ${bill.billNumber} - Accounts Payable`,
      debit: 0,
      credit: bill.total || 0,
    });

    const journalNumber = `JE-BILL-${bill.billNumber}-${Date.now()}`;
    const journalEntry = await JournalEntry.create({
      organization: orgId,
      entryNumber: journalNumber,
      date: bill.date || new Date(),
      description: `Bill ${bill.billNumber} from ${bill.vendorName || 'Vendor'}`,
      reference: bill.billNumber,
      status: 'posted',
      postedBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
      postedAt: new Date(),
      sourceId: bill._id,
      sourceType: 'bill',
      lines: journalLines,
    });

    // Update Chart of Account balances
    try {
      await updateAccountBalances(journalEntry.lines, orgId);
    } catch (balanceError) {
      console.error('[BILLS] Failed to update account balances:', balanceError);
    }

    return journalEntry._id;
  } catch (error: any) {
    console.error('[BILLS] Error creating journal entry:', error);
    return null;
  }
};

// Helper function to update stock quantity
const updateStockQuantity = async (
  items: any[],
  organizationId: string,
  reverse: boolean = false,
  session?: mongoose.ClientSession
): Promise<void> => {
  try {
    for (const billItem of items) {
      if (!billItem.item) continue;

      const itemDoc = await Item.findOne({
        _id: billItem.item,
        organization: organizationId
      }).session(session || null);

      if (itemDoc && itemDoc.trackInventory) {
        const quantity = Number(billItem.quantity) || 0;
        // For bills: positive change (購入) increases stock, reverse decreases it
        const change = reverse ? -quantity : quantity;

        itemDoc.stockQuantity = (itemDoc.stockQuantity || 0) + change;
        await itemDoc.save({ session });

        console.log(`[BILLS] Updated Stock for ${itemDoc.name}: ${itemDoc.stockQuantity} (Change: ${change})`);
      }
    }
  } catch (error) {
    console.error('[BILLS] Error updating stock quantity:', error);
    throw error;
  }
};

// Create bill
export const createBill = async (req: AuthRequest, res: Response): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    if (!req.user || !req.user.organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const billData = {
      ...req.body,
      organization: req.user.organizationId,
      fromPurchaseOrder: !!req.body.purchaseOrderId
    };

    const normalizedCreate = normalizeBillItemsAndTotals(billData.items || []);
    billData.items = normalizedCreate.items;
    billData.subtotal = normalizedCreate.subtotal;
    billData.tax = normalizedCreate.tax;
    billData.total = normalizedCreate.total;
    const paidAmount = asNumber(billData.paidAmount, 0);
    const vendorCreditsApplied = asNumber(billData.vendorCreditsApplied, 0);
    billData.balance = Math.max(0, Number((billData.total - paidAmount - vendorCreditsApplied).toFixed(2)));

    // If vendor exists but vendorName is missing, fetch it
    if (billData.vendor && !billData.vendorName) {
      try {
        const vendor = await Vendor.findOne({
          _id: billData.vendor,
          organization: req.user.organizationId
        }).session(session);
        if (vendor) {
          billData.vendorName = vendor.name || vendor.displayName;
        }
      } catch (err) {
        console.error('Error fetching vendor for bill:', err);
      }
    }

    const logPath = path.join(__dirname, '../debug_bill_creation.log');
    const logData = {
      timestamp: new Date().toISOString(),
      billData,
    };
    fs.appendFileSync(logPath, JSON.stringify(logData, null, 2) + '\n---\n');

    console.log('--- Bill Creation Debug ---');
    console.log('Bill Data:', JSON.stringify(billData, null, 2));

    // Create the bill
    const [bill] = await Bill.create([billData], { session });

    // Update stock quantity for tracked items
    if (bill.status !== 'draft' && bill.status !== 'void' && bill.status !== 'cancelled') {
      await updateStockQuantity(bill.items, req.user.organizationId.toString(), false, session);
    }

    // Create journal entry for the bill
    if (bill.status !== 'draft') {
      const journalEntryId = await createBillJournalEntry(bill, req.user.organizationId, req.user.userId);
      if (journalEntryId) {
        bill.journalEntryCreated = true;
        bill.journalEntryId = journalEntryId;
        await bill.save({ session });
      }
    }

    // If bill was created from a purchase order, update the PO billedStatus
    if (billData.purchaseOrderId && mongoose.Types.ObjectId.isValid(billData.purchaseOrderId)) {
      await PurchaseOrder.findOneAndUpdate(
        { _id: billData.purchaseOrderId, organization: req.user.organizationId },
        { billedStatus: 'BILLED', status: 'CLOSED' }
      ).session(session);
    }

    await session.commitTransaction();
    res.status(201).json({ success: true, data: bill });
  } catch (error: any) {
    // Check if session has an active transaction to abort
    if (session.inTransaction()) {
      try {
        await session.abortTransaction();
      } catch (abortError) {
        console.error('Error aborting transaction:', abortError);
      }
    }
    console.error('Error in createBill:', error);
    const logPath = path.join(__dirname, '../debug_bill_creation.log');
    fs.appendFileSync(logPath, `CREATE ERROR: ${error.message}\nFull Error: ${JSON.stringify(error, null, 2)}\n---\n`);
    res.status(500).json({
      success: false,
      message: 'Error creating bill',
      error: error.message,
      details: error
    });
  } finally {
    session.endSession();
  }
};

// Update bill
export const updateBill = async (req: AuthRequest, res: Response): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    if (!req.user || !req.user.organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid bill ID format' });
      return;
    }

    // Get old bill to reverse stock changes
    const oldBill = await Bill.findOne({ _id: id, organization: req.user.organizationId }).session(session);
    if (!oldBill) {
      res.status(404).json({ success: false, message: 'Bill not found' });
      return;
    }

    // Reverse old stock changes if the bill was not a draft/void/cancelled
    if (oldBill.status !== 'draft' && oldBill.status !== 'void' && oldBill.status !== 'cancelled') {
      await updateStockQuantity(oldBill.items, req.user.organizationId.toString(), true, session);
    }

    const updateData = { ...req.body };

    // If vendor is being updated, also update vendorName
    if (updateData.vendor) {
      try {
        const vendor = await Vendor.findOne({
          _id: updateData.vendor,
          organization: req.user.organizationId
        }).session(session);
        if (vendor) {
          updateData.vendorName = vendor.name || vendor.displayName;
        }
      } catch (err) {
        console.error('Error fetching vendor for bill update:', err);
      }
    }

    if (Array.isArray(updateData.items)) {
      const normalizedUpdate = normalizeBillItemsAndTotals(updateData.items);
      updateData.items = normalizedUpdate.items;
      updateData.subtotal = normalizedUpdate.subtotal;
      updateData.tax = normalizedUpdate.tax;
      updateData.total = normalizedUpdate.total;
    }

    if (updateData.total !== undefined || updateData.paidAmount !== undefined || updateData.vendorCreditsApplied !== undefined) {
      const effectiveTotal = asNumber(updateData.total, asNumber(oldBill.total, 0));
      const effectivePaid = asNumber(updateData.paidAmount, asNumber((oldBill as any).paidAmount, 0));
      const effectiveCredits = asNumber(updateData.vendorCreditsApplied, asNumber((oldBill as any).vendorCreditsApplied, 0));
      updateData.balance = Math.max(0, Number((effectiveTotal - effectivePaid - effectiveCredits).toFixed(2)));
    }

    const bill = await Bill.findOneAndUpdate(
      { _id: id, organization: req.user.organizationId },
      updateData,
      { new: true, runValidators: true, session }
    );

    if (!bill) {
      throw new Error('Bill not found after update');
    }

    // Apply new stock changes if the bill is not a draft/void/cancelled
    if (bill.status !== 'draft' && bill.status !== 'void' && bill.status !== 'cancelled') {
      await updateStockQuantity(bill.items, req.user.organizationId.toString(), false, session);
    }

    // Refresh journal entry if needed
    if (bill.status !== 'draft' && bill.status !== 'void' && bill.status !== 'cancelled') {
      // If there was an old journal entry, reverse it
      if (bill.journalEntryId) {
        try {
          const oldEntry = await JournalEntry.findById(bill.journalEntryId).session(session);
          if (oldEntry && oldEntry.status === 'posted') {
            await updateAccountBalances(oldEntry.lines, req.user.organizationId, true);
            await JournalEntry.findByIdAndDelete(bill.journalEntryId).session(session);
          }
        } catch (err) {
          console.error('[BILLS] Error reversing old journal entry:', err);
        }
      }

      // Create new journal entry
      const journalEntryId = await createBillJournalEntry(bill, req.user.organizationId, req.user.userId);
      if (journalEntryId) {
        bill.journalEntryCreated = true;
        bill.journalEntryId = journalEntryId;
        await bill.save({ session });
      }
    } else if (bill.status === 'void' || bill.status === 'cancelled') {
      // If it's void or cancelled, make sure we reverse the old journal entry and don't create a new one
      if (bill.journalEntryId) {
        try {
          const oldEntry = await JournalEntry.findById(bill.journalEntryId).session(session);
          if (oldEntry && oldEntry.status === 'posted') {
            await updateAccountBalances(oldEntry.lines, req.user.organizationId, true);
            await JournalEntry.findByIdAndDelete(bill.journalEntryId).session(session);

            bill.journalEntryCreated = false;
            bill.journalEntryId = undefined;
            await bill.save({ session });
          }
        } catch (err) {
          console.error('[BILLS] Error reversing journal entry for void/cancelled bill:', err);
        }
      }
    }

    await session.commitTransaction();
    res.json({ success: true, data: bill });
  } catch (error: any) {
    // Check if session has active transaction
    if (session.inTransaction()) {
      try {
        await session.abortTransaction();
      } catch (abortError) {
        console.error('Error aborting transaction:', abortError);
      }
    }
    console.error('Error in updateBill:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating bill',
      error: error.message
    });
  } finally {
    session.endSession();
  }
};

// Delete bill
export const deleteBill = async (req: AuthRequest, res: Response): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    if (!req.user || !req.user.organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid bill ID format' });
      return;
    }

    const bill = await Bill.findOneAndDelete({
      _id: id,
      organization: req.user.organizationId
    }).session(session);

    if (!bill) {
      res.status(404).json({ success: false, message: 'Bill not found' });
      return;
    }

    // Reverse stock changes if the bill was not a draft/void/cancelled
    if (bill.status !== 'draft' && bill.status !== 'void' && bill.status !== 'cancelled') {
      await updateStockQuantity(bill.items, req.user.organizationId.toString(), true, session);
    }

    // If there was a journal entry, reverse its effects
    if (bill.journalEntryId) {
      try {
        const entry = await JournalEntry.findById(bill.journalEntryId).session(session);
        if (entry && entry.status === 'posted') {
          await updateAccountBalances(entry.lines, req.user.organizationId, true);
          await JournalEntry.findByIdAndDelete(bill.journalEntryId).session(session);
        }
      } catch (err) {
        console.error('[BILLS] Error reversing journal entry on bill deletion:', err);
      }
    }

    const linkedPurchaseOrderId = String(
      (bill as any).purchaseOrderId ||
      (bill as any).purchaseOrder ||
      ""
    ).trim();

    if (linkedPurchaseOrderId && mongoose.Types.ObjectId.isValid(linkedPurchaseOrderId)) {
      const remainingLinkedBills = await Bill.countDocuments({
        organization: req.user.organizationId,
        $or: [
          { purchaseOrderId: linkedPurchaseOrderId },
          { purchaseOrder: linkedPurchaseOrderId },
        ],
        _id: { $ne: bill._id },
      }).session(session);

      if (remainingLinkedBills === 0) {
        await PurchaseOrder.findOneAndUpdate(
          { _id: linkedPurchaseOrderId, organization: req.user.organizationId },
          { billedStatus: 'YET TO BE BILLED', status: 'ISSUED' }
        ).session(session);
      }
    }

    await session.commitTransaction();
    res.json({ success: true, message: 'Bill deleted' });
  } catch (error: any) {
    // Check if session has active transaction
    if (session.inTransaction()) {
      try {
        await session.abortTransaction();
      } catch (abortError) {
        console.error('Error aborting transaction:', abortError);
      }
    }
    console.error('Error in deleteBill:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting bill',
      error: error.message
    });
  } finally {
    session.endSession();
  }
};

// ============================================================================
// RECEIPTS CONTROLLER
// ============================================================================

// Get all receipts
export const getAllReceipts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const {
      page = '1',
      limit = '50',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query as any;

    const query: any = {
      organization: req.user.organizationId,
      status: { $ne: 'CONVERTED' } // Only show non-converted receipts in inbox
    };

    const limitNum = parseInt(limit as string) || 50;
    const pageNum = parseInt(page as string) || 1;
    const skip = (pageNum - 1) * limitNum;

    const sort: any = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const [receipts, total] = await Promise.all([
      Receipt.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Receipt.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: receipts.map(r => ({
        ...r,
        id: r._id // For frontend compatibility
      })),
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error: any) {
    console.error('Error in getAllReceipts:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching receipts',
      error: error.message
    });
  }
};

// Create receipt (upload)
export const createReceipt = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const receiptData = {
      ...req.body,
      organization: req.user.organizationId,
      uploadedBy: req.user.userId
    };

    const receipt = await Receipt.create(receiptData);
    res.status(201).json({
      success: true,
      data: {
        ...receipt.toObject(),
        id: receipt._id
      }
    });
  } catch (error: any) {
    console.error('Error in createReceipt:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating receipt',
      error: error.message
    });
  }
};

// Update receipt
export const updateReceipt = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const receipt = await Receipt.findOneAndUpdate(
      { _id: id, organization: req.user.organizationId },
      req.body,
      { new: true, runValidators: true }
    );

    if (!receipt) {
      res.status(404).json({ success: false, message: 'Receipt not found' });
      return;
    }

    res.json({
      success: true,
      data: {
        ...receipt.toObject(),
        id: receipt._id
      }
    });
  } catch (error: any) {
    console.error('Error in updateReceipt:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating receipt',
      error: error.message
    });
  }
};

// Delete receipt
export const deleteReceipt = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const receipt = await Receipt.findOneAndDelete({
      _id: id,
      organization: req.user.organizationId
    });

    if (!receipt) {
      res.status(404).json({ success: false, message: 'Receipt not found' });
      return;
    }

    res.json({ success: true, message: 'Receipt deleted' });
  } catch (error: any) {
    console.error('Error in deleteReceipt:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting receipt',
      error: error.message
    });
  }
};

// Bulk delete receipts
export const deleteReceipts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { ids } = req.body;
    const result = await Receipt.deleteMany({
      _id: { $in: ids },
      organization: req.user.organizationId
    });

    res.json({ success: true, deletedCount: result.deletedCount });
  } catch (error: any) {
    console.error('Error in deleteReceipts:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting receipts',
      error: error.message
    });
  }
};

// Get all vendor credits
export const getVendorCredits = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const {
      page = '1',
      limit = '50',
      search = '',
      status,
      vendorId,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query as any;

    const query: any = { organization: req.user.organizationId };

    if (status) query.status = status;
    if (vendorId) query.vendor = vendorId;

    if (search) {
      const searchRegex = new RegExp(search as string, 'i');
      query.$or = [
        { vendorCreditNumber: searchRegex },
        { vendorName: searchRegex },
        { orderNumber: searchRegex }
      ];
    }

    const limitNum = parseInt(limit as string) || 50;
    const pageNum = parseInt(page as string) || 1;
    const skip = (pageNum - 1) * limitNum;

    const sort: any = {};
    const sortField = sortBy === 'date' ? 'date' : 'createdAt';
    sort[sortField] = sortOrder === 'desc' ? -1 : 1;

    const [credits, total] = await Promise.all([
      VendorCredit.find(query)
        .populate('vendor')
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      VendorCredit.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: credits.map(c => ({
        ...c,
        id: c._id, // For frontend compatibility
        creditNote: c.vendorCreditNumber,
        referenceNumber: c.orderNumber,
        amount: c.total
      })),
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error: any) {
    console.error('Error in getVendorCredits:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching vendor credits',
      error: error.message
    });
  }
};

const normalizeVendorCreditAttachments = (attachments: any): any[] => {
  if (!Array.isArray(attachments)) return [];

  return attachments
    .map((attachment: any) => {
      if (!attachment) return null;

      const name = String(attachment.name || attachment.fileName || "").trim();
      const url = String(attachment.url || "").trim();
      if (!name || !url) return null;

      return {
        id: String(attachment.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
        name,
        url,
        size: Number(attachment.size || 0),
        type: String(attachment.type || "application/octet-stream"),
        uploadedAt: attachment.uploadedAt ? new Date(attachment.uploadedAt) : new Date(),
      };
    })
    .filter(Boolean) as any[];
};

const normalizeVendorCreditComments = (comments: any): any[] => {
  if (!Array.isArray(comments)) return [];

  return comments
    .map((comment: any) => {
      if (!comment) return null;

      const text = String(comment.text || "").trim();
      if (!text) return null;

      return {
        id: String(comment.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
        text,
        author: String(comment.author || "User"),
        createdAt: comment.createdAt ? new Date(comment.createdAt) : new Date(),
      };
    })
    .filter(Boolean) as any[];
};

// Create vendor credit
export const createVendorCredit = async (req: AuthRequest, res: Response): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    if (!req.user || !req.user.organizationId) {
      await session.abortTransaction();
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const creditData = {
      ...req.body,
      organization: req.user.organizationId,
    };

    // Adapt fields from frontend
    if (req.body.creditNote) creditData.vendorCreditNumber = req.body.creditNote;
    if (req.body.vendorCreditDate) creditData.date = req.body.vendorCreditDate;
    if (creditData.attachedFiles !== undefined && creditData.attachments === undefined) {
      creditData.attachments = creditData.attachedFiles;
    }
    creditData.attachments = normalizeVendorCreditAttachments(creditData.attachments);
    creditData.comments = normalizeVendorCreditComments(creditData.comments);
    delete creditData.attachedFiles;



    creditData.vendor = await resolveVendorReference(
      creditData.vendor,
      req.user.organizationId,
      session
    );

    // Ensure numeric fields are numbers and sanitize item
    if (creditData.items) {
      creditData.items = creditData.items.map((item: any) => {
        const newItem: any = {
          ...item,
          quantity: Number(item.quantity) || 0,
          unitPrice: Number(item.rate || item.unitPrice) || 0,
          total: Number(item.amount || item.total) || 0,
          taxRate: Number(item.taxRate) || 0,
          taxAmount: Number(item.taxAmount) || 0
        };
        // Remove item field if it is empty/invalid to prevent ObjectId cast error
        if (!newItem.item || newItem.item === "" || newItem.item === "undefined") {
          delete newItem.item;
        }
        return newItem;
      });
    }
    creditData.subtotal = Number(creditData.subtotal) || 0;
    creditData.total = Number(creditData.total) || 0;
    creditData.balance = Number(creditData.total) || 0;

    // Log the payload to debug
    console.log('Creating Vendor Credit Payload:', JSON.stringify(creditData, null, 2));

    const [credit] = await VendorCredit.create([creditData], { session });

    // Vendor credit is a purchase return: reduce stock when it becomes active.
    const stockDelta = buildVendorCreditStockDelta(
      [],
      "draft",
      (credit as any).items || [],
      (credit as any).status
    );
    await applyVendorCreditStockDelta(req.user.organizationId.toString(), stockDelta, session);

    await session.commitTransaction();

    // Post accounting only for active vendor credits (not draft/cancelled/void).
    if (isVendorCreditPostingStatus((credit as any).status)) {
      const vendorCreditJournalId = await createVendorCreditJournalEntry(
        credit,
        req.user.organizationId.toString(),
        req.user.userId
      );
      if (!vendorCreditJournalId) {
        console.warn(`[VENDOR CREDITS] Journal entry not created for ${credit.vendorCreditNumber}`);
      }
    }

    const creditDataForResponse =
      typeof (credit as any)?.toObject === "function"
        ? (credit as any).toObject()
        : credit;

    res.status(201).json({
      success: true,
      data: {
        ...creditDataForResponse,
        id: (creditDataForResponse as any)?._id || (credit as any)?._id,
        creditNote: (creditDataForResponse as any)?.vendorCreditNumber || (credit as any)?.vendorCreditNumber,
        referenceNumber: (creditDataForResponse as any)?.orderNumber || (credit as any)?.orderNumber,
        amount: (creditDataForResponse as any)?.total ?? (credit as any)?.total
      }
    });
  } catch (error: any) {
    // Check if session has an active transaction to abort
    if (session.inTransaction()) {
      try {
        await session.abortTransaction();
      } catch (abortError) {
        console.error('Error aborting transaction:', abortError);
      }
    }
    // Log error to file safely
    try {
      // Use process.cwd() to get root directory
      const logPath = path.join(process.cwd(), 'debug_vendor_credit.txt');
      fs.appendFileSync(logPath, `${new Date().toISOString()} - Error: ${error.message}\nStack: ${error.stack}\nData: ${JSON.stringify(req.body)}\n\n`);
    } catch (logErr) {
      console.error("Failed to write to log file:", logErr);
    }
    // Log error to console only
    console.error('Detailed Error in createVendorCredit:', JSON.stringify(error, Object.getOwnPropertyNames(error)));

    if (error.code === 11000) {
      res.status(409).json({
        success: false,
        message: 'Vendor Credit Number already exists',
        error: error.message
      });
      return;
    }

    if (error.name === 'ValidationError') {
      res.status(400).json({
        success: false,
        message: 'Validation Error',
        error: error.message
      });
      return;
    }
    if (error.name === "CastError") {
      res.status(400).json({
        success: false,
        message: "Invalid reference data",
        error: error.message
      });
      return;
    }
    res.status(500).json({
      success: false,
      message: 'Error creating vendor credit',
      error: error.message
    });
  } finally {
    session.endSession();
  }
};

// Get vendor credit by ID
export const getVendorCredit = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid vendor credit ID format' });
      return;
    }

    const credit = await VendorCredit.findOne({
      _id: id,
      organization: req.user.organizationId
    }).populate('vendor').populate('items.item').lean();

    if (!credit) {
      res.status(404).json({ success: false, message: 'Vendor credit not found' });
      return;
    }

    const mappedCredit = {
      ...credit,
      id: (credit as any)._id,
      creditNote: (credit as any).vendorCreditNumber,
      referenceNumber: (credit as any).orderNumber,
      amount: (credit as any).total
    };

    res.json({ success: true, data: mappedCredit });
  } catch (error: any) {
    console.error('Error in getVendorCredit:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching vendor credit',
      error: error.message
    });
  }
};

// Update vendor credit
export const updateVendorCredit = async (req: AuthRequest, res: Response): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    if (!req.user || !req.user.organizationId) {
      await session.abortTransaction();
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      await session.abortTransaction();
      res.status(400).json({ success: false, message: 'Invalid vendor credit ID format' });
      return;
    }

    const existingCredit = await VendorCredit.findOne({
      _id: id,
      organization: req.user.organizationId
    }).session(session);

    if (!existingCredit) {
      await session.abortTransaction();
      res.status(404).json({ success: false, message: 'Vendor credit not found' });
      return;
    }

    const updateData: any = { ...req.body };

    if (req.body.creditNote !== undefined) updateData.vendorCreditNumber = req.body.creditNote;
    if (req.body.vendorCreditDate !== undefined) updateData.date = req.body.vendorCreditDate;
    delete updateData.creditNote;
    delete updateData.vendorCreditDate;
    if (updateData.attachedFiles !== undefined && updateData.attachments === undefined) {
      updateData.attachments = updateData.attachedFiles;
    }
    if (updateData.attachments !== undefined) {
      updateData.attachments = normalizeVendorCreditAttachments(updateData.attachments);
    }
    if (updateData.comments !== undefined) {
      updateData.comments = normalizeVendorCreditComments(updateData.comments);
    }
    delete updateData.attachedFiles;

    if (updateData.vendor !== undefined) {
      updateData.vendor = await resolveVendorReference(
        updateData.vendor,
        req.user.organizationId,
        session
      );
    }

    if (Array.isArray(updateData.items)) {
      updateData.items = updateData.items.map((item: any) => {
        const mappedItem: any = {
          ...item,
          quantity: Number(item.quantity) || 0,
          unitPrice: Number(item.rate || item.unitPrice) || 0,
          total: Number(item.amount || item.total) || 0,
          taxRate: Number(item.taxRate) || 0,
          taxAmount: Number(item.taxAmount) || 0
        };

        if (!mappedItem.item || mappedItem.item === "" || mappedItem.item === "undefined") {
          delete mappedItem.item;
        }

        return mappedItem;
      });
    }

    if (updateData.subtotal !== undefined) updateData.subtotal = Number(updateData.subtotal) || 0;
    if (updateData.tax !== undefined) updateData.tax = Number(updateData.tax) || 0;
    if (updateData.discount !== undefined) updateData.discount = Number(updateData.discount) || 0;
    if (updateData.adjustment !== undefined) updateData.adjustment = Number(updateData.adjustment) || 0;

    if (updateData.total !== undefined) {
      const newTotal = Number(updateData.total) || 0;
      const oldTotal = Number(existingCredit.total || 0);
      const oldBalance = Number(existingCredit.balance || 0);
      const alreadyApplied = Math.max(0, oldTotal - oldBalance);

      updateData.total = newTotal;
      updateData.balance = Math.max(0, newTotal - alreadyApplied);
    }

    const metadataOnlyFields = new Set(["attachments", "comments"]);
    const updateFieldKeys = Object.keys(updateData).filter((key) => updateData[key] !== undefined);
    const isMetadataOnlyUpdate =
      updateFieldKeys.length > 0 && updateFieldKeys.every((key) => metadataOnlyFields.has(key));

    const credit = await VendorCredit.findOneAndUpdate(
      { _id: id, organization: req.user.organizationId },
      updateData,
      { new: true, runValidators: true, session }
    );

    if (!credit) {
      await session.abortTransaction();
      res.status(404).json({ success: false, message: 'Vendor credit not found' });
      return;
    }

    if (!isMetadataOnlyUpdate) {
      const nextStatus = updateData.status !== undefined ? updateData.status : existingCredit.status;
      const nextItems = Array.isArray(updateData.items) ? updateData.items : (existingCredit.items || []);
      const stockDelta = buildVendorCreditStockDelta(
        (existingCredit as any).items || [],
        (existingCredit as any).status,
        nextItems,
        nextStatus
      );
      await applyVendorCreditStockDelta(req.user.organizationId.toString(), stockDelta, session);
    }

    await session.commitTransaction();

    // Rebuild accounting entry so GL reflects current vendor credit data/state.
    if (!isMetadataOnlyUpdate) {
      try {
        await reverseAndDeleteVendorCreditJournals([credit._id], req.user.organizationId.toString());

        if (isVendorCreditPostingStatus(credit.status)) {
          const vendorCreditJournalId = await createVendorCreditJournalEntry(
            credit,
            req.user.organizationId.toString(),
            req.user.userId
          );
          if (!vendorCreditJournalId) {
            console.warn(`[VENDOR CREDITS] Journal entry not recreated for ${credit.vendorCreditNumber}`);
          }
        }
      } catch (journalError: any) {
        console.error('[VENDOR CREDITS] Failed to rebuild journal after update:', journalError?.message || journalError);
      }
    }

    res.json({ success: true, data: credit });
  } catch (error: any) {
    if (session.inTransaction()) {
      try {
        await session.abortTransaction();
      } catch (abortError) {
        console.error('Error aborting transaction:', abortError);
      }
    }
    console.error('Error in updateVendorCredit:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating vendor credit',
      error: error.message
    });
  } finally {
    session.endSession();
  }
};

const asNumber = (value: any, fallback = 0): number => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const normalizeBillItemsAndTotals = (items: any[] = []) => {
  let subtotal = 0;
  let tax = 0;
  let total = 0;

  const normalizedItems = (Array.isArray(items) ? items : []).map((rawItem: any) => {
    const quantity = asNumber(rawItem?.quantity, 0);
    const unitPrice = asNumber(rawItem?.unitPrice ?? rawItem?.rate, 0);
    const lineSubtotal = quantity * unitPrice;
    const taxRate = asNumber(rawItem?.taxRate, 0);
    const providedTaxAmount = asNumber(rawItem?.taxAmount, NaN);
    const taxAmount = Number.isFinite(providedTaxAmount)
      ? providedTaxAmount
      : (lineSubtotal * taxRate / 100);
    const providedTotal = asNumber(rawItem?.total ?? rawItem?.amount, NaN);
    const lineTotal = Number.isFinite(providedTotal)
      ? providedTotal
      : (lineSubtotal + taxAmount);

    subtotal += lineSubtotal;
    tax += taxAmount;
    total += lineTotal;

    return {
      ...rawItem,
      quantity,
      unitPrice,
      taxRate,
      taxAmount: Number(taxAmount.toFixed(2)),
      total: Number(lineTotal.toFixed(2)),
    };
  });

  return {
    items: normalizedItems,
    subtotal: Number(subtotal.toFixed(2)),
    tax: Number(tax.toFixed(2)),
    total: Number(total.toFixed(2)),
  };
};

// Delete vendor credit
export const deleteVendorCredit = async (req: AuthRequest, res: Response): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    if (!req.user || !req.user.organizationId) {
      await session.abortTransaction();
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      await session.abortTransaction();
      res.status(400).json({ success: false, message: 'Invalid vendor credit ID format' });
      return;
    }
    const credit = await VendorCredit.findOne({
      _id: id,
      organization: req.user.organizationId
    }).session(session);

    if (!credit) {
      await session.abortTransaction();
      res.status(404).json({ success: false, message: 'Vendor credit not found' });
      return;
    }

    const stockDelta = buildVendorCreditStockDelta(
      (credit as any).items || [],
      (credit as any).status,
      [],
      "draft"
    );
    await applyVendorCreditStockDelta(req.user.organizationId.toString(), stockDelta, session);

    await VendorCredit.deleteOne({
      _id: id,
      organization: req.user.organizationId
    }).session(session);

    await session.commitTransaction();

    try {
      await reverseAndDeleteVendorCreditJournals([id], req.user.organizationId.toString());
    } catch (journalError: any) {
      console.error('[VENDOR CREDITS] Failed to reverse journal on delete:', journalError?.message || journalError);
    }

    res.json({ success: true, message: 'Vendor credit deleted' });
  } catch (error: any) {
    if (session.inTransaction()) {
      try {
        await session.abortTransaction();
      } catch (abortError) {
        console.error('Error aborting transaction:', abortError);
      }
    }
    console.error('Error in deleteVendorCredit:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting vendor credit',
      error: error.message
    });
  } finally {
    session.endSession();
  }
};

// Bulk delete vendor credits
export const bulkDeleteVendorCredits = async (req: AuthRequest, res: Response): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    if (!req.user || !req.user.organizationId) {
      await session.abortTransaction();
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) {
      await session.abortTransaction();
      res.status(400).json({ success: false, message: 'Invalid IDs provided' });
      return;
    }

    // Validate all IDs are valid ObjectIds to prevent CastError
    const validIds = ids.filter(id => id && mongoose.Types.ObjectId.isValid(id));
    if (validIds.length === 0) {
      await session.abortTransaction();
      res.status(400).json({ success: false, message: 'No valid IDs provided' });
      return;
    }
    const creditsToDelete = await VendorCredit.find({
      _id: { $in: validIds },
      organization: req.user.organizationId
    }).session(session);

    const combinedStockDelta = new Map<string, number>();
    for (const credit of creditsToDelete) {
      const stockDelta = buildVendorCreditStockDelta(
        (credit as any).items || [],
        (credit as any).status,
        [],
        "draft"
      );

      for (const [itemId, delta] of stockDelta.entries()) {
        combinedStockDelta.set(itemId, (combinedStockDelta.get(itemId) || 0) + delta);
      }
    }

    await applyVendorCreditStockDelta(req.user.organizationId.toString(), combinedStockDelta, session);

    const result = await VendorCredit.deleteMany({
      _id: { $in: validIds },
      organization: req.user.organizationId
    }).session(session);

    await session.commitTransaction();

    try {
      await reverseAndDeleteVendorCreditJournals(validIds, req.user.organizationId.toString());
    } catch (journalError: any) {
      console.error('[VENDOR CREDITS] Failed to reverse journals on bulk delete:', journalError?.message || journalError);
    }

    res.json({ success: true, message: `${result.deletedCount} vendor credits deleted` });
  } catch (error: any) {
    if (session.inTransaction()) {
      try {
        await session.abortTransaction();
      } catch (abortError) {
        console.error('Error aborting transaction:', abortError);
      }
    }
    console.error('Error in bulkDeleteVendorCredits:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting vendor credits',
      error: error.message
    });
  } finally {
    session.endSession();
  }
};

// Apply vendor credit to bills
export const applyVendorCreditToBills = async (req: AuthRequest, res: Response): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    if (!req.user || !req.user.organizationId) {
      await session.abortTransaction();
      session.endSession();
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const { allocations } = req.body; // Array of { billId, amount }

    if (!allocations || !Array.isArray(allocations)) {
      await session.abortTransaction();
      session.endSession();
      res.status(400).json({ success: false, message: 'Invalid allocations provided' });
      return;
    }

    const credit = await VendorCredit.findOne({ _id: id, organization: req.user.organizationId }).session(session);
    if (!credit) {
      await session.abortTransaction();
      session.endSession();
      res.status(404).json({ success: false, message: 'Vendor credit not found' });
      return;
    }

    const creditStatus = String(credit.status || '').toLowerCase().trim();
    if (creditStatus === 'draft' || creditStatus === 'cancelled') {
      await session.abortTransaction();
      session.endSession();
      res.status(400).json({
        success: false,
        message: `Vendor credit ${credit.vendorCreditNumber || id} is ${credit.status || 'not eligible'} and cannot be applied.`
      });
      return;
    }

    let totalApplied = 0;
    const currentCreditBalance = Number(credit.balance || credit.total || 0);

    for (const alloc of allocations) {
      const appliedAmount = Number(alloc.amount) || 0;
      if (appliedAmount <= 0) continue;

      const bill = await Bill.findOne({ _id: alloc.billId, organization: req.user.organizationId }).session(session);
      if (bill) {
        // Vendor credit must apply only to bills for the same vendor.
        if (bill.vendor?.toString() !== credit.vendor?.toString()) continue;

        const billStatus = String(bill.status || '').toLowerCase().trim();
        if (billStatus === 'draft' || billStatus === 'void' || billStatus === 'cancelled' || billStatus === 'paid') {
          await session.abortTransaction();
          session.endSession();
          res.status(400).json({
            success: false,
            message: `Bill ${bill.billNumber || bill._id} is ${bill.status || 'not eligible'} and cannot be credited.`
          });
          return;
        }

        const fallbackComputedBalance =
          Number(bill.total || 0) -
          Number((bill as any).paidAmount || 0) -
          Number((bill as any).vendorCreditsApplied || 0);
        const currentBalanceRaw =
          (bill.balance !== undefined && bill.balance !== null)
            ? bill.balance
            : fallbackComputedBalance;
        const billCurrentBalance = Math.max(0, Number(currentBalanceRaw || 0));

        if (billCurrentBalance <= 0) {
          await session.abortTransaction();
          session.endSession();
          res.status(400).json({
            success: false,
            message: `Bill ${bill.billNumber || bill._id} has no outstanding balance to credit.`
          });
          return;
        }

        if (appliedAmount > billCurrentBalance) {
          await session.abortTransaction();
          session.endSession();
          res.status(400).json({
            success: false,
            message: `Allocation exceeds bill balance for bill ${bill.billNumber || bill._id}. Balance: ${billCurrentBalance}, Attempted: ${appliedAmount}`
          });
          return;
        }

        if (totalApplied + appliedAmount > currentCreditBalance) {
          await session.abortTransaction();
          session.endSession();
          res.status(400).json({
            success: false,
            message: `Insufficient vendor credit balance. Available: ${currentCreditBalance}, Attempted: ${totalApplied + appliedAmount}`
          });
          return;
        }

        bill.vendorCreditsApplied = (bill as any).vendorCreditsApplied || 0;
        bill.vendorCreditsApplied = Number((bill as any).vendorCreditsApplied || 0) + appliedAmount;
        bill.balance = Math.max(
          0,
          Number(bill.total || 0) - Number((bill as any).paidAmount || 0) - Number((bill as any).vendorCreditsApplied || 0)
        );

        if (bill.balance <= 0) {
          bill.status = 'paid';
          bill.balance = 0;
        } else {
          bill.status = 'partially paid';
        }

        await bill.save({ session });
        totalApplied += appliedAmount;
      }
    }

    if (totalApplied <= 0) {
      await session.abortTransaction();
      session.endSession();
      res.status(400).json({
        success: false,
        message: 'No valid bill allocations to apply.'
      });
      return;
    }

    credit.balance = currentCreditBalance - totalApplied;
    if (credit.balance <= 0) {
      credit.status = 'closed';
      credit.balance = 0;
    } else {
      credit.status = 'open'; // It stays open if there is still balance
    }

    await credit.save({ session });

    await session.commitTransaction();
    res.json({ success: true, message: 'Credits applied successfully' });
  } catch (error: any) {
    if (session.inTransaction()) {
      try {
        await session.abortTransaction();
      } catch (abortError) {
        console.error('Error aborting transaction:', abortError);
      }
    }
    console.error('Error in applyVendorCreditToBills:', error);
    res.status(500).json({
      success: false,
      message: 'Error applying vendor credit',
      error: error.message
    });
  } finally {
    session.endSession();
  }
};

