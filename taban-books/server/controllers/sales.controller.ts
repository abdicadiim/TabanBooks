/**
 * Sales Controller
 * Handles Customers, Invoices, Quotes, Payments Received
 */

import { Request, Response } from "express";
import Customer from "../models/Customer.js";
import PaymentReceived from "../models/PaymentReceived.js";
import Quote from "../models/Quote.js";
import Salesperson from "../models/Salesperson.js";
import Invoice from "../models/Invoice.js";
import CreditNote from "../models/CreditNote.js";
import Item from "../models/Item.js";
import JournalEntry from "../models/JournalEntry.js";
import ChartOfAccount from "../models/ChartOfAccount.js";
import mongoose from "mongoose";
import TransactionNumberSeries from "../models/TransactionNumberSeries.js";
import SalesReceipt from '../models/SalesReceipt.js';
import Profile from '../models/Profile.js';
import Organization from '../models/Organization.js';
import type { AuthRequest } from '../middleware/auth.middleware.js';
import Refund from "../models/Refund.js";
import BankAccount from "../models/BankAccount.js";
import { sendReviewRequestEmail, sendInvitationEmail, sendEmail } from "../services/email.service.js";
import { executeQuoteCreateWorkflows } from "../services/workflowExecution.service.js";
import { updateAccountBalances } from "../utils/accounting.js";
import { generateInvoiceNumber } from "../utils/numberSeries.js";
import { buildSimplePdf } from "../utils/simplePdf.js";
import ApprovalRule from "../models/ApprovalRule.js";
import { evaluateCriteria } from "../utils/approvalEvaluator.js";
import Vendor from "../models/Vendor.js";
import RecurringInvoice from "../models/RecurringInvoice.js";
import RetainerInvoice from "../models/RetainerInvoice.js";
import DebitNote from "../models/DebitNote.js";
import Project from "../models/Project.js";
import Expense from "../models/Expense.js";
import RecurringExpense from "../models/RecurringExpense.js";
import BankTransaction from "../models/BankTransaction.js";
import BankRule from "../models/BankRule.js";
import Currency from "../models/Currency.js";
import { toPaymentMethodCode, toPaymentModeLabel } from "../utils/paymentModes.js";
import Tax from "../models/Tax.js";
import { isDebitNormalAccountType } from "../utils/chartOfAccounts.js";
import { resolveOrganizationBankAccount, syncLinkedBankTransaction } from "../utils/bankTransactionSync.js";
import {
  applyResourceVersionHeaders,
  buildResourceVersion,
  requestMatchesResourceVersion,
} from "../utils/resourceVersion.js";
import {
  generateNextEstimateNumber,
  mapEstimateAddressToSnapshot,
  mapEstimateStatusToQuoteStatus,
  mapQuoteToEstimate,
} from "../utils/estimates.js";

const RETAINER_NUMBER_PREFIX = "RET-";
const RETAINER_NUMBER_DIGITS = 6;

const buildNextRetainerInvoiceNumber = async (
  organizationId: mongoose.Types.ObjectId,
  preferredNumber?: string
): Promise<string> => {
  const preferred = String(preferredNumber || "").trim();
  const prefixMatch = preferred.match(/^([A-Za-z-]*?)(\d+)$/);
  const prefix = prefixMatch?.[1] || RETAINER_NUMBER_PREFIX;
  const existing = await RetainerInvoice.find({
    organization: organizationId,
    retainerInvoiceNumber: new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\d+$`, "i"),
  })
    .select("retainerInvoiceNumber")
    .lean();

  let highest = 0;
  for (const row of existing) {
    const value = String((row as any)?.retainerInvoiceNumber || "");
    const match = value.match(new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\d+)$`, "i"));
    if (!match) continue;
    highest = Math.max(highest, parseInt(match[1], 10) || 0);
  }

  const nextNumber = Math.max(highest + 1, 1);
  return `${prefix}${String(nextNumber).padStart(RETAINER_NUMBER_DIGITS, "0")}`;
};



interface CustomerQuery {
  page?: string;
  limit?: string;
  search?: string;
  status?: string;
  customerType?: string;
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

const normalizeObjectIdArray = (value: any): mongoose.Types.ObjectId[] => {
  if (!Array.isArray(value)) return [];

  const uniqueIds = Array.from(
    new Set(
      value
        .map((entry: any) => {
          if (!entry) return "";
          if (typeof entry === "string" || typeof entry === "number") return String(entry).trim();
          const raw = entry._id || entry.id || entry.projectId || entry.customerId || "";
          return String(raw || "").trim();
        })
        .filter(Boolean)
    )
  );

  return uniqueIds
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));
};

const normalizeOptionalObjectId = (value: any): mongoose.Types.ObjectId | undefined => {
  if (value === undefined || value === null || value === "") return undefined;
  const normalized = String(value).trim();
  if (!normalized || !mongoose.Types.ObjectId.isValid(normalized)) return undefined;
  return new mongoose.Types.ObjectId(normalized);
};

const normalizeRecurringAttachedFiles = (value: any): Array<Record<string, any>> => {
  if (!Array.isArray(value)) return [];

  return value
    .filter((file) => file && typeof file === "object")
    .map((file) => ({
      name: String(file.name || file.fileName || "").trim(),
      url: String(file.url || "").trim(),
      size: Number(file.size || file.fileSize || 0) || 0,
      mimeType: String(file.mimeType || file.type || "").trim(),
      documentId: String(file.documentId || file.id || file._id || "").trim(),
      fileName: String(file.fileName || "").trim(),
      filePath: String(file.filePath || "").trim(),
      uploadedAt: file.uploadedAt ? new Date(file.uploadedAt) : new Date(),
    }))
    .filter((file) => file.name || file.documentId || file.url || file.filePath);
};

const escapeRegex = (value: string): string => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const toNumericValue = (value: any, fallback: number = 0): number => {
  if (value === null || value === undefined || value === "") return fallback;
  const parsed = Number.parseFloat(String(value).replace(/,/g, "").replace("%", "").trim());
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseEstimateDiscountInput = (value: any): { value: number; mode: "percent" | "amount" } => {
  if (value === null || value === undefined || value === "") {
    return { value: 0, mode: "amount" };
  }

  if (typeof value === "string" && value.includes("%")) {
    return { value: toNumericValue(value, 0), mode: "percent" };
  }

  return { value: toNumericValue(value, 0), mode: "amount" };
};

const normalizeEstimateFilterStatus = (value: any): string | undefined => {
  const raw = String(value || "").trim();
  if (!raw) return undefined;
  if (/^status\./i.test(raw)) {
    return mapEstimateStatusToQuoteStatus(raw.replace(/^status\./i, ""));
  }
  return mapEstimateStatusToQuoteStatus(raw);
};

const toMongoOrExternalId = (value: any): string | undefined => {
  if (!value) return undefined;
  if (typeof value === "string" || typeof value === "number") return String(value).trim() || undefined;
  if (value instanceof mongoose.Types.ObjectId) return value.toString();
  if (typeof value === "object") {
    const raw = value._id || value.id;
    if (raw) return String(raw).trim() || undefined;
  }
  return undefined;
};

// Get all customers
export const getAllCustomers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Check database connection
    if (mongoose.connection.readyState !== 1) {
      res.status(503).json({
        success: false,
        message: 'Database not connected',
        error: 'MongoDB connection is not established. Please check your database connection.'
      });
      return;
    }

    // Check if Customer model is available
    if (!Customer) {
      throw new Error('Customer model is not available');
    }

    // Check authentication
    if (!req.user || !req.user.organizationId) {
      console.error('[CUSTOMERS] No user or organizationId found. req.user:', req.user);
      res.status(401).json({
        success: false,
        message: 'Unauthorized - Organization ID required',
        error: 'User authentication or organization ID is missing'
      });
      return;
    }

    const {
      page = '1',
      limit = '50',
      search = '',
      status,
      customerType,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query as CustomerQuery;

    // Conditional list versioning (SWR-friendly).
    // We version the underlying customer collection and include the query params as "extra" so
    // different list views can cache independently.
    const orgIdRaw = String(req.user.organizationId || "").trim();
    const orgFilterForVersion: any = mongoose.Types.ObjectId.isValid(orgIdRaw)
      ? {
          $or: [
            { organization: new mongoose.Types.ObjectId(orgIdRaw) },
            { organization: orgIdRaw },
            { organization: null },
            { organization: { $exists: false } },
          ],
        }
      : {
          $or: [
            { organization: orgIdRaw },
            { organization: null },
            { organization: { $exists: false } },
          ],
        };

    const [latestCustomer, customerCount] = await Promise.all([
      Customer.findOne(orgFilterForVersion).sort({ updatedAt: -1 }).select("updatedAt").lean(),
      Customer.countDocuments(orgFilterForVersion),
    ]);

    const versionState = buildResourceVersion("customers", [
      {
        key: "customers",
        id: orgIdRaw,
        updatedAt: (latestCustomer as any)?.updatedAt,
        count: customerCount,
        extra: JSON.stringify({
          page,
          limit,
          search,
          status: status ?? "",
          customerType: customerType ?? "",
          sortBy,
          sortOrder,
        }),
      },
    ]);
    applyResourceVersionHeaders(res, versionState);
    if (requestMatchesResourceVersion(req, versionState)) {
      res.status(304).end();
      return;
    }

    // Build query
    const query: any = {};

    // Filter by organization - always required
    let orgFilter: any = {};
    try {
      const orgId = req.user.organizationId;
      if (!orgId) {
        console.error('[CUSTOMERS] Organization ID is missing');
        res.status(400).json({
          success: false,
          message: 'Organization ID is required',
          error: 'Organization ID is missing from request'
        });
        return;
      }

      // Handle both ObjectId and string formats for organization field
      // Also include customers without organization field (legacy data)
      if (mongoose.Types.ObjectId.isValid(orgId as string)) {
        try {
          const orgObjectId = new mongoose.Types.ObjectId(orgId as string);
          // Try both ObjectId and string formats, plus null/undefined for legacy data
          orgFilter = {
            $or: [
              { organization: orgObjectId },
              { organization: String(orgId) },
              { organization: null },
              { organization: { $exists: false } }
            ]
          };
        } catch (conversionError: any) {
          console.warn('[CUSTOMERS] Error converting to ObjectId, using string format:', conversionError.message);
          orgFilter = {
            $or: [
              { organization: String(orgId) },
              { organization: null },
              { organization: { $exists: false } }
            ]
          };
        }
      } else {
        // If not a valid ObjectId format, query as string or null/undefined
        orgFilter = {
          $or: [
            { organization: String(orgId) },
            { organization: null },
            { organization: { $exists: false } }
          ]
        };
      }
    } catch (error: any) {
      console.error('[CUSTOMERS] Error handling organizationId:', error);
      res.status(400).json({
        success: false,
        message: 'Invalid organization ID format',
        error: error.message
      });
      return;
    }

    // Combine organization filter with other filters using $and
    const andConditions: any[] = [orgFilter];

    // Search filter
    if (search && search.trim()) {
      andConditions.push({
        $or: [
          { displayName: { $regex: search.trim(), $options: 'i' } },
          { companyName: { $regex: search.trim(), $options: 'i' } },
          { email: { $regex: search.trim(), $options: 'i' } },
          { firstName: { $regex: search.trim(), $options: 'i' } },
          { lastName: { $regex: search.trim(), $options: 'i' } },
          { workPhone: { $regex: search.trim(), $options: 'i' } },
          { customerNumber: { $regex: search.trim(), $options: 'i' } }
        ]
      });
    }

    // Status filter
    if (status) {
      andConditions.push({ status: status });
    }

    // Customer type filter
    if (customerType) {
      andConditions.push({ customerType: customerType });
    }

    // If we have multiple conditions, use $and; otherwise use the single condition
    if (andConditions.length > 1) {
      query.$and = andConditions;
    } else if (andConditions.length === 1) {
      Object.assign(query, andConditions[0]);
    } else {
      Object.assign(query, orgFilter);
    }

    // Sorting - validate sortBy field exists in schema
    const validSortFields = ['createdAt', 'updatedAt', 'displayName', 'name', 'email', 'companyName', 'firstName', 'lastName', 'customerNumber'];
    const safeSortBy = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const sort: any = {};
    sort[safeSortBy] = sortOrder === 'asc' ? 1 : -1;

    // Pagination
    const pageNum = parseInt(page as string) || 1;
    const limitNum = Math.min(100, parseInt(limit as string) || 50);
    const skip = (pageNum - 1) * limitNum;

    // Execute queries in parallel for performance
    const [customers, total] = await Promise.all([
      Customer.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .select('-__v')
        .lean(),
      Customer.countDocuments(query)
    ]);

    // Handle legacy data / fallback logic if no results found
    let finalCustomers = customers;
    let finalTotal = total;

    if (customers.length === 0 && (!search && !status && !customerType)) {
      // If we literally found nothing for this org, check if this is a fresh org or if we should check legacy
      // This is a minimal fallback for safety
    }

    // Format response to ensure name and displayName are always set for display
    const formattedCustomers = finalCustomers.map((customer: any) => {
      try {
        if (!customer) return null;

        // Build display name from available fields
        const firstName = customer.firstName || '';
        const lastName = customer.lastName || '';
        const companyName = customer.companyName || '';
        const existingName = customer.name || '';
        const existingDisplayName = customer.displayName || '';

        let displayName = existingDisplayName;
        if (!displayName || displayName.trim() === '') {
          if (firstName || lastName) {
            displayName = `${firstName} ${lastName}`.trim();
          } else if (companyName) {
            displayName = companyName.trim();
          } else {
            displayName = existingName || 'Customer';
          }
        }

        let name = existingName;
        if (!name || name.trim() === '') {
          name = displayName;
        }

        customer.name = name;
        customer.displayName = displayName;
        customer.id = customer._id?.toString() || customer.id;

        return customer;
      } catch (e) {
        return null;
      }
    }).filter(c => c !== null);

    res.json({
      success: true,
      data: formattedCustomers,
      pagination: {
        total: finalTotal,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(finalTotal / limitNum)
      },
      version_id: versionState.version_id,
      last_updated: versionState.last_updated,
    });
  } catch (error: any) {
    console.error('Error in getAllCustomers:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code,
      query: req.query,
      hasUser: !!req.user,
      organizationId: req.user?.organizationId,
      dbReadyState: mongoose.connection.readyState
    });

    // Check if response was already sent
    if (res.headersSent) {
      console.error('Response already sent, cannot send error response');
      return;
    }

    // Return more detailed error in development
    const errorResponse: any = {
      success: false,
      message: 'Error fetching customers',
      error: error.message || 'Unknown error occurred'
    };

    if (process.env.NODE_ENV === 'development') {
      errorResponse.stack = error.stack;
      errorResponse.details = {
        name: error.name,
        query: req.query
      };
    }

    res.status(500).json(errorResponse);
  }
};

/**
 * Get next customer number
 * POST /api/customers/next-number
 */
export const getNextCustomerNumber = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.organizationId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { prefix = "CUS-", start = "0001" } = req.body;
    const orgId = req.user.organizationId;

    // Find the highest existing customer number with this prefix
    const latestCustomer = await Customer.findOne({
      organization: orgId,
      customerNumber: { $regex: `^${escapeRegex(prefix)}` }
    })
    .sort({ customerNumber: -1 })
    .lean();

    let nextNumber = start;
    if (latestCustomer && latestCustomer.customerNumber) {
      const currentNumberStr = latestCustomer.customerNumber.replace(prefix, "");
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
    console.error("Error generating next customer number:", error);
    res.status(500).json({
      success: false,
      message: "Error generating next customer number",
      error: error.message
    });
  }
};

// Get single customer by ID
export const getCustomerById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Check if it's a valid MongoDB ObjectId (24 hex characters)
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(id);

    if (!isValidObjectId) {
      res.status(404).json({
        success: false,
        message: 'Customer not found - Invalid ID format',
        hint: `The customer ID "${id}" is not a valid MongoDB ObjectId (must be 24 hex characters). This customer may have been created with an old ID format. Please delete and recreate it.`,
        invalidId: true
      });
      return;
    }

    const customer = await Customer.findById(id)
      .select('-__v');

    if (!customer) {
      res.status(404).json({
        success: false,
        message: 'Customer not found',
        hint: `No customer found with ID "${id}". Please check the customer list.`
      });
      return;
    }

    // Ensure name and displayName are always present - handle null/undefined safely
    try {
      const firstName = customer.firstName || '';
      const lastName = customer.lastName || '';
      const companyName = customer.companyName || '';
      const existingName = customer.name || '';
      const existingDisplayName = customer.displayName || '';

      // Build display name from available fields
      let displayName = existingDisplayName;
      if (!displayName || (typeof displayName === 'string' && displayName.trim() === '')) {
        if (firstName || lastName) {
          displayName = `${firstName} ${lastName}`.trim();
        } else if (companyName) {
          displayName = companyName.trim();
        } else if (existingName) {
          displayName = existingName.trim();
        } else {
          displayName = 'Customer';
        }
      }

      // Build name from available fields (should match displayName)
      let name = existingName;
      if (!name || (typeof name === 'string' && name.trim() === '')) {
        name = displayName || companyName || `${firstName} ${lastName}`.trim() || 'Customer';
      }

      // Ensure both are trimmed strings
      customer.name = (typeof name === 'string' ? name.trim() : String(name || 'Customer')) || 'Customer';
      customer.displayName = (typeof displayName === 'string' ? displayName.trim() : String(displayName || 'Customer')) || customer.name || 'Customer';
    } catch (nameError: any) {
      console.error('[CUSTOMER] Error processing name/displayName:', nameError);
      // Fallback to safe defaults
      customer.name = customer.name || customer.displayName || customer.companyName || 'Customer';
      customer.displayName = customer.displayName || customer.name || customer.companyName || 'Customer';
    }

    res.json({
      success: true,
      data: customer
    });
  } catch (error: any) {
    console.error('Error in getCustomerById:', error);

    // Check if it's a MongoDB cast error (invalid ObjectId)
    if (error.name === 'CastError' || error.message.includes('Cast to ObjectId failed')) {
      res.status(404).json({
        success: false,
        message: 'Invalid customer ID format',
        hint: `The ID "${req.params.id}" is not a valid MongoDB ObjectId. Please use a customer with a valid ID from the customer list.`,
        invalidId: true
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Error fetching customer',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Create new customer
export const createCustomer = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Ensure displayName and name are always provided and not empty
    let displayName: string = req.body.displayName || req.body.name;

    // If displayName is empty, try to construct it from other fields
    if (!displayName || displayName.trim() === '') {
      const firstName = req.body.firstName || '';
      const lastName = req.body.lastName || '';
      const companyName = req.body.companyName || '';

      if (firstName || lastName) {
        displayName = `${firstName} ${lastName}`.trim();
      } else if (companyName) {
        displayName = companyName.trim();
      } else {
        // Fallback to "Customer" if nothing is provided
        displayName = 'Customer';
      }
    }

    // Ensure displayName is trimmed and not empty
    displayName = displayName.trim() || 'Customer';
    const name = displayName; // name should match displayName

    // Prepare customer data - start with req.body but override with our computed values
    const customerData: any = {
      ...req.body,
      name: name, // Always set name to our computed value
      displayName: displayName, // Always set displayName to our computed value
      receivables: parseFloat(req.body.openingBalance || req.body.receivables || '0'),
      openingBalance: req.body.openingBalance || '0.00',
      organization: req.body.organization || req.user?.organizationId || null,
      createdBy: req.body.createdBy || req.user?.userId || null
    };

    // Remove undefined values and empty strings for name/displayName
    Object.keys(customerData).forEach(key => {
      if (customerData[key] === undefined) {
        delete customerData[key];
      }
      // Ensure name and displayName are never empty strings
      if ((key === 'name' || key === 'displayName') && (!customerData[key] || customerData[key].trim() === '')) {
        customerData[key] = name; // Use our computed name
      }
    });

    // Final check: ensure name and displayName are always set
    if (!customerData.name || customerData.name.trim() === '') {
      customerData.name = name;
    }
    if (!customerData.displayName || customerData.displayName.trim() === '') {
      customerData.displayName = displayName;
    }

    // Handle billing address
    if (req.body.billingAttention || req.body.billingCountry) {
      customerData.billingAddress = {
        attention: req.body.billingAttention || '',
        country: req.body.billingCountry || '',
        street1: req.body.billingStreet1 || '',
        street2: req.body.billingStreet2 || '',
        city: req.body.billingCity || '',
        state: req.body.billingState || '',
        zipCode: req.body.billingZipCode || '',
        phone: req.body.billingPhone || '',
        fax: req.body.billingFax || ''
      };
    }

    // Handle shipping address
    if (req.body.shippingAttention || req.body.shippingCountry) {
      customerData.shippingAddress = {
        attention: req.body.shippingAttention || '',
        country: req.body.shippingCountry || '',
        street1: req.body.shippingStreet1 || '',
        street2: req.body.shippingStreet2 || '',
        city: req.body.shippingCity || '',
        state: req.body.shippingState || '',
        zipCode: req.body.shippingZipCode || '',
        phone: req.body.shippingPhone || '',
        fax: req.body.shippingFax || ''
      };
    }

    // Log the data being saved for debugging
    console.log('Creating customer with data:', {
      name: customerData.name,
      displayName: customerData.displayName,
      companyName: customerData.companyName,
      firstName: customerData.firstName,
      lastName: customerData.lastName
    });

    const customer = await Customer.create(customerData);

    // Ensure name and displayName are present in the response
    const customerResponse: any = customer.toObject ? customer.toObject() : customer;

    // Double-check that name and displayName are set
    if (!customerResponse.name || customerResponse.name.trim() === '') {
      customerResponse.name = customerResponse.displayName || customerResponse.companyName ||
        `${customerResponse.firstName || ''} ${customerResponse.lastName || ''}`.trim() || 'Customer';
    }
    if (!customerResponse.displayName || customerResponse.displayName.trim() === '') {
      customerResponse.displayName = customerResponse.name || customerResponse.companyName ||
        `${customerResponse.firstName || ''} ${customerResponse.lastName || ''}`.trim() || 'Customer';
    }

    // Ensure both are trimmed
    customerResponse.name = customerResponse.name.trim();
    customerResponse.displayName = customerResponse.displayName.trim();

    console.log('Customer created successfully:', {
      _id: customerResponse._id,
      name: customerResponse.name,
      displayName: customerResponse.displayName
    });

    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      data: customerResponse
    });
  } catch (error: any) {
    console.error('Error creating customer:', error);
    res.status(400).json({
      success: false,
      message: 'Error creating customer',
      error: error.message,
      ...(error.errors && { validationErrors: error.errors })
    });
  }
};

// Update customer
export const updateCustomer = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
      return;
    }

    // Ensure displayName and name are always provided
    let displayName: string = req.body.displayName || customer.displayName || customer.name;
    if (!displayName || displayName.trim() === '') {
      displayName = "Customer";
    }
    displayName = displayName.trim();
    const name = displayName;

    // Normalize status to schema enum (active/inactive)
    let normalizedStatus: "active" | "inactive" | undefined;
    const rawStatus = typeof req.body.status === "string" ? req.body.status.trim().toLowerCase() : "";
    if (rawStatus === "active" || rawStatus === "inactive") {
      normalizedStatus = rawStatus as "active" | "inactive";
    } else if (typeof req.body.isActive === "boolean") {
      normalizedStatus = req.body.isActive ? "active" : "inactive";
    }

    // Prepare update data
    const updateData: any = {
      ...req.body,
      displayName: displayName,
      name: name,
      updatedBy: req.body.updatedBy || null
    };

    if (normalizedStatus) {
      updateData.status = normalizedStatus;
    }

    // Handle profileImage if provided
    if (req.body.profileImage !== undefined) {
      updateData.profileImage = req.body.profileImage;
    }

    // These are UI helper flags; keep status as the source of truth
    if (Object.prototype.hasOwnProperty.call(updateData, "isActive")) {
      delete updateData.isActive;
    }
    if (Object.prototype.hasOwnProperty.call(updateData, "isInactive")) {
      delete updateData.isInactive;
    }

    // Remove undefined values (but keep null and empty strings for profileImage to allow clearing)
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    // Update receivables from openingBalance if provided
    if (req.body.openingBalance !== undefined) {
      updateData.receivables = parseFloat(req.body.openingBalance || '0');
      updateData.openingBalance = req.body.openingBalance;
    }

    if (req.body.billingAddress && typeof req.body.billingAddress === "object") {
      updateData.billingAddress = {
        ...(((customer.billingAddress as any)?.toObject?.()) || customer.billingAddress || {}),
        ...req.body.billingAddress,
      };
    }

    if (req.body.shippingAddress && typeof req.body.shippingAddress === "object") {
      updateData.shippingAddress = {
        ...(((customer.shippingAddress as any)?.toObject?.()) || customer.shippingAddress || {}),
        ...req.body.shippingAddress,
      };
    }

    // Handle billing address
    if (req.body.billingAttention !== undefined || req.body.billingCountry !== undefined) {
      updateData.billingAddress = {
        attention: req.body.billingAttention || customer.billingAddress?.attention || '',
        country: req.body.billingCountry || customer.billingAddress?.country || '',
        street1: req.body.billingStreet1 || customer.billingAddress?.street1 || '',
        street2: req.body.billingStreet2 || customer.billingAddress?.street2 || '',
        city: req.body.billingCity || customer.billingAddress?.city || '',
        state: req.body.billingState || customer.billingAddress?.state || '',
        zipCode: req.body.billingZipCode || customer.billingAddress?.zipCode || '',
        phone: req.body.billingPhone || customer.billingAddress?.phone || '',
        fax: req.body.billingFax || customer.billingAddress?.fax || ''
      };
    }

    // Handle shipping address
    if (req.body.shippingAttention !== undefined || req.body.shippingCountry !== undefined) {
      updateData.shippingAddress = {
        attention: req.body.shippingAttention || customer.shippingAddress?.attention || '',
        country: req.body.shippingCountry || customer.shippingAddress?.country || '',
        street1: req.body.shippingStreet1 || customer.shippingAddress?.street1 || '',
        street2: req.body.shippingStreet2 || customer.shippingAddress?.street2 || '',
        city: req.body.shippingCity || customer.shippingAddress?.city || '',
        state: req.body.shippingState || customer.shippingAddress?.state || '',
        zipCode: req.body.shippingZipCode || customer.shippingAddress?.zipCode || '',
        phone: req.body.shippingPhone || customer.shippingAddress?.phone || '',
        fax: req.body.shippingFax || customer.shippingAddress?.fax || ''
      };
    }

    // Validate and clean contactPersons if provided
    if (req.body.contactPersons !== undefined && Array.isArray(req.body.contactPersons)) {
      updateData.contactPersons = req.body.contactPersons.map((cp: any) => {
        const contactPerson: any = {
          salutation: cp.salutation || '',
          firstName: (cp.firstName || '').trim(),
          lastName: (cp.lastName || '').trim(),
          email: cp.email || '',
          workPhone: cp.workPhone || '',
          mobile: cp.mobile || '',
          designation: cp.designation || '',
          department: cp.department || '',
          skypeName: cp.skypeName || cp.skype || '',
          isPrimary: cp.isPrimary || false,
          enablePortal: cp.enablePortal || cp.hasPortalAccess || false,
          hasPortalAccess: cp.hasPortalAccess || cp.enablePortal || false
        };

        if (cp._id) {
          contactPerson._id = cp._id;
        }

        return contactPerson;
      }).filter((cp: any) => cp.firstName);
    }

    // Validate and clean documents if provided
    if (req.body.documents !== undefined && Array.isArray(req.body.documents)) {
      updateData.documents = req.body.documents.map((doc: any) => ({
        documentId: doc.documentId || doc.id || undefined,
        name: doc.name || 'Unknown',
        size: doc.size || '',
        url: doc.url || '',
        uploadedAt: doc.uploadedAt || new Date()
      }));
    }

    // Validate profileImage if provided
    if (updateData.profileImage !== undefined) {
      // Allow empty string, null, or valid base64 string
      if (updateData.profileImage !== null && updateData.profileImage !== '' && typeof updateData.profileImage !== 'string') {
        res.status(400).json({
          success: false,
          message: 'Invalid profileImage format. Must be a string, null, or empty string.'
        });
        return;
      }
      // Limit base64 string length (e.g., max 5MB image = ~6.7MB base64)
      if (typeof updateData.profileImage === 'string' && updateData.profileImage.length > 7000000) {
        res.status(400).json({
          success: false,
          message: 'Profile image is too large. Maximum size is 5MB.'
        });
        return;
      }
    }

    const updatedCustomer = await Customer.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true
      }
    );

    if (!updatedCustomer) {
      res.status(404).json({
        success: false,
        message: 'Customer not found after update'
      });
      return;
    }

    // Ensure response data is clean
    const customerResponse: any = updatedCustomer.toObject ? updatedCustomer.toObject() : updatedCustomer;

    res.json({
      success: true,
      message: 'Customer updated successfully',
      data: customerResponse
    });
  } catch (error: any) {
    console.error('Error updating customer:', error);

    let errorMessage = error.message;
    let errorDetails: any = {};

    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors || {}).map((err: any) => ({
        field: err.path,
        message: err.message,
        value: err.value
      }));
      errorMessage = validationErrors.length > 0
        ? `Validation failed: ${validationErrors.map((e: any) => `${e.field}: ${e.message}`).join(', ')}`
        : 'Validation failed';
      errorDetails = { validationErrors };
    } else if (error.name === 'CastError') {
      errorMessage = `Invalid data type for field: ${error.path}`;
      errorDetails = { path: error.path, value: error.value };
    }

    res.status(400).json({
      success: false,
      message: 'Error updating customer',
      error: errorMessage,
      ...(process.env.NODE_ENV === 'development' && {
        details: errorDetails,
        stack: error.stack
      })
    });
  }
};

// Send invitation to customer
export const sendInvitation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { email, method = 'email' } = req.body;

    // Validate customer exists
    const customer = await Customer.findById(id);
    if (!customer) {
      res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
      return;
    }

    // Determine email address
    const inviteEmail = email || customer.email || customer.contactPersons?.[0]?.email;
    if (!inviteEmail || !inviteEmail.trim()) {
      res.status(400).json({
        success: false,
        message: 'No email address found for this customer. Please provide an email address.'
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail.trim())) {
      res.status(400).json({
        success: false,
        message: 'Invalid email address format'
      });
      return;
    }

    // Log invitation request
    console.log(`[INVITATION] Sending invitation to ${inviteEmail.trim()} for customer ${customer.displayName || customer.name} via ${method}`);
    console.log(`[INVITATION] Customer ID: ${id}, Organization: ${req.user?.organizationId || 'N/A'}`);

    // Send email using email service (only if method is 'email')
    let emailResult: any = null;
    if (method === 'email') {
      try {
        const inviteLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/portal/invite/${id}`;
        emailResult = await sendInvitationEmail({
          customerName: customer.displayName || customer.name,
          inviteLink: inviteLink,
          email: inviteEmail.trim(),
          organizationId: req.user.organizationId,
          from: req.user?.email || null,
        } as any);
        console.log(`[INVITATION] Email processed:`, emailResult);

        // Update customer status
        customer.portalStatus = 'invited';
        customer.enablePortal = true;
        await customer.save();
      } catch (emailError: any) {
        console.error('[INVITATION] Error sending email:', emailError.message || emailError);
        // Still return success - email was logged even if not sent
        emailResult = {
          success: true,
          logged: true,
          note: 'Email logged (SMTP not configured)'
        };
      }
    }

    const invitationData = {
      customerId: id,
      customerName: customer.displayName || customer.name,
      email: inviteEmail.trim(),
      method: method,
      sentAt: new Date(),
      sentBy: req.user?.userId || null,
      organizationId: req.user?.organizationId || null,
      emailResult: emailResult || { success: method !== 'email', note: method === 'email' ? 'Email service not configured' : 'Social media method' }
    };

    res.status(200).json({
      success: true,
      message: method === 'email' && emailResult?.success
        ? `Invitation email sent successfully to ${inviteEmail.trim()}`
        : method === 'email'
          ? `Failed to send invitation email`
          : `Invitation prepared for ${inviteEmail.trim()}`,
      data: invitationData
    });
  } catch (error: any) {
    console.error('[INVITATION] Error sending invitation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send invitation',
      error: error.message
    });
  }
};

// Send review request email
export const sendReviewRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { email, subject, body } = req.body;

    // Validate customer exists
    const customer = await Customer.findById(id);
    if (!customer) {
      res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
      return;
    }

    // Determine email address
    const recipientEmail = email || customer.email || customer.contactPersons?.[0]?.email;
    if (!recipientEmail || !recipientEmail.trim()) {
      res.status(400).json({
        success: false,
        message: 'No email address found for this customer. Please provide an email address.'
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail.trim())) {
      res.status(400).json({
        success: false,
        message: 'Invalid email address format'
      });
      return;
    }

    // Validate required fields
    if (!subject || !subject.trim()) {
      res.status(400).json({
        success: false,
        message: 'Email subject is required'
      });
      return;
    }

    if (!body || !body.trim()) {
      res.status(400).json({
        success: false,
        message: 'Email body is required'
      });
      return;
    }

    // Log email request
    console.log(`[REVIEW REQUEST] Sending review request email to ${recipientEmail.trim()} for customer ${customer.displayName || customer.name}`);
    console.log(`[REVIEW REQUEST] Customer ID: ${id}, Organization: ${req.user?.organizationId || 'N/A'}`);
    console.log(`[REVIEW REQUEST] Subject: ${subject}`);
    console.log(`[REVIEW REQUEST] Body preview: ${body.substring(0, 100)}...`);

    // Send email using email service
    let emailResult: any = null;
    try {
      emailResult = await sendReviewRequestEmail({
        to: recipientEmail.trim(),
        subject: subject.trim(),
        body: body.trim(),
        from: req.user?.email || null,
        organizationId: req.user.organizationId,
      });

      // Update customer record
      await Customer.findByIdAndUpdate(id, {
        $set: {
          reviewRequested: true,
          reviewRequestedAt: new Date()
        }
      });

      console.log(`[REVIEW REQUEST] Email processed and customer record updated:`, emailResult);
    } catch (emailError: any) {
      console.error('[REVIEW REQUEST] Error sending email:', emailError.message || emailError);
      // Still return success - email was logged even if not sent
      emailResult = {
        success: true,
        logged: true,
        note: 'Email logged (SMTP not configured)'
      };
    }

    const emailData = {
      customerId: id,
      customerName: customer.displayName || customer.name,
      recipientEmail: recipientEmail.trim(),
      subject: subject.trim(),
      body: body.trim(),
      sentAt: new Date(),
      sentBy: req.user?.userId || null,
      organizationId: req.user?.organizationId || null,
      emailResult: emailResult
    };

    res.status(200).json({
      success: true,
      message: `Review request email sent successfully to ${recipientEmail.trim()}`,
      data: emailData
    });
  } catch (error: any) {
    console.error('[REVIEW REQUEST] Error sending review request email:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send review request email',
      error: error.message
    });
  }
};

export const deleteCustomer = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
      return;
    }

    await Customer.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Customer deleted successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error deleting customer',
      error: error.message
    });
  }
};

// Bulk delete customers
export const deleteCustomers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Check authentication
    if (!req.user || !req.user.organizationId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized - Organization ID required',
        error: 'User authentication or organization ID is missing'
      });
      return;
    }

    const { customerIds } = req.body;

    if (!customerIds || !Array.isArray(customerIds) || customerIds.length === 0) {
      res.status(400).json({
        success: false,
        message: 'Please provide an array of customer IDs'
      });
      return;
    }

    // Build organization filter
    const orgId = req.user.organizationId;
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

    // Only delete customers that belong to the user's organization
    // Use $and to properly combine _id filter with organization filter
    const deleteQuery: any = {
      $and: [
        { _id: { $in: customerIds } },
        orgFilter
      ]
    };

    const result = await Customer.deleteMany(deleteQuery);

    res.json({
      success: true,
      message: `${result.deletedCount} customer(s) deleted successfully`,
      deletedCount: result.deletedCount
    });
  } catch (error: any) {
    console.error('[CUSTOMERS BULK DELETE] Error deleting customers:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting customers',
      error: error.message || 'Unknown error occurred'
    });
  }
};

// Bulk update customers
export const bulkUpdateCustomers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Check authentication
    if (!req.user || !req.user.organizationId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized - Organization ID required',
        error: 'User authentication or organization ID is missing'
      });
      return;
    }

    const { customerIds, updateData } = req.body;

    if (!customerIds || !Array.isArray(customerIds) || customerIds.length === 0) {
      res.status(400).json({
        success: false,
        message: 'Please provide an array of customer IDs'
      });
      return;
    }

    if (!updateData || Object.keys(updateData).length === 0) {
      res.status(400).json({
        success: false,
        message: 'Please provide update data'
      });
      return;
    }

    const normalizedUpdateData: any = { ...updateData };
    const rawStatus = typeof normalizedUpdateData.status === "string"
      ? normalizedUpdateData.status.trim().toLowerCase()
      : "";

    if (rawStatus) {
      if (rawStatus !== "active" && rawStatus !== "inactive") {
        res.status(400).json({
          success: false,
          message: "Invalid status. Use 'active' or 'inactive'"
        });
        return;
      }
      normalizedUpdateData.status = rawStatus;
    } else if (typeof normalizedUpdateData.isActive === "boolean") {
      normalizedUpdateData.status = normalizedUpdateData.isActive ? "active" : "inactive";
    }

    if (Object.prototype.hasOwnProperty.call(normalizedUpdateData, "isActive")) {
      delete normalizedUpdateData.isActive;
    }
    if (Object.prototype.hasOwnProperty.call(normalizedUpdateData, "isInactive")) {
      delete normalizedUpdateData.isInactive;
    }

    // Build organization filter
    const orgId = req.user.organizationId;
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

    // Only update customers that belong to the user's organization
    // Use $and to properly combine _id filter with organization filter
    const updateQuery: any = {
      $and: [
        { _id: { $in: customerIds } },
        orgFilter
      ]
    };

    const result = await Customer.updateMany(
      updateQuery,
      {
        $set: {
          ...normalizedUpdateData,
          updatedBy: req.body.updatedBy || null,
          updatedAt: new Date()
        }
      }
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} customer(s) updated successfully`,
      modifiedCount: result.modifiedCount
    });
  } catch (error: any) {
    console.error('[CUSTOMERS BULK UPDATE] Error updating customers:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating customers',
      error: error.message || 'Unknown error occurred'
    });
  }
};

// Merge customers
export const mergeCustomers = async (req: AuthRequest, res: Response): Promise<void> => {
  const session = await mongoose.startSession();

  try {
    if (!req.user || !req.user.organizationId) {
      res.status(401).json({
        success: false,
        message: "Unauthorized - Organization ID required"
      });
      return;
    }

    const masterCustomerId = String(req.body.masterCustomerId || req.body.masterId || "").trim();
    const rawSourceIds = Array.isArray(req.body.sourceCustomerIds)
      ? req.body.sourceCustomerIds
      : (Array.isArray(req.body.sourceIds) ? req.body.sourceIds : []);

    const sourceCustomerIds: string[] = Array.from(
      new Set(
        rawSourceIds
          .map((id: any) => String(id || "").trim())
          .filter(Boolean)
          .filter((id: string) => id !== masterCustomerId)
      )
    ) as string[];

    if (!masterCustomerId) {
      res.status(400).json({
        success: false,
        message: "masterCustomerId is required"
      });
      return;
    }

    if (sourceCustomerIds.length === 0) {
      res.status(400).json({
        success: false,
        message: "Please provide at least one source customer to merge"
      });
      return;
    }

    const allIds: string[] = Array.from(new Set([masterCustomerId, ...sourceCustomerIds])) as string[];
    const objectIds: mongoose.Types.ObjectId[] = [];

    for (const id of allIds) {
      const parsed = toObjectId(id);
      if (!parsed) {
        res.status(400).json({
          success: false,
          message: `Invalid customer ID: ${id}`
        });
        return;
      }
      objectIds.push(parsed);
    }

    const masterObjectId = toObjectId(masterCustomerId);
    if (!masterObjectId) {
      res.status(400).json({
        success: false,
        message: "Invalid master customer ID"
      });
      return;
    }

    const sourceObjectIds = sourceCustomerIds
      .map((id) => toObjectId(id))
      .filter(Boolean) as mongoose.Types.ObjectId[];

    const organizationFilter = buildOrganizationFilter(String(req.user.organizationId));
    const customerQuery: any = { _id: { $in: objectIds }, ...organizationFilter };

    const customers = await Customer.find(customerQuery).lean();
    if (customers.length !== allIds.length) {
      res.status(404).json({
        success: false,
        message: "One or more customers were not found in your organization"
      });
      return;
    }

    const customerMap = new Map<string, any>();
    customers.forEach((customer: any) => customerMap.set(String(customer._id), customer));

    const masterCustomer = customerMap.get(String(masterObjectId));
    if (!masterCustomer) {
      res.status(404).json({
        success: false,
        message: "Master customer not found"
      });
      return;
    }

    const sourceCustomers = sourceObjectIds
      .map((sourceId) => customerMap.get(String(sourceId)))
      .filter(Boolean);

    const normalizeCurrency = (value: any): string => {
      const raw = String(value || "").trim();
      if (!raw) return "";
      return raw.split(" - ")[0].trim().toUpperCase();
    };

    const allCustomersInMerge = [masterCustomer, ...sourceCustomers];
    const currencyCodesInMerge = Array.from(
      new Set(
        allCustomersInMerge
          .map((customer: any) => normalizeCurrency(customer.currency))
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

    const masterCurrency = normalizeCurrency(masterCustomer.currency) || baseCurrencyCode || "USD";
    if (!baseCurrencyCode) {
      baseCurrencyCode = masterCurrency;
    }

    const customerProvidedRates = new Map<string, number>();
    allCustomersInMerge.forEach((customer: any) => {
      const code = normalizeCurrency(customer.currency);
      const rate = Number(customer.exchangeRate);
      if (code && Number.isFinite(rate) && rate > 0 && !customerProvidedRates.has(code)) {
        customerProvidedRates.set(code, rate);
      }
    });

    const resolveRateToBase = (currencyCode: string): number | null => {
      const normalizedCode = normalizeCurrency(currencyCode);
      if (!normalizedCode) return null;
      if (normalizedCode === baseCurrencyCode) return 1;

      const latestRate = findLatestRate(currencyDocByCode.get(normalizedCode));
      if (latestRate && latestRate > 0) return latestRate;

      const fallbackRate = customerProvidedRates.get(normalizedCode);
      if (fallbackRate && fallbackRate > 0) return fallbackRate;

      return null;
    };

    const masterRateToBase = resolveRateToBase(masterCurrency);
    const conversionRateByCustomerId = new Map<string, number>();
    const conversionDetails: Array<{
      customerId: string;
      fromCurrency: string;
      toCurrency: string;
      rateUsed: number;
    }> = [];

    const missingCurrencies = new Set<string>();
    const missingRateCustomerIds: string[] = [];

    if (!masterRateToBase) {
      missingCurrencies.add(masterCurrency);
    }

    for (const sourceCustomer of sourceCustomers) {
      const sourceCustomerId = String(sourceCustomer._id);
      const sourceCurrency = normalizeCurrency(sourceCustomer.currency) || masterCurrency;

      if (sourceCurrency === masterCurrency) {
        conversionRateByCustomerId.set(sourceCustomerId, 1);
        continue;
      }

      const sourceRateToBase = resolveRateToBase(sourceCurrency);
      if (!sourceRateToBase || !masterRateToBase) {
        missingCurrencies.add(sourceCurrency);
        missingRateCustomerIds.push(sourceCustomerId);
        continue;
      }

      const rateUsed = sourceRateToBase / masterRateToBase;
      conversionRateByCustomerId.set(sourceCustomerId, rateUsed);
      conversionDetails.push({
        customerId: sourceCustomerId,
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
          missingCustomerIds: Array.from(new Set(missingRateCustomerIds))
        }
      });
      return;
    }

    const masterName = String(
      masterCustomer.displayName || masterCustomer.name || masterCustomer.companyName || "Customer"
    ).trim() || "Customer";

    const toNumber = (value: any): number => {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    };
    const roundToMoney = (value: number): number => Number(value.toFixed(2));

    const firstNonEmpty = (values: any[]): string =>
      String(values.find((value) => String(value || "").trim()) || "").trim();

    const sourceReceivablesInMasterCurrency = sourceCustomers.reduce((sum: number, customer: any) => {
      const rate = conversionRateByCustomerId.get(String(customer._id)) || 1;
      return sum + toNumber(customer.receivables) * rate;
    }, 0);

    const sourceUnusedCreditsInMasterCurrency = sourceCustomers.reduce((sum: number, customer: any) => {
      const rate = conversionRateByCustomerId.get(String(customer._id)) || 1;
      return sum + toNumber(customer.unusedCredits) * rate;
    }, 0);

    const transferCounts: Record<string, number> = {};
    const trackUpdate = async (key: string, promise: Promise<any>): Promise<void> => {
      const result: any = await promise;
      transferCounts[key] = Number(result?.modifiedCount || result?.nModified || 0);
    };

    const scopedFilter = (filter: any): any => ({ ...filter, ...organizationFilter });

    session.startTransaction();

    await trackUpdate(
      "invoices",
      Invoice.updateMany(scopedFilter({ customer: { $in: sourceObjectIds } }), { $set: { customer: masterObjectId } }, { session })
    );
    await trackUpdate(
      "quotes",
      Quote.updateMany(scopedFilter({ customer: { $in: sourceObjectIds } }), { $set: { customer: masterObjectId } }, { session })
    );
    await trackUpdate(
      "paymentsReceived",
      PaymentReceived.updateMany(scopedFilter({ customer: { $in: sourceObjectIds } }), { $set: { customer: masterObjectId } }, { session })
    );
    await trackUpdate(
      "creditNotes",
      CreditNote.updateMany(scopedFilter({ customer: { $in: sourceObjectIds } }), { $set: { customer: masterObjectId } }, { session })
    );
    await trackUpdate(
      "salesReceipts",
      SalesReceipt.updateMany(scopedFilter({ customer: { $in: sourceObjectIds } }), { $set: { customer: masterObjectId } }, { session })
    );
    await trackUpdate(
      "refunds",
      Refund.updateMany(scopedFilter({ customer: { $in: sourceObjectIds } }), { $set: { customer: masterObjectId } }, { session })
    );
    await trackUpdate(
      "recurringInvoices",
      RecurringInvoice.updateMany(scopedFilter({ customer: { $in: sourceObjectIds } }), { $set: { customer: masterObjectId } }, { session })
    );
    await trackUpdate(
      "retainerInvoices",
      RetainerInvoice.updateMany(scopedFilter({ customer: { $in: sourceObjectIds } }), { $set: { customer: masterObjectId } }, { session })
    );
    await trackUpdate(
      "debitNotes",
      DebitNote.updateMany(scopedFilter({ customer: { $in: sourceObjectIds } }), { $set: { customer: masterObjectId } }, { session })
    );
    await trackUpdate(
      "projects",
      Project.updateMany(scopedFilter({ customer: { $in: sourceObjectIds } }), { $set: { customer: masterObjectId } }, { session })
    );
    await trackUpdate(
      "expenses",
      Expense.updateMany(
        scopedFilter({ customer_id: { $in: sourceObjectIds } }),
        { $set: { customer_id: masterObjectId, customer_name: masterName } },
        { session }
      )
    );
    await trackUpdate(
      "recurringExpenses",
      RecurringExpense.updateMany(
        scopedFilter({ customer_id: { $in: sourceObjectIds } }),
        { $set: { customer_id: masterObjectId, customer_name: masterName } },
        { session }
      )
    );
    await trackUpdate(
      "bankTransactions",
      BankTransaction.updateMany(
        scopedFilter({ customerId: { $in: sourceObjectIds } }),
        { $set: { customerId: masterObjectId, customerName: masterName } },
        { session }
      )
    );
    await trackUpdate(
      "bankRules",
      BankRule.updateMany(
        scopedFilter({ customerId: { $in: sourceObjectIds } }),
        { $set: { customerId: masterObjectId, customerName: masterName } },
        { session }
      )
    );

    const mergedNotes = [
      masterCustomer.notes,
      ...sourceCustomers.map((customer: any) => customer.notes || customer.remarks)
    ]
      .map((value: any) => String(value || "").trim())
      .filter(Boolean)
      .join("\n\n");

    const masterUpdateData: any = {
      companyName: firstNonEmpty([masterCustomer.companyName, ...sourceCustomers.map((c: any) => c.companyName)]),
      email: firstNonEmpty([masterCustomer.email, ...sourceCustomers.map((c: any) => c.email)]),
      workPhone: firstNonEmpty([masterCustomer.workPhone, ...sourceCustomers.map((c: any) => c.workPhone)]),
      receivables: roundToMoney(toNumber(masterCustomer.receivables) + sourceReceivablesInMasterCurrency),
      unusedCredits: roundToMoney(toNumber(masterCustomer.unusedCredits) + sourceUnusedCreditsInMasterCurrency),
      status: "active",
      updatedBy: req.user.userId || null,
      updatedAt: new Date()
    };

    if (mergedNotes) {
      masterUpdateData.notes = mergedNotes;
    }

    const updatedMasterCustomer = await Customer.findByIdAndUpdate(
      masterObjectId,
      { $set: masterUpdateData },
      { new: true, runValidators: true, session }
    );

    const inactivated = await Customer.updateMany(
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

    transferCounts.customersMarkedInactive = Number(inactivated?.modifiedCount || 0);

    await session.commitTransaction();

    res.json({
      success: true,
      message: `${sourceObjectIds.length} customer(s) merged into ${masterName} successfully`,
      data: {
        masterCustomer: updatedMasterCustomer,
        masterCustomerId: String(masterObjectId),
        sourceCustomerIds,
        currencyConversion: {
          baseCurrency: baseCurrencyCode,
          masterCurrency,
          convertedCustomers: conversionDetails
        },
        transferCounts
      }
    });
  } catch (error: any) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    console.error("[CUSTOMERS MERGE] Error merging customers:", error);
    res.status(500).json({
      success: false,
      message: "Error merging customers",
      error: error.message || "Unknown error occurred"
    });
  } finally {
    session.endSession();
  }
};

// Search customers
export const searchCustomers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Check authentication
    if (!req.user || !req.user.organizationId) {
      console.error('[CUSTOMERS SEARCH] No user or organizationId found. req.user:', req.user);
      res.status(401).json({
        success: false,
        message: 'Unauthorized - Organization ID required',
        error: 'User authentication or organization ID is missing'
      });
      return;
    }

    const { q, limit = '10' } = req.query as { q?: string; limit?: string };

    if (!q || !q.trim()) {
      res.status(400).json({
        success: false,
        message: 'Please provide a search query'
      });
      return;
    }

    // Build query with organization filter
    const orgId = req.user.organizationId;
    let orgFilter: any = {};

    // Handle both ObjectId and string formats for organization field
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
        console.warn('[CUSTOMERS SEARCH] Error converting to ObjectId, using string format:', conversionError.message);
        orgFilter = { organization: String(orgId) };
      }
    } else {
      orgFilter = { organization: String(orgId) };
    }

    // Combine organization filter with search filter using $and
    const query: any = {
      $and: [
        orgFilter,
        {
          $or: [
            { displayName: { $regex: q.trim(), $options: 'i' } },
            { companyName: { $regex: q.trim(), $options: 'i' } },
            { email: { $regex: q.trim(), $options: 'i' } },
            { firstName: { $regex: q.trim(), $options: 'i' } },
            { lastName: { $regex: q.trim(), $options: 'i' } },
            { workPhone: { $regex: q.trim(), $options: 'i' } },
            { mobile: { $regex: q.trim(), $options: 'i' } }
          ]
        }
      ]
    };

    let customers: any[] = await Customer.find(query)
      .limit(Math.min(parseInt(limit) || 10, 100)) // Cap at 100
      .select('displayName name companyName firstName lastName email workPhone receivables currency status customerNumber _id')
      .sort({ displayName: 1 })
      .lean();

    // Ensure name and displayName are always present with better error handling
    customers = customers
      .map((customer: any) => {
        try {
          if (!customer || typeof customer !== 'object') {
            return null;
          }

          const firstName = customer.firstName || '';
          const lastName = customer.lastName || '';
          const companyName = customer.companyName || '';

          let displayName = customer.displayName || '';
          if (!displayName || (typeof displayName === 'string' && displayName.trim() === '')) {
            if (firstName || lastName) {
              displayName = `${firstName} ${lastName}`.trim();
            } else if (companyName) {
              displayName = companyName.trim();
            } else {
              displayName = 'Customer';
            }
          }

          let name = customer.name || '';
          if (!name || (typeof name === 'string' && name.trim() === '')) {
            name = displayName || companyName || `${firstName} ${lastName}`.trim() || 'Customer';
          }

          customer.name = (typeof name === 'string' ? name.trim() : String(name || 'Customer')) || 'Customer';
          customer.displayName = (typeof displayName === 'string' ? displayName.trim() : String(displayName || 'Customer')) || customer.name || 'Customer';

          // Convert _id to id for consistency
          if (customer._id && !customer.id) {
            customer.id = customer._id.toString();
          }

          return customer;
        } catch (mapError: any) {
          console.error('[CUSTOMERS SEARCH] Error mapping customer:', mapError);
          return null;
        }
      })
      .filter((customer: any) => customer !== null);

    res.json({
      success: true,
      data: customers
    });
  } catch (error: any) {
    console.error('[CUSTOMERS SEARCH] Error searching customers:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching customers',
      error: error.message || 'Unknown error occurred'
    });
  }
};

// ============================================================================
// PAYMENTS RECEIVED CONTROLLERS
// ============================================================================

// Get all payments received
export const getAllPaymentsReceived = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
      return;
    }

    const {
      page = '1',
      limit = '50',
      customerId,
      startDate,
      endDate,
      sortBy = 'date',
      sortOrder = 'desc'
    } = req.query as any;

    const query: any = { organization: req.user.organizationId };

    if (customerId) {
      query.customer = customerId;
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate as string);
      if (endDate) query.date.$lte = new Date(endDate as string);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort: any = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const payments = await PaymentReceived.find(query)
      .populate('customer', 'displayName name companyName email')
      .populate('bankAccount', 'accountName accountNumber')
      .populate('allocations.invoice', 'invoiceNumber total')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await PaymentReceived.countDocuments(query);

    res.json({
      success: true,
      data: payments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error: any) {
    console.error('[PAYMENTS RECEIVED] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payments received',
      error: error.message
    });
  }
};

// Get payment by ID
export const getPaymentReceivedById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
      return;
    }

    const { id } = req.params;

    const payment = await PaymentReceived.findOne({
      _id: id,
      organization: req.user.organizationId
    })
      .populate('customer', 'displayName name companyName email')
      .populate('bankAccount', 'accountName accountNumber')
      .populate('allocations.invoice', 'invoiceNumber total balanceDue')
      .lean();

    if (!payment) {
      res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
      return;
    }

    res.json({
      success: true,
      data: payment
    });
  } catch (error: any) {
    console.error('[PAYMENTS RECEIVED] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payment',
      error: error.message
    });
  }
};

const normalizePaymentAttachments = (attachments: any): any[] => {
  if (!Array.isArray(attachments)) return [];
  return attachments
    .filter((attachment: any) => attachment && attachment.name)
    .slice(0, 5)
    .map((attachment: any) => ({
      id: String(attachment.id || `att_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`),
      name: String(attachment.name || "Attachment"),
      type: String(attachment.type || ""),
      size: Number(attachment.size || 0),
      preview: typeof attachment.preview === "string" ? attachment.preview : "",
      uploadedAt: attachment.uploadedAt ? new Date(attachment.uploadedAt) : new Date(),
      uploadedBy: String(attachment.uploadedBy || "")
    }));
};

const normalizePaymentComments = (comments: any): any[] => {
  if (!Array.isArray(comments)) return [];
  return comments
    .filter((comment: any) => comment && typeof comment.text === "string" && comment.text.trim() !== "")
    .slice(-200)
    .map((comment: any) => ({
      id: String(comment.id || `com_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`),
      text: String(comment.text || "").trim(),
      bold: Boolean(comment.bold),
      italic: Boolean(comment.italic),
      underline: Boolean(comment.underline),
      author: String(comment.author || "User"),
      timestamp: comment.timestamp ? new Date(comment.timestamp) : new Date()
    }));
};

// Create payment received
export const createPaymentReceived = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
      return;
    }

    const {
      customerId,
      paymentNumber,
      date,
      amount,
      currency,
      paymentMode,
      depositTo,
      referenceNumber,
      invoicePayments,
      notes,
      status,
      attachments,
      comments
    } = req.body;

    // Validate required fields
    if (!customerId || !paymentNumber || !date || !amount) {
      res.status(400).json({
        success: false,
        message: 'Missing required fields: customerId, paymentNumber, date, amount'
      });
      return;
    }

    // Map payment mode to enum
    const paymentMethod = toPaymentMethodCode(paymentMode, 'cash');

    // Find bank account ID
    let bankAccountId = req.body.depositToAccountId;

    if (!bankAccountId && depositTo && depositTo !== 'Petty Cash') {
      // Try to find bank account by name as fallback
      const bankAccount = await mongoose.model('BankAccount').findOne({
        organization: req.user.organizationId,
        $or: [
          { name: depositTo },
          { accountName: depositTo }
        ]
      });
      if (bankAccount) {
        bankAccountId = bankAccount._id;
      } else {
        // Try to find in ChartOfAccounts
        const coa = await ChartOfAccount.findOne({
          organization: req.user.organizationId,
          name: depositTo
        });
        if (coa) bankAccountId = coa._id;
      }
    }

    // Build allocations from invoicePayments
    const allocations: any[] = [];
    if (invoicePayments && typeof invoicePayments === 'object') {
      for (const [invoiceId, amount] of Object.entries(invoicePayments)) {
        if (amount && parseFloat(amount as string) > 0) {
          allocations.push({
            invoice: invoiceId,
            amount: parseFloat(amount as string)
          });
        }
      }
    }

    // Check if payment number already exists
    const existingPayment = await PaymentReceived.findOne({
      organization: req.user.organizationId,
      paymentNumber: paymentNumber.toString()
    });

    if (existingPayment) {
      res.status(400).json({
        success: false,
        message: `Payment number ${paymentNumber} already exists`
      });
      return;
    }

    const payment = new PaymentReceived({
      organization: req.user.organizationId,
      customer: customerId,
      paymentNumber: paymentNumber.toString(),
      date: new Date(date),
      amount: parseFloat(amount),
      currency: currency || 'USD',
      paymentMethod,
      paymentReference: referenceNumber || '',
      status: status || 'paid',
      bankAccount: bankAccountId,
      allocations,
      notes: notes || '',
      attachments: normalizePaymentAttachments(attachments),
      comments: normalizePaymentComments(comments)
    });

    await payment.save();

    // Create journal entry for payment
    const paymentJournalId = await createPaymentJournalEntry(
      payment,
      req.user.organizationId,
      req.user.userId
    );
    if (paymentJournalId) {
      payment.journalEntryId = paymentJournalId;
      await payment.save();
    } else {
      console.warn('[PAYMENTS RECEIVED] Payment journal entry was not created');
    }

    // Update customer receivables (decrement by payment amount)
    try {
      await Customer.findByIdAndUpdate(customerId, {
        $inc: { receivables: -parseFloat(amount) }
      });
      console.log(`[PAYMENTS RECEIVED] Updated receivables for customer ${customerId}: -${amount}`);
    } catch (custError: any) {
      console.error('[PAYMENTS RECEIVED] Failed to update customer receivables:', custError.message);
    }

    // Update invoice balances if allocations exist
    if (allocations.length > 0) {
      try {
        for (const allocation of allocations) {
          const invoice = await Invoice.findById(allocation.invoice);
          if (invoice) {
            // Update balance and paidAmount
            invoice.paidAmount = (invoice.paidAmount || 0) + allocation.amount;
            const paidAmount = Number(invoice.paidAmount || 0);
            const creditsApplied = Number((invoice as any).creditsApplied || 0);
            invoice.balance = Math.max(0, Number(invoice.total || 0) - paidAmount - creditsApplied);

            // Set status based on balance (only if not void)
            if (invoice.status !== 'void') {
              if (invoice.balance <= 0) {
                invoice.status = 'paid';
              } else if ((paidAmount + creditsApplied) > 0 && (paidAmount + creditsApplied) < Number(invoice.total || 0)) {
                invoice.status = 'partially paid';
              }

              // Check for overdue status
              await updateOverdueStatus(invoice);
            }

            await invoice.save();
          }
        }
      } catch (error: any) {
        console.warn('[PAYMENTS RECEIVED] Could not update invoice balances:', error.message);
        // Continue even if invoice update fails
      }
    }

    await syncLinkedBankTransaction({
      organizationId: req.user.organizationId,
      transactionKey: `payment_received:${payment._id}`,
      source: "payment_received",
      accountCandidates: [payment.bankAccount, bankAccountId, req.body.depositToAccountId, depositTo],
      amount: payment.amount,
      date: payment.date,
      referenceNumber: payment.paymentReference || payment.paymentNumber,
      description: payment.notes,
      paymentMode: toPaymentModeLabel(paymentMode || payment.paymentMethod),
      transactionType: "deposit",
      debitOrCredit: "credit",
      shouldSync: !["draft", "void"].includes(String(payment.status || "").toLowerCase()),
      customerId: payment.customer,
      fallbackDescription: `Payment received ${payment.paymentNumber}`,
    });

    const populatedPayment = await PaymentReceived.findById(payment._id)
      .populate('customer', 'displayName name companyName email')
      .populate('bankAccount', 'accountName accountNumber')
      .populate('allocations.invoice', 'invoiceNumber total')
      .lean();

    res.status(201).json({
      success: true,
      message: 'Payment received created successfully',
      data: populatedPayment
    });
  } catch (error: any) {
    console.error('[PAYMENTS RECEIVED] Error creating payment:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating payment received',
      error: error.message
    });
  }
};

// Update payment received
export const updatePaymentReceived = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
      return;
    }

    const { id } = req.params;
    const updateData: any = req.body;

    const payment = await PaymentReceived.findOne({
      _id: id,
      organization: req.user.organizationId
    });

    if (!payment) {
      res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
      return;
    }

    const oldAmount = Number(payment.amount || 0);
    const oldCustomerId = payment.customer?.toString();

    if (updateData.attachments !== undefined) {
      updateData.attachments = normalizePaymentAttachments(updateData.attachments);
    }
    if (updateData.comments !== undefined) {
      updateData.comments = normalizePaymentComments(updateData.comments);
    }

    const metadataOnlyFields = new Set(["attachments", "comments"]);
    const incomingKeys = Object.keys(updateData || {}).filter((key) => updateData[key] !== undefined);
    const isMetadataOnlyUpdate =
      incomingKeys.length > 0 &&
      incomingKeys.every((key) => metadataOnlyFields.has(key));

    if (isMetadataOnlyUpdate) {
      Object.assign(payment, updateData);
      await payment.save();

      const populatedPayment = await PaymentReceived.findById(payment._id)
        .populate('customer', 'displayName name companyName email')
        .populate('bankAccount', 'accountName accountNumber')
        .populate('allocations.invoice', 'invoiceNumber total')
        .lean();

      res.json({
        success: true,
        message: 'Payment received updated successfully',
        data: populatedPayment
      });
      return;
    }

    // Map payment mode if provided
    if (updateData.paymentMode) {
      updateData.paymentMethod = toPaymentMethodCode(updateData.paymentMode, 'cash');
      delete updateData.paymentMode;
    }

    // Handle date conversion
    if (updateData.date) {
      updateData.date = new Date(updateData.date);
    }

    // Normalize customer and amount fields if provided
    if (updateData.customerId) {
      updateData.customer = updateData.customerId;
      delete updateData.customerId;
    }
    if (updateData.amount !== undefined) {
      updateData.amount = parseFloat(updateData.amount) || 0;
    }

    if (updateData.depositToAccountId !== undefined || updateData.depositTo !== undefined || updateData.bankAccount !== undefined) {
      const resolvedDepositAccount = await resolveOrganizationBankAccount(req.user.organizationId, [
        updateData.depositToAccountId,
        updateData.bankAccount,
        updateData.depositTo,
      ]);

      if (resolvedDepositAccount) {
        updateData.bankAccount = resolvedDepositAccount._id;
      } else if (
        updateData.depositToAccountId === "" ||
        updateData.depositTo === "" ||
        updateData.bankAccount === ""
      ) {
        updateData.bankAccount = undefined;
      }
    }

    // Handle allocations
    if (updateData.invoicePayments) {
      const allocations: any[] = [];
      for (const [invoiceId, amount] of Object.entries(updateData.invoicePayments)) {
        if (amount && parseFloat(amount as string) > 0) {
          allocations.push({
            invoice: invoiceId,
            amount: parseFloat(amount as string)
          });
        }
      }
      updateData.allocations = allocations;
      delete updateData.invoicePayments;
    }

    // Reverse old invoice balances
    if (payment.allocations && payment.allocations.length > 0) {
      for (const allocation of payment.allocations) {
        const invoice = await Invoice.findById(allocation.invoice);
        if (invoice) {
          if (invoice.status !== 'void') {
            invoice.paidAmount = Math.max(0, (invoice.paidAmount || 0) - allocation.amount);
            const paidAmount = Number(invoice.paidAmount || 0);
            const creditsApplied = Number((invoice as any).creditsApplied || 0);
            invoice.balance = Math.max(0, Number(invoice.total || 0) - paidAmount - creditsApplied);
            if (invoice.balance <= 0) {
              invoice.status = 'paid';
            } else if ((paidAmount + creditsApplied) > 0) {
              invoice.status = 'partially paid';
            } else {
              invoice.status = 'sent';
            }
            await updateOverdueStatus(invoice);
            await invoice.save();
          }
        }
      }
    }

    // Allow updating status if provided
    if (updateData.status) {
      payment.status = updateData.status;
      delete updateData.status;
    }
    Object.assign(payment, updateData);
    await payment.save();

    // Rebuild payment journal entries so GL always matches latest payment data.
    const existingPaymentEntries = await JournalEntry.find({
      organization: req.user.organizationId,
      sourceId: payment._id,
      sourceType: 'payment_received'
    });
    for (const entry of existingPaymentEntries) {
      try {
        await updateAccountBalances(entry.lines, req.user.organizationId, true);
      } catch (err) {
        console.error('[PAYMENTS RECEIVED] Failed to reverse account balances on update:', err);
      }
    }
    await JournalEntry.deleteMany({
      organization: req.user.organizationId,
      sourceId: payment._id,
      sourceType: 'payment_received'
    });

    const paymentJournalId = await createPaymentJournalEntry(
      payment,
      req.user.organizationId,
      req.user.userId
    );
    if (paymentJournalId) {
      payment.journalEntryId = paymentJournalId;
      await payment.save();
    } else {
      console.warn('[PAYMENTS RECEIVED] Failed to recreate payment journal entry after update');
    }

    // Apply new invoice balances
    if (payment.allocations && payment.allocations.length > 0) {
      for (const allocation of payment.allocations) {
        const invoice = await Invoice.findById(allocation.invoice);
        if (invoice) {
          if (invoice.status !== 'void') {
            invoice.paidAmount = (invoice.paidAmount || 0) + allocation.amount;
            const paidAmount = Number(invoice.paidAmount || 0);
            const creditsApplied = Number((invoice as any).creditsApplied || 0);
            invoice.balance = Math.max(0, Number(invoice.total || 0) - paidAmount - creditsApplied);
            if (invoice.balance <= 0) {
              invoice.status = 'paid';
            } else if ((paidAmount + creditsApplied) > 0) {
              invoice.status = 'partially paid';
            }
            await updateOverdueStatus(invoice);
            await invoice.save();
          }
        }
      }
    }

    // Update customer receivables based on amount/customer changes.
    try {
      const newAmount = Number(payment.amount || 0);
      const newCustomerId = payment.customer?.toString();

      if (oldCustomerId && newCustomerId && oldCustomerId === newCustomerId) {
        const delta = newAmount - oldAmount;
        if (delta !== 0) {
          await Customer.findByIdAndUpdate(newCustomerId, {
            $inc: { receivables: -delta }
          });
        }
      } else {
        if (oldCustomerId && oldAmount > 0) {
          await Customer.findByIdAndUpdate(oldCustomerId, {
            $inc: { receivables: oldAmount }
          });
        }
        if (newCustomerId && newAmount > 0) {
          await Customer.findByIdAndUpdate(newCustomerId, {
            $inc: { receivables: -newAmount }
          });
        }
      }
    } catch (custError: any) {
      console.error('[PAYMENTS RECEIVED] Failed to sync customer receivables on payment update:', custError.message);
    }

    await syncLinkedBankTransaction({
      organizationId: req.user.organizationId,
      transactionKey: `payment_received:${payment._id}`,
      source: "payment_received",
      accountCandidates: [payment.bankAccount, req.body.depositToAccountId, req.body.depositTo],
      amount: payment.amount,
      date: payment.date,
      referenceNumber: payment.paymentReference || payment.paymentNumber,
      description: payment.notes,
      paymentMode: toPaymentModeLabel(req.body.paymentMode || payment.paymentMethod),
      transactionType: "deposit",
      debitOrCredit: "credit",
      shouldSync: !["draft", "void"].includes(String(payment.status || "").toLowerCase()),
      customerId: payment.customer,
      fallbackDescription: `Payment received ${payment.paymentNumber}`,
    });

    const populatedPayment = await PaymentReceived.findById(payment._id)
      .populate('customer', 'displayName name companyName email')
      .populate('bankAccount', 'accountName accountNumber')
      .populate('allocations.invoice', 'invoiceNumber total')
      .lean();

    res.json({
      success: true,
      message: 'Payment received updated successfully',
      data: populatedPayment
    });
  } catch (error: any) {
    console.error('[PAYMENTS RECEIVED] Error updating payment:', error);
    const payload: any = {
      success: false,
      message: 'Error updating payment received',
      error: error.message
    };
    if (process.env.NODE_ENV === 'development') {
      payload.stack = error.stack;
    }
    res.status(500).json(payload);
  }
};

// Delete payment received
export const deletePaymentReceived = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
      return;
    }

    const { id } = req.params;

    const payment = await PaymentReceived.findOne({
      _id: id,
      organization: req.user.organizationId
    });

    if (!payment) {
      res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
      return;
    }

    // Reverse invoice balances
    if (payment.allocations && payment.allocations.length > 0) {
      for (const allocation of payment.allocations) {
        const invoice = await Invoice.findById(allocation.invoice);
        if (invoice) {
          invoice.paidAmount = Math.max(0, (invoice.paidAmount || 0) - allocation.amount);
          const paidAmount = Number(invoice.paidAmount || 0);
          const creditsApplied = Number((invoice as any).creditsApplied || 0);
          invoice.balance = Math.max(0, Number(invoice.total || 0) - paidAmount - creditsApplied);

          if ((paidAmount + creditsApplied) <= 0) {
            invoice.status = 'sent';
          } else {
            invoice.status = 'partially paid';
          }
          await updateOverdueStatus(invoice);
          await invoice.save();
        }
      }
    }

    // Restore customer receivables that were reduced when this payment was created.
    try {
      const amountToRestore = Number(payment.amount || 0);
      if (amountToRestore > 0) {
        await Customer.findByIdAndUpdate(payment.customer, {
          $inc: { receivables: amountToRestore }
        });
      }
    } catch (custError: any) {
      console.error('[PAYMENTS RECEIVED] Failed to restore customer receivables on delete:', custError.message);
    }

    // Reverse GL entries if they exist
    const journalEntries = await JournalEntry.find({
      organization: req.user.organizationId,
      sourceId: payment._id,
      sourceType: 'payment_received'
    });

    for (const entry of journalEntries) {
      try {
        await updateAccountBalances(entry.lines, req.user.organizationId, true);
      } catch (err) {
        console.error('[PAYMENTS RECEIVED] Failed to reverse account balances for deleted payment:', err);
      }
    }

    // Delete Journal Entries
    await JournalEntry.deleteMany({
      organization: req.user.organizationId,
      sourceId: payment._id,
      sourceType: 'payment_received'
    });

    await syncLinkedBankTransaction({
      organizationId: req.user.organizationId,
      transactionKey: `payment_received:${payment._id}`,
      source: "payment_received",
      transactionType: "deposit",
      debitOrCredit: "credit",
      amount: 0,
      shouldSync: false,
    });

    await PaymentReceived.deleteOne({ _id: id });

    res.json({
      success: true,
      message: 'Payment received deleted successfully'
    });
  } catch (error: any) {
    console.error('[PAYMENTS RECEIVED] Error deleting payment:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting payment received',
      error: error.message
    });
  }
};

// ============================================================================
// SALESPERSONS CONTROLLERS
// ============================================================================

// Get all salespersons
export const getAllSalespersons = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
      return;
    }

    const { isActive } = req.query as any;
    const query: any = { organization: req.user.organizationId };

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const salespersons = await Salesperson.find(query)
      .sort({ name: 1 })
      .lean();

    res.json({
      success: true,
      data: salespersons
    });
  } catch (error: any) {
    console.error('[SALESPERSONS] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching salespersons',
      error: error.message
    });
  }
};

// Get salesperson by ID
export const getSalespersonById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
      return;
    }

    const { id } = req.params;

    const salesperson = await Salesperson.findOne({
      _id: id,
      organization: req.user.organizationId
    }).lean();

    if (!salesperson) {
      res.status(404).json({
        success: false,
        message: 'Salesperson not found'
      });
      return;
    }

    res.json({
      success: true,
      data: salesperson
    });
  } catch (error: any) {
    console.error('[SALESPERSONS] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching salesperson',
      error: error.message
    });
  }
};

// Create salesperson
export const createSalesperson = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
      return;
    }

    const { name, email, phone } = req.body;

    if (!name || !email) {
      res.status(400).json({
        success: false,
        message: 'Name and email are required'
      });
      return;
    }

    // Check if salesperson with same email already exists
    const existingSalesperson = await Salesperson.findOne({
      organization: req.user.organizationId,
      email: email.toLowerCase().trim()
    });

    if (existingSalesperson) {
      res.status(400).json({
        success: false,
        message: 'Salesperson with this email already exists'
      });
      return;
    }

    const salesperson = new Salesperson({
      organization: req.user.organizationId,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone?.trim() || '',
      isActive: true
    });

    await salesperson.save();

    res.status(201).json({
      success: true,
      message: 'Salesperson created successfully',
      data: salesperson
    });
  } catch (error: any) {
    console.error('[SALESPERSONS] Error creating salesperson:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating salesperson',
      error: error.message
    });
  }
};

// Update salesperson
export const updateSalesperson = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
      return;
    }

    const { id } = req.params;
    const updateData: any = req.body;

    const salesperson = await Salesperson.findOne({
      _id: id,
      organization: req.user.organizationId
    });

    if (!salesperson) {
      res.status(404).json({
        success: false,
        message: 'Salesperson not found'
      });
      return;
    }

    // If email is being updated, check for duplicates
    if (updateData.email && updateData.email.toLowerCase().trim() !== salesperson.email) {
      const existingSalesperson = await Salesperson.findOne({
        organization: req.user.organizationId,
        email: updateData.email.toLowerCase().trim(),
        _id: { $ne: id }
      });

      if (existingSalesperson) {
        res.status(400).json({
          success: false,
          message: 'Salesperson with this email already exists'
        });
        return;
      }
    }

    // Update fields
    if (updateData.name) salesperson.name = updateData.name.trim();
    if (updateData.email) salesperson.email = updateData.email.toLowerCase().trim();
    if (updateData.phone !== undefined) salesperson.phone = updateData.phone?.trim() || '';
    if (updateData.isActive !== undefined) salesperson.isActive = updateData.isActive;

    await salesperson.save();

    res.json({
      success: true,
      message: 'Salesperson updated successfully',
      data: salesperson
    });
  } catch (error: any) {
    console.error('[SALESPERSONS] Error updating salesperson:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating salesperson',
      error: error.message
    });
  }
};

// Delete salesperson
export const deleteSalesperson = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
      return;
    }

    const { id } = req.params;

    const salesperson = await Salesperson.findOne({
      _id: id,
      organization: req.user.organizationId
    });

    if (!salesperson) {
      res.status(404).json({
        success: false,
        message: 'Salesperson not found'
      });
      return;
    }

    await Salesperson.deleteOne({ _id: id });

    res.json({
      success: true,
      message: 'Salesperson deleted successfully'
    });
  } catch (error: any) {
    console.error('[SALESPERSONS] Error deleting salesperson:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting salesperson',
      error: error.message
    });
  }
};

// ============================================================================
// INVOICES CRUD OPERATIONS
// ============================================================================

// Get all invoices
export const getAllInvoices = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const {
      page = '1',
      limit = '50',
      search = '',
      status,
      status_ne,
      customerId,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query: any = { organization: req.user.organizationId };

    if (status) {
      query.status = status;
    } else if (status_ne) {
      const excludedStatuses = String(status_ne)
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);

      if (excludedStatuses.length === 1) {
        query.status = { $ne: excludedStatuses[0] };
      } else if (excludedStatuses.length > 1) {
        query.status = { $nin: excludedStatuses };
      }
    }
    if (customerId) {
      const normalizedCustomerId = String(customerId || "").trim();
      if (normalizedCustomerId && normalizedCustomerId.toLowerCase() !== "all") {
        const customerObjectId = toObjectId(normalizedCustomerId);
        if (customerObjectId) {
          query.customer = customerObjectId;
        }
      }
    }

    if (search) {
      const searchRegex = new RegExp(escapeRegex(String(search)), 'i');
      query.$or = [
        { invoiceNumber: searchRegex },
        { orderNumber: searchRegex },
        { notes: searchRegex }
      ];
    }

    const limitNum = parseInt(limit as string) || 50;
    const pageNum = parseInt(page as string) || 1;
    const skip = (pageNum - 1) * limitNum;

    const sort: any = {};
    sort[sortBy as string] = sortOrder === 'desc' ? -1 : 1;

    // Execute queries in parallel for better performance
    const [invoices, total] = await Promise.all([
      Invoice.find(query)
        .populate('customer', 'displayName companyName')
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Invoice.countDocuments(query)
    ]);

    // Update overdue status for returned invoices in-memory and trigger background DB updates
    const now = new Date();
    const processedInvoices = invoices.map(invoice => {
      const inv = invoice as any;
      if (
        inv.dueDate &&
        (inv.status === 'sent' || inv.status === 'partially paid') &&
        new Date(inv.dueDate) < now &&
        (inv.balance || 0) > 0
      ) {
        // Trigger background update without waiting for it
        Invoice.updateOne({ _id: inv._id }, { $set: { status: 'overdue' } })
          .catch(e => console.error('[INVOICES] Background overdue update failed:', e));

        inv.status = 'overdue';
      }
      return inv;
    });

    res.json({
      success: true,
      data: processedInvoices,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error: any) {
    console.error('[INVOICES] Error fetching invoices:', error);
    res.status(500).json({ success: false, message: 'Error fetching invoices', error: error.message });
  }
};

// Get single invoice by ID
export const getInvoiceById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;

    const invoice = await Invoice.findOne({
      _id: id,
      organization: req.user.organizationId
    }).populate('customer');

    if (!invoice) {
      res.status(404).json({ success: false, message: 'Invoice not found' });
      return;
    }

    // Check and update overdue status
    await updateOverdueStatus(invoice);

    // Reload to get updated status
    const updatedInvoice = await Invoice.findById(invoice._id).populate('customer');

    res.json({ success: true, data: updatedInvoice });
  } catch (error: any) {
    console.error('[INVOICES] Error fetching invoice:', error);
    res.status(500).json({ success: false, message: 'Error fetching invoice', error: error.message });
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
    console.error(`[INVOICES] Error finding account ${accountName}:`, error);
    return null;
  }
};

const resolveAccountIdFromReference = async (
  orgId: string,
  accountRef: any,
): Promise<string | null> => {
  const normalized = String(accountRef || "").trim();
  if (!normalized) return null;

  if (mongoose.Types.ObjectId.isValid(normalized)) {
    const byId = await ChartOfAccount.findOne({
      _id: new mongoose.Types.ObjectId(normalized),
      ...buildOrganizationFilter(orgId),
      isActive: true,
    }).lean();
    if (byId?._id) return String(byId._id);
  }

  return findAccountByName(orgId, normalized);
};

// Helper function to create journal entry for invoice when sent
const createInvoiceJournalEntry = async (
  invoice: any,
  orgId: string,
  userId?: string
): Promise<mongoose.Types.ObjectId | null> => {
  try {
    // 1) Resolve Accounts Receivable control account (must be a real COA account).
    const arAccountName = String(invoice.accountsReceivable || "Accounts Receivable").trim();
    let arAccountId = await resolveAccountIdFromReference(orgId, arAccountName);
    if (!arAccountId) {
      arAccountId = await findAccountByName(orgId, "Accounts Receivable");
    }
    if (!arAccountId) {
      throw new Error(
        `Accounts Receivable account "${arAccountName}" was not found in Chart of Accounts for this organization.`,
      );
    }

    // 2) Build revenue credits grouped by selected item account.
    const groupedRevenueCredits = new Map<string, number>();
    const lineItems = Array.isArray(invoice.items) ? invoice.items : [];
    for (const item of lineItems) {
      const amount = Number(item?.amount || 0);
      if (!Number.isFinite(amount) || amount <= 0) continue;

      let itemAccountId = await resolveAccountIdFromReference(
        orgId,
        item?.accountId || item?.account || item?.incomeAccount,
      );
      if (!itemAccountId) {
        itemAccountId =
          (await findAccountByName(orgId, "Sales Income")) ||
          (await findAccountByName(orgId, "Sales")) ||
          (await findAccountByName(orgId, "Income"));
      }
      if (!itemAccountId) {
        throw new Error(
          `No revenue account found for invoice item "${String(item?.itemDetails || item?.name || "").trim() || "line item"}".`,
        );
      }

      groupedRevenueCredits.set(
        itemAccountId,
        Number((groupedRevenueCredits.get(itemAccountId) || 0) + amount),
      );
    }

    const totalRevenueCredits = Array.from(groupedRevenueCredits.values()).reduce(
      (sum, value) => sum + value,
      0,
    );

    // 3) Tax line (if any) should credit tax payable liability.
    const taxAmount = Number(invoice.tax || invoice.totalTax || 0) || 0;
    let taxAccountId: string | null = null;
    if (taxAmount > 0) {
      taxAccountId =
        (await findAccountByName(orgId, "Sales Tax Payable")) ||
        (await findAccountByName(orgId, "Tax Payable"));
      if (!taxAccountId) {
        throw new Error(
          "Tax amount exists on invoice, but no Sales Tax Payable / Tax Payable account was found.",
        );
      }
    }

    // 4) AR debit must match sum of revenue credits + tax credits (balanced journal).
    const arDebitAmount = Number((totalRevenueCredits + taxAmount).toFixed(2));
    if (!Number.isFinite(arDebitAmount) || arDebitAmount <= 0) {
      throw new Error("Invoice journal amount is invalid (zero or negative).");
    }

    const journalNumber = `JE-INV-${invoice.invoiceNumber}-${Date.now()}`;
    const lines: any[] = [
      {
        account: arAccountId,
        accountName: arAccountName,
        description: `Invoice ${invoice.invoiceNumber}`,
        debit: arDebitAmount,
        credit: 0,
      },
    ];

    for (const [accountId, creditAmount] of groupedRevenueCredits.entries()) {
      const accountDoc = await ChartOfAccount.findById(accountId).lean();
      lines.push({
        account: accountId,
        accountName: String(accountDoc?.name || accountDoc?.accountName || "Revenue"),
        description: `Invoice ${invoice.invoiceNumber}`,
        debit: 0,
        credit: Number(creditAmount.toFixed(2)),
      });
    }

    if (taxAccountId && taxAmount > 0) {
      const taxAccountDoc = await ChartOfAccount.findById(taxAccountId).lean();
      lines.push({
        account: taxAccountId,
        accountName: String(taxAccountDoc?.name || taxAccountDoc?.accountName || "Sales Tax Payable"),
        description: `Sales Tax - Invoice ${invoice.invoiceNumber}`,
        debit: 0,
        credit: Number(taxAmount.toFixed(2)),
      });
    }

    const journalEntry = await JournalEntry.create({
      organization: orgId,
      entryNumber: journalNumber,
      date: invoice.date || new Date(),
      description: `Invoice ${invoice.invoiceNumber} - Accounts Receivable`,
      reference: invoice.invoiceNumber,
      status: 'posted',
      postedBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
      postedAt: new Date(),
      sourceId: invoice._id,
      sourceType: 'invoice',
      lines,
    });

    // Update Chart of Account balances
    try {
      await updateAccountBalances(journalEntry.lines, orgId);
    } catch (balanceError) {
      console.error('[INVOICES] Failed to update account balances:', balanceError);
    }

    return journalEntry._id;
  } catch (error: any) {
    console.error('[INVOICES] Error creating journal entry:', error);
    return null;
  }
};

// Helper function to create journal entry for payment received
const createPaymentJournalEntry = async (
  payment: any,
  orgId: string,
  userId?: string
): Promise<mongoose.Types.ObjectId | null> => {
  try {
    // 1. Find Debit Account (Bank/Cash)
    let debitAccountId = payment.bankAccount;
    let debitAccountName = 'Bank/Cash';

    if (debitAccountId) {
      // Try BankAccount model first
      let bankAcc = await mongoose.model('BankAccount').findById(debitAccountId);
      if (bankAcc) {
        debitAccountName = bankAcc.accountName || bankAcc.name;
      } else {
        // Then try ChartOfAccount
        let coaAcc = await ChartOfAccount.findById(debitAccountId);
        if (coaAcc) {
          debitAccountName = coaAcc.name || coaAcc.accountName;
        }
      }
    } else {
      // Fallback to Petty Cash if no account specified
      const pettyCash = await ChartOfAccount.findOne({
        organization: orgId,
        $or: [{ name: 'Petty Cash' }, { accountName: 'Petty Cash' }]
      });
      if (pettyCash) {
        debitAccountId = pettyCash._id;
        debitAccountName = 'Petty Cash';
      }
    }

    // 2. Find Credit Account (Accounts Receivable)
    // For payments, we usually credit Accounts Receivable.
    // If we have invoice allocations, we can try to get the AR account from the first invoice.
    let arAccountId = await findAccountByName(orgId, 'Accounts Receivable');
    let arAccountName = 'Accounts Receivable';

    if (payment.allocations && payment.allocations.length > 0) {
      const firstInvoice = await Invoice.findById(payment.allocations[0].invoice);
      if (firstInvoice && firstInvoice.accountsReceivable) {
        const customAr = await findAccountByName(orgId, firstInvoice.accountsReceivable);
        if (customAr) {
          arAccountId = customAr;
          arAccountName = firstInvoice.accountsReceivable;
        }
      }
    }

    const journalNumber = `JE-PAY-${payment.paymentNumber}-${Date.now()}`;
    const journalEntry = await JournalEntry.create({
      organization: orgId,
      entryNumber: journalNumber,
      date: payment.date || new Date(),
      description: `Payment Received ${payment.paymentNumber} - ${payment.notes || ''}`,
      reference: payment.paymentReference || payment.paymentNumber,
      status: 'posted',
      postedBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
      postedAt: new Date(),
      sourceId: payment._id,
      sourceType: 'payment_received',
      lines: [
        {
          account: debitAccountId || 'Bank/Cash',
          accountName: debitAccountName,
          description: `Payment Received ${payment.paymentNumber}`,
          debit: payment.amount || 0,
          credit: 0,
        },
        {
          account: arAccountId || 'Accounts Receivable',
          accountName: arAccountName,
          description: `Payment Received ${payment.paymentNumber}`,
          debit: 0,
          credit: payment.amount || 0,
        },
      ],
    });

    // Update Chart of Account balances
    try {
      await updateAccountBalances(journalEntry.lines, orgId);
    } catch (balanceError) {
      console.error('[PAYMENTS] Failed to update account balances:', balanceError);
    }

    return journalEntry._id;
  } catch (error: any) {
    console.error('[PAYMENTS] Error creating journal entry:', error);
    return null;
  }
};

// Helper function to create void reversal journal entry
const createVoidJournalEntry = async (
  invoice: any,
  originalJournalEntryId: mongoose.Types.ObjectId | undefined,
  orgId: string,
  userId?: string
): Promise<mongoose.Types.ObjectId | null> => {
  try {
    if (!originalJournalEntryId) {
      console.warn('[INVOICES] Cannot create void entry: original journal entry not found');
      return null;
    }

    const originalEntry = await JournalEntry.findById(originalJournalEntryId);
    if (!originalEntry) {
      console.warn('[INVOICES] Original journal entry not found for reversal');
      return null;
    }

    // Reverse the journal entry by swapping debits and credits
    const reversedLines = originalEntry.lines.map((line: any) => ({
      account: line.account,
      accountName: line.accountName,
      description: `Void Invoice ${invoice.invoiceNumber} - Reversal`,
      debit: line.credit || 0,
      credit: line.debit || 0,
    }));

    const journalNumber = `JE-VOID-${invoice.invoiceNumber}-${Date.now()}`;
    const voidEntry = await JournalEntry.create({
      organization: orgId,
      entryNumber: journalNumber,
      date: new Date(),
      description: `Void Invoice ${invoice.invoiceNumber} - Reversal Entry`,
      reference: invoice.invoiceNumber,
      status: 'posted',
      postedBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
      postedAt: new Date(),
      lines: reversedLines,
    });

    // Update Chart of Account balances
    try {
      await updateAccountBalances(voidEntry.lines, orgId);
    } catch (balanceError) {
      console.error('[INVOICES] Failed to update account balances on void:', balanceError);
    }

    return voidEntry._id;
  } catch (error: any) {
    console.error('[INVOICES] Error creating void journal entry:', error);
    return null;
  }
};

// Helper function to create refund journal entry
const createRefundJournalEntry = async (
  refund: any,
  orgId: string,
  userId?: string
): Promise<mongoose.Types.ObjectId | null> => {
  try {
    // 1. Credit Account (Bank/Cash) - Where the money is coming from
    let creditAccountId = refund.fromAccount;
    let creditAccountName = 'Bank/Cash';

    if (creditAccountId && mongoose.Types.ObjectId.isValid(creditAccountId)) {
      let bankAcc = await BankAccount.findById(creditAccountId);
      if (bankAcc) {
        creditAccountName = bankAcc.accountName;
      } else {
        let coaAcc = await ChartOfAccount.findById(creditAccountId);
        if (coaAcc) {
          creditAccountName = coaAcc.name || coaAcc.accountName;
        }
      }
    }

    // 2. Debit Account (Accounts Receivable)
    let arAccountId = await findAccountByName(orgId, 'Accounts Receivable');
    let arAccountName = 'Accounts Receivable';

    console.log('[REFUND JOURNAL] Accounts identified:', { creditAccountId, creditAccountName, arAccountId, arAccountName });

    const journalNumber = `JE-REF-${refund.refundNumber}-${Date.now()}`;
    const journalEntry = await JournalEntry.create({
      organization: orgId,
      entryNumber: journalNumber,
      date: refund.refundDate || new Date(),
      description: `Refund ${refund.refundNumber} for Payment - ${refund.description || ''}`,
      reference: refund.referenceNumber || refund.refundNumber,
      status: 'posted',
      postedBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
      postedAt: new Date(),
      sourceId: refund._id,
      sourceType: 'refund',
      lines: [
        {
          account: arAccountId || 'Accounts Receivable',
          accountName: arAccountName,
          description: `Refund ${refund.refundNumber}`,
          debit: refund.amount || 0,
          credit: 0,
        },
        {
          account: creditAccountId || 'Bank/Cash',
          accountName: creditAccountName,
          description: `Refund ${refund.refundNumber}`,
          debit: 0,
          credit: refund.amount || 0,
        },
      ],
    });

    console.log('[REFUND JOURNAL] Journal entry created:', journalEntry._id);

    // Update Chart of Account balances
    try {
      await updateAccountBalances(journalEntry.lines, orgId);
      console.log('[REFUND JOURNAL] Account balances updated');
    } catch (balanceError) {
      console.error('[REFUNDS] Failed to update account balances:', balanceError);
    }

    return journalEntry._id;
  } catch (error: any) {
    console.error('[REFUNDS] Error creating journal entry:', error);
    return null;
  }
};

// Helper function to create journal entry for credit note
const createCreditNoteJournalEntry = async (
  creditNote: any,
  orgId: string,
  userId?: string
): Promise<mongoose.Types.ObjectId | null> => {
  try {
    // 1. Debit Account (Sales Returns / Sales Income)
    let salesAccountId = await findAccountByName(orgId, 'Sales Returns');
    if (!salesAccountId) salesAccountId = await findAccountByName(orgId, 'Sales Income');
    if (!salesAccountId) salesAccountId = await findAccountByName(orgId, 'Sales');

    // 2. Credit Account (Accounts Receivable)
    let arAccountId = await findAccountByName(orgId, 'Accounts Receivable');
    // Try to resolve account documents (so we can set proper accountName values)
    let salesAccountDoc: any = null;
    let arAccountDoc: any = null;
    try {
      if (salesAccountId) salesAccountDoc = await ChartOfAccount.findById(salesAccountId).lean();
      if (arAccountId) arAccountDoc = await ChartOfAccount.findById(arAccountId).lean();
    } catch (docErr) {
      // ignore and continue with fallbacks
    }
    const journalNumber = `JE-CN-${creditNote.creditNoteNumber}-${Date.now()}`;
    const journalEntry = await JournalEntry.create({
      organization: orgId,
      entryNumber: journalNumber,
      date: creditNote.date || new Date(),
      description: `Credit Note ${creditNote.creditNoteNumber} for Customer - ${creditNote.reason || ''}`,
      reference: creditNote.referenceNumber || creditNote.creditNoteNumber,
      status: 'posted',
      postedBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
      postedAt: new Date(),
      sourceId: creditNote._id,
      sourceType: 'credit_note',
      lines: [
        {
          account: salesAccountId || 'Sales Returns',
          accountName: (salesAccountDoc && salesAccountDoc.accountName) ? salesAccountDoc.accountName : 'Sales Returns',
          description: `Credit Note ${creditNote.creditNoteNumber}`,
          debit: creditNote.total || 0,
          credit: 0,
        },
        {
          account: arAccountId || 'Accounts Receivable',
          accountName: (arAccountDoc && arAccountDoc.accountName) ? arAccountDoc.accountName : 'Accounts Receivable',
          description: `Credit Note ${creditNote.creditNoteNumber}`,
          debit: 0,
          credit: creditNote.total || 0,
        },
      ],
    });

    // Update Chart of Account balances
    try {
      await updateAccountBalances(journalEntry.lines, orgId);
    } catch (balanceError) {
      console.error('[CREDIT NOTES] Failed to update account balances:', balanceError);
    }

    return journalEntry._id;
  } catch (error: any) {
    console.error('[CREDIT NOTES] Error creating journal entry:', error);
    return null;
  }
};

const reverseAndDeleteCreditNoteJournals = async (
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
    sourceType: 'credit_note',
    sourceId: { $in: normalizedIds }
  });

  for (const entry of journals) {
    await updateAccountBalances(entry.lines, orgId, true);
  }

  await JournalEntry.deleteMany({
    organization: orgId,
    sourceType: 'credit_note',
    sourceId: { $in: normalizedIds }
  });
};

// Helper function to check and update overdue status
const updateOverdueStatus = async (invoice: any): Promise<void> => {
  try {
    if (!invoice.dueDate) return;

    const now = new Date();
    const dueDate = new Date(invoice.dueDate);

    if (isNaN(dueDate.getTime())) return; // Invalid date

    // Only set overdue if:
    // 1. Status is 'sent' or 'partially paid'
    // 2. Due date has passed
    // 3. Balance > 0
    if (
      (invoice.status === 'sent' || invoice.status === 'partially paid') &&
      dueDate < now &&
      (invoice.balance || 0) > 0
    ) {
      await Invoice.updateOne({ _id: invoice._id }, { $set: { status: 'overdue' } });
    }
    // If paid or balance is zero, remove overdue status if it exists
    else if (
      invoice.status === 'overdue' &&
      ((invoice.balance || 0) <= 0 || invoice.status === 'paid')
    ) {
      // Status will be updated by payment handler
    }
  } catch (error: any) {
    console.error('[INVOICES] Error updating overdue status:', error);
  }
};

// Helper function to validate status transition
const isValidStatusTransition = (oldStatus: string, newStatus: string): boolean => {
  const validTransitions: Record<string, string[]> = {
    draft: ['sent', 'draft'],
    sent: ['paid', 'partially paid', 'overdue', 'void'],
    viewed: ['paid', 'partially paid', 'overdue', 'void'],
    'partially paid': ['paid', 'overdue', 'void'],
    overdue: ['paid', 'partially paid', 'void'],
    paid: ['void'], // Can only void a paid invoice
    void: [], // Void is terminal
  };

  const allowed = validTransitions[oldStatus] || [];
  return allowed.includes(newStatus);
};

// Create new invoice
export const createInvoice = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const status = req.body.status || 'draft';

    // Validate initial status - new invoices should start as draft
    if (status !== 'draft' && status !== 'sent') {
      res.status(400).json({
        success: false,
        message: 'New invoices can only be created with status "draft" or "sent"'
      });
      return;
    }

    const { invoiceNumber } = req.body;
    if (!invoiceNumber) {
      res.status(400).json({ success: false, message: 'Invoice number is required' });
      return;
    }

    // Check for duplicate invoice number
    const existingInvoice = await Invoice.findOne({
      organization: req.user.organizationId,
      invoiceNumber: invoiceNumber
    });

    if (existingInvoice) {
      res.status(400).json({
        success: false,
        message: `Invoice number "${invoiceNumber}" already exists. Please use a different number.`
      });
      return;
    }

    const invoiceData: any = {
      ...req.body,
      organization: req.user.organizationId,
      status: status,
      balance: Number(req.body.total || 0) - Number(req.body.paidAmount || 0),
      journalEntryCreated: false,
    };

    // Backward-compatible default: dueDate is required in the model.
    // If the client doesn't send it, default to the invoice date (or "now").
    if (!invoiceData.dueDate) {
      invoiceData.dueDate = invoiceData.date || req.body.invoiceDate || Date.now();
    }

    if (
      invoiceData.shippingChargeTax === undefined &&
      (invoiceData.shippingTax !== undefined || invoiceData.shippingTaxId !== undefined)
    ) {
      invoiceData.shippingChargeTax = invoiceData.shippingTax ?? invoiceData.shippingTaxId;
    }

    if (invoiceData.shippingChargeTax !== undefined) {
      invoiceData.shippingChargeTax = String(invoiceData.shippingChargeTax || "").trim();
    }

    const invoice = await Invoice.create(invoiceData);

    // Increment TransactionNumberSeries if applicable
    const series = await TransactionNumberSeries.findOne({
      organization: req.user.organizationId,
      module: 'Invoice',
      isDefault: true,
      isActive: true
    });

    if (series) {
      const nextNumberPart = (series.currentNumber || 0) + 1;
      const expectedPadded = String(nextNumberPart).padStart(series.startingNumber?.length || 6, '0');
      const expectedInvoiceNumber = `${series.prefix}${expectedPadded}`;

      if (invoice.invoiceNumber === expectedInvoiceNumber) {
        series.currentNumber = nextNumberPart;
        await series.save();
        console.log(`[INVOICES] Incremented series ${series._id} to ${nextNumberPart}`);
      }
    }

    // If status is 'sent', create journal entry and update customer receivables
    if (status === 'sent') {
      const journalEntryId = await createInvoiceJournalEntry(
        invoice,
        req.user.organizationId,
        req.user.userId
      );
      if (journalEntryId) {
        invoice.journalEntryCreated = true;
        invoice.journalEntryId = journalEntryId;
        await invoice.save();

        // Update customer receivables
        try {
          await Customer.findByIdAndUpdate(invoice.customer, {
            $inc: { receivables: invoice.total || 0 }
          });
          console.log(`[INVOICES] Updated receivables for customer ${invoice.customer}: +${invoice.total}`);
        } catch (custError: any) {
          console.error('[INVOICES] Failed to update customer receivables:', custError.message);
        }
      }
    }

    // Update stock quantity for items (only if status is sent or paid)
    if (status !== 'draft' && req.body.items && Array.isArray(req.body.items)) {
      // Get items settings for inventory checks
      const { getItemsSettings } = await import('../utils/itemsSettings.js');
      const settings = await getItemsSettings(req.user.organizationId);

      if (settings.enableInventoryTracking) {
        for (const item of req.body.items) {
          const rawItemId = item.item || item.itemId;
          const itemId = rawItemId?._id || rawItemId;
          if (itemId && item.quantity) {
            try {
              // LOGGING: Detailed stock logic trace
              console.log(`[INVOICES] Stock Check: ItemID=${itemId}, Qty=${item.quantity}`);
              const itemDoc = await Item.findById(itemId);
              if (!itemDoc) {
                console.log(`[INVOICES] Stock Check Failed: Item not found for ID ${itemId}`);
                continue;
              }
              console.log(`[INVOICES] Found Item: ${itemDoc.name}, TrackInventory=${itemDoc.trackInventory}, CurrentStock=${itemDoc.stockQuantity}`);

              // Only reduce for inventory items
              if (!itemDoc.trackInventory) {
                console.log(`[INVOICES] Skipping stock reduction: Item ${itemDoc.name} does not track inventory.`);
                continue;
              }

              const quantityToDeduct = Math.abs(Number(item.quantity));
              const newStock = (itemDoc.stockQuantity || 0) - quantityToDeduct;

              console.log(`[INVOICES] Reducing stock: ${itemDoc.stockQuantity} - ${quantityToDeduct} = ${newStock}`);

              // Check for negative stock if prevention is enabled
              if (settings.preventNegativeStock && newStock < 0) {
                console.log(`[INVOICES] Prevent Negative Stock Blocked Transaction for ${itemDoc.name}`);
                res.status(400).json({
                  success: false,
                  message: `Cannot create invoice: Item "${itemDoc.name}" has insufficient stock. Available: ${itemDoc.stockQuantity}, Required: ${quantityToDeduct}`,
                });
                return;
              }

              // Show warning if enabled and stock goes negative
              if (settings.showOutOfStockWarning && newStock < 0) {
                console.warn(`[INVOICES] Warning: Item "${itemDoc.name}" stock will go below zero (${newStock})`);
              }

              // Update stock
              await Item.findByIdAndUpdate(itemId, {
                $inc: { stockQuantity: -quantityToDeduct }
              });

              // Check and send reorder point notification if enabled
              if (settings.notifyReorderPoint && newStock !== undefined && newStock !== null) {
                const { checkAndNotifyReorderPoint } = await import("../utils/reorderPointNotification.js");
                checkAndNotifyReorderPoint(
                  req.user.organizationId,
                  itemId.toString(),
                  newStock
                ).catch(err => {
                  console.error(`[INVOICES] Error checking reorder point for item ${itemId}:`, err);
                });
              }
            } catch (stockError) {
              console.error(`[INVOICES] Failed to update stock for item ${itemId}:`, stockError);
              // We continue creating the invoice even if stock update fails, but log it.
            }
          }
        }
      }
    }

    // Check for overdue status
    await updateOverdueStatus(invoice);

    res.status(201).json({ success: true, data: invoice });
  } catch (error: any) {
    console.error('[INVOICES] Error creating invoice:', error);
    if (error.stack) console.error(error.stack);
    res.status(500).json({ success: false, message: 'Error creating invoice', error: error.message });
  }
};

// Update invoice
export const updateInvoice = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const invoice = await Invoice.findOne({ _id: id, organization: req.user.organizationId });

    if (!invoice) {
      res.status(404).json({ success: false, message: 'Invoice not found' });
      return;
    }

    const oldStatus = invoice.status || 'draft';
    const newStatus = req.body.status || oldStatus;

    // Editing restrictions: Cannot edit after 'sent' status (except status changes)
    const isEditAttempt = req.body.total !== undefined ||
      req.body.items !== undefined ||
      req.body.customer !== undefined ||
      req.body.date !== undefined ||
      req.body.dueDate !== undefined;

    const editableStatuses = new Set(['draft', 'sent', 'overdue', 'viewed']);
    if (isEditAttempt && !editableStatuses.has(String(oldStatus).toLowerCase())) {
      res.status(403).json({
        success: false,
        message: 'Cannot edit this invoice in its current status.'
      });
      return;
    }

    // Validate status transition
    if (newStatus !== oldStatus && !isValidStatusTransition(oldStatus, newStatus)) {
      res.status(400).json({
        success: false,
        message: `Invalid status transition from "${oldStatus}" to "${newStatus}"`
      });
      return;
    }

    // Handle Draft → Sent transition: Create journal entry and update receivables
    if (oldStatus === 'draft' && newStatus === 'sent' && !invoice.journalEntryCreated) {
      const journalEntryId = await createInvoiceJournalEntry(
        invoice,
        req.user.organizationId,
        req.user.userId
      );
      if (journalEntryId) {
        req.body.journalEntryCreated = true;
        req.body.journalEntryId = journalEntryId;

        // Update customer receivables
        try {
          await Customer.findByIdAndUpdate(invoice.customer, {
            $inc: { receivables: invoice.total || 0 }
          });
          console.log(`[INVOICES] Updated receivables (Draft->Sent) for customer ${invoice.customer}: +${invoice.total}`);
        } catch (custError: any) {
          console.error('[INVOICES] Failed to update customer receivables:', custError.message);
        }
      }
    }

    // STOCK RECONCILIATION: when items are edited on an invoice that affects inventory.
    // This reconciles old vs new item quantities:
    // - quantity decreased => stock is returned
    // - quantity increased => extra stock is deducted
    if (Array.isArray(req.body.items) && (oldStatus !== 'draft' || newStatus !== 'draft')) {
      try {
        const { getItemsSettings } = await import('../utils/itemsSettings.js');
        const settings = await getItemsSettings(req.user.organizationId);

        if (settings.enableInventoryTracking) {
          const buildQtyMap = (items: any[] | undefined, status: string): Map<string, number> => {
            const qtyMap = new Map<string, number>();
            // Draft invoices should not affect stock.
            if (!items || !Array.isArray(items) || status === 'draft') return qtyMap;

            for (const line of items) {
              const rawItemId = (line as any).item || (line as any).itemId;
              const itemId = (rawItemId as any)?._id || rawItemId;
              const qty = Math.abs(Number((line as any).quantity || 0));
              if (!itemId || qty <= 0) continue;

              const key = String(itemId);
              qtyMap.set(key, (qtyMap.get(key) || 0) + qty);
            }
            return qtyMap;
          };

          const oldQtyMap = buildQtyMap(invoice.items as any[], oldStatus);
          const newQtyMap = buildQtyMap(req.body.items as any[], newStatus);
          const allItemIds = new Set<string>([
            ...Array.from(oldQtyMap.keys()),
            ...Array.from(newQtyMap.keys())
          ]);

          for (const itemId of allItemIds) {
            const oldQty = oldQtyMap.get(itemId) || 0;
            const newQty = newQtyMap.get(itemId) || 0;
            const deltaQty = newQty - oldQty; // +ve means deduct more, -ve means restore

            if (deltaQty === 0) continue;

            const itemDoc = await Item.findById(itemId);
            if (!itemDoc) {
              console.log(`[INVOICES] Item not found for stock reconciliation: ${itemId}`);
              continue;
            }

            if (!itemDoc.trackInventory) {
              console.log(`[INVOICES] Skipping non-inventory item in reconciliation: ${itemDoc.name} (${itemId})`);
              continue;
            }

            const currentStock = Number(itemDoc.stockQuantity || 0);
            const resultingStock = currentStock - deltaQty;

            if (deltaQty > 0 && settings.preventNegativeStock && resultingStock < 0) {
              res.status(400).json({
                success: false,
                message: `Cannot update invoice: Item "${itemDoc.name}" has insufficient stock. Available: ${currentStock}, Required: ${deltaQty}`,
              });
              return;
            }

            if (settings.showOutOfStockWarning && resultingStock < 0) {
              console.warn(`[INVOICES] Warning: Item "${itemDoc.name}" stock will go below zero (${resultingStock})`);
            }

            // Apply net stock change based on quantity delta.
            await Item.findByIdAndUpdate(itemId, {
              $inc: { stockQuantity: -deltaQty }
            });

            if (deltaQty > 0) {
              console.log(`[INVOICES] Deducted additional stock for ${itemDoc.name}: -${deltaQty}`);
            } else {
              console.log(`[INVOICES] Restored stock for ${itemDoc.name}: +${Math.abs(deltaQty)}`);
            }

            if (settings.notifyReorderPoint) {
              const { checkAndNotifyReorderPoint } = await import("../utils/reorderPointNotification.js");
              checkAndNotifyReorderPoint(
                req.user.organizationId,
                itemId.toString(),
                resultingStock
              ).catch(err => console.error(`[INVOICES] Reorder notify error:`, err));
            }
          }
        } else {
          console.log(`[INVOICES] Inventory tracking disabled in settings.`);
        }
      } catch (stockSystemError) {
        console.error('[INVOICES] Stock system error in updateInvoice reconciliation:', stockSystemError);
      }
    }

    // Handle Void status: Create reversal journal entry and decrement receivables
    if (newStatus === 'void' && oldStatus !== 'void') {
      // Only void if not already voided
      if (!invoice.voidJournalEntryId) {
        const voidJournalEntryId = await createVoidJournalEntry(
          invoice,
          invoice.journalEntryId,
          req.user.organizationId,
          req.user.userId
        );
        if (voidJournalEntryId) {
          req.body.voidJournalEntryId = voidJournalEntryId;

          // Update customer receivables (decrement by current balance)
          try {
            const amountToDecrement = invoice.balance || 0;
            await Customer.findByIdAndUpdate(invoice.customer, {
              $inc: { receivables: -amountToDecrement }
            });
            console.log(`[INVOICES] Updated receivables (Voided) for customer ${invoice.customer}: -${amountToDecrement}`);
          } catch (custError: any) {
            console.error('[INVOICES] Failed to update customer receivables on void:', custError.message);
          }
        }
      }
    }

    // Update invoice data
    const updateData: any = { ...req.body };
    let amountSettledByManualPaid = 0;

    if (
      updateData.shippingChargeTax === undefined &&
      (updateData.shippingTax !== undefined || updateData.shippingTaxId !== undefined)
    ) {
      updateData.shippingChargeTax = updateData.shippingTax ?? updateData.shippingTaxId;
    }

    if (updateData.shippingChargeTax !== undefined) {
      updateData.shippingChargeTax = String(updateData.shippingChargeTax || "").trim();
    }

    // Only recalculate balance if total is provided (avoid NaN on partial updates)
    if (req.body.total !== undefined) {
      updateData.balance = req.body.total - (req.body.paidAmount || invoice.paidAmount || 0);
    }

    // Update balance based on status
    if (newStatus === 'paid' && oldStatus !== 'paid') {
      const currentPaid = Math.max(0, Number(invoice.paidAmount || 0));
      const maxSettleAmount = Math.max(0, Number(invoice.total || 0) - currentPaid);
      const balanceOutstanding =
        (invoice.balance !== undefined && invoice.balance !== null)
          ? Math.max(0, Number(invoice.balance || 0))
          : maxSettleAmount;

      amountSettledByManualPaid = Math.min(balanceOutstanding, maxSettleAmount);
      updateData.balance = 0;
      updateData.paidAmount = Math.min(Number(invoice.total || 0), currentPaid + amountSettledByManualPaid);

      // If manually marking as paid, we should create a payment record or at least a journal entry
      // For now, let's create a payment journal entry directly if no payment received is linked
      // This remains a shortcut, but we only settle the outstanding amount to avoid over-posting.
      console.log(`[INVOICES] Invoice ${invoice.invoiceNumber} marked as PAID. Settling outstanding amount: ${amountSettledByManualPaid}`);
    }

    Object.assign(invoice, updateData);
    await invoice.save();

    // If marked as paid and no journal entry for payment exists, create one
    if (newStatus === 'paid' && oldStatus !== 'paid' && amountSettledByManualPaid > 0) {
      // Create a dummy payment object to pass to the helper
      const dummyPayment = {
        _id: invoice._id, // linking to invoice for now
        paymentNumber: `PAY-INV-${invoice.invoiceNumber}`,
        date: new Date(),
        amount: amountSettledByManualPaid,
        bankAccount: null, // will fallback to Petty Cash
        notes: `Automatic payment entry for Invoice ${invoice.invoiceNumber} marked as Paid`,
        paymentReference: invoice.invoiceNumber,
        allocations: [{ invoice: invoice._id, amount: amountSettledByManualPaid }]
      };

      await createPaymentJournalEntry(
        dummyPayment,
        req.user.organizationId,
        req.user.userId
      );

      // Keep customer receivables in sync when invoice is manually marked as paid.
      try {
        await Customer.findByIdAndUpdate(invoice.customer, {
          $inc: { receivables: -amountSettledByManualPaid }
        });
      } catch (custError: any) {
        console.error('[INVOICES] Failed to sync customer receivables on manual paid status:', custError.message);
      }
    }

    // Check for overdue status
    await updateOverdueStatus(invoice);

    // Reload to get updated status
    const updatedInvoice = await Invoice.findById(invoice._id);

    res.json({ success: true, data: updatedInvoice });
  } catch (error: any) {
    console.error('[INVOICES] Error updating invoice:', error);
    res.status(500).json({ success: false, message: 'Error updating invoice', error: error.message });
  }
};

// Void invoice
export const voidInvoice = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const invoice = await Invoice.findOne({ _id: id, organization: req.user.organizationId });

    if (!invoice) {
      res.status(404).json({ success: false, message: 'Invoice not found' });
      return;
    }

    if (invoice.status === 'void') {
      res.status(400).json({ success: false, message: 'Invoice is already voided' });
      return;
    }

    // Create reversal journal entry if original journal entry exists
    if (invoice.journalEntryId && !invoice.voidJournalEntryId) {
      const voidJournalEntryId = await createVoidJournalEntry(
        invoice,
        invoice.journalEntryId,
        req.user.organizationId,
        req.user.userId
      );
      if (voidJournalEntryId) {
        invoice.voidJournalEntryId = voidJournalEntryId;
      }
    }

    // Update customer receivables (decrement by current balance)
    try {
      const amountToDecrement = invoice.balance || 0;
      if (amountToDecrement > 0) {
        await Customer.findByIdAndUpdate(invoice.customer, {
          $inc: { receivables: -amountToDecrement }
        });
        console.log(`[INVOICES] Updated receivables (Voided) for customer ${invoice.customer}: -${amountToDecrement}`);
      }
    } catch (custError: any) {
      console.error('[INVOICES] Failed to update customer receivables on void:', custError.message);
    }

    // Restore stock quantities for items (only if not draft)
    if ((invoice.status as any) !== 'draft' && (invoice.status as any) !== 'void') {
      try {
        const { getItemsSettings } = await import('../utils/itemsSettings.js');
        const settings = await getItemsSettings(req.user.organizationId);

        if (settings.enableInventoryTracking && invoice.items && Array.isArray(invoice.items)) {
          console.log(`[INVOICES] Restoring stock for ${invoice.items.length} items on invoice void`);

          for (const item of invoice.items) {
            const itemId = (item as any).item || (item as any).itemId;
            if (itemId && (item as any).quantity) {
              try {
                const itemDoc = await Item.findById(itemId);
                if (!itemDoc) {
                  console.log(`[INVOICES] Item not found for stock restoration: ${itemId}`);
                  continue;
                }

                // Only restore for inventory items
                if (!itemDoc.trackInventory) {
                  console.log(`[INVOICES] Skipping stock restoration: Item ${itemDoc.name} does not track inventory`);
                  continue;
                }

                const quantityToRestore = Math.abs(Number((item as any).quantity));

                // Restore stock
                await Item.findByIdAndUpdate(itemId, {
                  $inc: { stockQuantity: quantityToRestore }
                });

                console.log(`[INVOICES] Restored stock for ${itemDoc.name}: +${quantityToRestore}`);
              } catch (itemError) {
                console.error(`[INVOICES] Failed to restore stock for item ${itemId}:`, itemError);
              }
            }
          }
        }
      } catch (stockError) {
        console.error('[INVOICES] Error restoring stock on invoice void:', stockError);
        // Continue with void even if stock restoration fails
      }
    }

    // Reverse and remove auto-generated payment journals linked to this invoice id.
    const linkedAutoPaymentJournals = await JournalEntry.find({
      organization: req.user.organizationId,
      sourceId: invoice._id,
      sourceType: 'payment_received'
    });

    for (const entry of linkedAutoPaymentJournals) {
      try {
        await updateAccountBalances(entry.lines, req.user.organizationId, true);
      } catch (err) {
        console.error('[INVOICES] Failed to reverse payment journal balances while voiding invoice:', err);
      }
    }

    await JournalEntry.deleteMany({
      organization: req.user.organizationId,
      sourceId: invoice._id,
      sourceType: 'payment_received'
    });

    invoice.status = 'void';
    await invoice.save();

    res.json({ success: true, data: invoice, message: 'Invoice voided successfully' });
  } catch (error: any) {
    console.error('[INVOICES] Error voiding invoice:', error);
    res.status(500).json({ success: false, message: 'Error voiding invoice', error: error.message });
  }
};

// Delete invoice
export const deleteInvoice = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;

    const invoice = await Invoice.findOne({
      _id: id,
      organization: req.user.organizationId
    });

    if (!invoice) {
      res.status(404).json({ success: false, message: 'Invoice not found' });
      return;
    }

    // 1. Reverse GL entries if they exist
    const journalEntries = await JournalEntry.find({
      organization: req.user.organizationId,
      sourceId: invoice._id,
      sourceType: 'invoice'
    });

    for (const entry of journalEntries) {
      try {
        await updateAccountBalances(entry.lines, req.user.organizationId, true);
      } catch (err) {
        console.error('[INVOICES] Failed to reverse account balances for deleted invoice:', err);
      }
    }

    // 2. Delete Journal Entries
    await JournalEntry.deleteMany({
      organization: req.user.organizationId,
      sourceId: invoice._id,
      sourceType: 'invoice'
    });

    // 3. Reverse/delete auto-generated payment journals tied directly to invoice id.
    const autoPaymentJournals = await JournalEntry.find({
      organization: req.user.organizationId,
      sourceId: invoice._id,
      sourceType: 'payment_received'
    });

    for (const entry of autoPaymentJournals) {
      try {
        await updateAccountBalances(entry.lines, req.user.organizationId, true);
      } catch (err) {
        console.error('[INVOICES] Failed to reverse payment journal balances for deleted invoice:', err);
      }
    }

    await JournalEntry.deleteMany({
      organization: req.user.organizationId,
      sourceId: invoice._id,
      sourceType: 'payment_received'
    });

    // 4. Update customer receivables (reverse the charge)
    if (invoice.status !== 'draft' && invoice.status !== 'void') {
      try {
        const amountToReverse = invoice.balance || 0;
        if (amountToReverse > 0) {
          await Customer.findByIdAndUpdate(invoice.customer, {
            $inc: { receivables: -amountToReverse }
          });
        }
      } catch (custError) {
        console.error('[INVOICES] Failed to update customer receivables on delete:', custError);
      }
    }

    // 5. Restore stock quantities for items (only if inventory was reduced before)
    if (invoice.status !== 'draft' && invoice.status !== 'void') {
      try {
        const { getItemsSettings } = await import('../utils/itemsSettings.js');
        const settings = await getItemsSettings(req.user.organizationId);

        if (settings.enableInventoryTracking && invoice.items && Array.isArray(invoice.items)) {
          console.log(`[INVOICES] Restoring stock for ${invoice.items.length} items on invoice deletion`);

          for (const item of invoice.items) {
            const itemId = (item as any).item || (item as any).itemId;
            if (itemId && (item as any).quantity) {
              try {
                const itemDoc = await Item.findById(itemId);
                if (!itemDoc) {
                  console.log(`[INVOICES] Item not found for stock restoration: ${itemId}`);
                  continue;
                }

                // Only restore for inventory items
                if (!itemDoc.trackInventory) {
                  console.log(`[INVOICES] Skipping stock restoration: Item ${itemDoc.name} does not track inventory`);
                  continue;
                }

                const quantityToRestore = Math.abs(Number((item as any).quantity));

                // Restore stock
                await Item.findByIdAndUpdate(itemId, {
                  $inc: { stockQuantity: quantityToRestore }
                });

                console.log(`[INVOICES] Restored stock for ${itemDoc.name}: +${quantityToRestore}`);
              } catch (itemError) {
                console.error(`[INVOICES] Failed to restore stock for item ${itemId}:`, itemError);
              }
            }
          }
        }
      } catch (stockError) {
        console.error('[INVOICES] Error restoring stock on invoice deletion:', stockError);
        // Continue with deletion even if stock restoration fails
      }
    }

    // 5. Delete the invoice itself
    await Invoice.deleteOne({ _id: invoice._id });

    res.json({ success: true, message: 'Invoice and associated records deleted successfully' });
  } catch (error: any) {
    console.error('[INVOICES] Error deleting invoice:', error);
    res.status(500).json({ success: false, message: 'Error deleting invoice', error: error.message });
  }
};

// ============================================================================
// INVOICE NUMBER GENERATION
// ============================================================================

// Get next invoice number
export const getNextInvoiceNumber = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
      return;
    }

    const { prefix: queryPrefix } = req.query as { prefix?: string };

    // 1. Try to get from TransactionNumberSeries
    const series = await TransactionNumberSeries.findOne({
      organization: req.user.organizationId,
      module: 'Invoice',
      isDefault: true,
      isActive: true
    });

    if (series) {
      const nextNumber = (series.currentNumber || 0) + 1;
      const prefix = queryPrefix || series.prefix || 'INV-';
      const paddedNumber = String(nextNumber).padStart(series.startingNumber?.length || 6, '0');
      const nextInvoiceNumber = `${prefix}${paddedNumber}`;

      res.json({
        success: true,
        data: {
          invoiceNumber: nextInvoiceNumber,
          nextNumber: nextNumber,
          prefix: prefix,
          seriesId: series._id
        }
      });
      return;
    }

    // 2. Fallback to existing logic if no series found
    const prefix = queryPrefix || 'INV-';

    // Find the highest invoice number with this prefix
    const lastInvoice = await Invoice.findOne({
      organization: req.user.organizationId,
      invoiceNumber: new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`)
    })
      .sort({ invoiceNumber: -1 })
      .lean() as any;

    let nextNumber = 1;
    if (lastInvoice && lastInvoice.invoiceNumber) {
      // Extract number from invoice number (e.g., "INV-000001" -> 1)
      const match = lastInvoice.invoiceNumber.match(/\d+$/);
      if (match) {
        nextNumber = parseInt(match[0], 10) + 1;
      }
    }

    // Format with zero padding
    const paddedNumber = String(nextNumber).padStart(6, '0');
    const nextInvoiceNumber = `${prefix}${paddedNumber}`;

    res.json({
      success: true,
      data: {
        invoiceNumber: nextInvoiceNumber,
        nextNumber: nextNumber,
        prefix: prefix
      }
    });
  } catch (error: any) {
    console.error('[INVOICES] Error getting next invoice number:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating invoice number',
      error: error.message
    });
  }
};

// Get invoices by customer ID
export const getInvoicesByCustomerId = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
      return;
    }

    const { customerId } = req.query as { customerId?: string };

    if (!customerId) {
      res.status(400).json({
        success: false,
        message: 'Customer ID is required'
      });
      return;
    }

    const invoices = await Invoice.find({
      organization: req.user.organizationId,
      customerId: customerId
    })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: invoices,
      count: invoices.length
    });
  } catch (error: any) {
    console.error('[INVOICES] Error getting invoices by customer ID:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching invoices',
      error: error.message
    });
  }
};

// Get credit notes by invoice ID
export const getCreditNotesByInvoiceId = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
      return;
    }

    const { invoiceId } = req.query as { invoiceId?: string };

    if (!invoiceId) {
      res.status(400).json({
        success: false,
        message: 'Invoice ID is required'
      });
      return;
    }

    const creditNotes = await CreditNote.find({
      organization: req.user.organizationId,
      invoice: invoiceId
    })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: creditNotes,
      count: creditNotes.length
    });
  } catch (error: any) {
    console.error('[CREDIT NOTES] Error getting credit notes by invoice ID:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching credit notes',
      error: error.message
    });
  }
};

// ============================================================================
// ESTIMATES CRUD OPERATIONS
// ============================================================================

export const listEstimates = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (mongoose.connection.readyState !== 1) {
      res.status(503).json({ code: 1, message: "Database not connected" });
      return;
    }

    if (!req.user?.organizationId) {
      res.status(401).json({ code: 1, message: "Unauthorized" });
      return;
    }

    const {
      estimate_number,
      reference_number,
      customer_name,
      customer_id,
      date,
      date_start,
      date_end,
      date_before,
      date_after,
      expiry_date,
      status,
      filter_by,
      search_text,
      sort_column = "created_time",
      page = "1",
      per_page = "200",
    } = req.query as Record<string, string | undefined>;

    const organization = req.user.organizationId;
    const andConditions: any[] = [{ organization }];

    if (estimate_number) {
      andConditions.push({
        quoteNumber: { $regex: escapeRegex(String(estimate_number).trim()), $options: "i" },
      });
    }

    if (reference_number) {
      andConditions.push({
        referenceNumber: { $regex: escapeRegex(String(reference_number).trim()), $options: "i" },
      });
    }

    if (customer_id) {
      andConditions.push({ customer: String(customer_id).trim() });
    }

    const normalizedStatus = normalizeEstimateFilterStatus(status || filter_by);
    if (normalizedStatus) {
      andConditions.push({ status: normalizedStatus });
    }

    const dateRange: Record<string, any> = {};
    if (date) {
      const exactDate = new Date(String(date));
      if (!Number.isNaN(exactDate.getTime())) {
        const nextDate = new Date(exactDate);
        nextDate.setDate(nextDate.getDate() + 1);
        dateRange.$gte = exactDate;
        dateRange.$lt = nextDate;
      }
    }
    if (date_start) {
      const parsed = new Date(String(date_start));
      if (!Number.isNaN(parsed.getTime())) dateRange.$gte = parsed;
    }
    if (date_end) {
      const parsed = new Date(String(date_end));
      if (!Number.isNaN(parsed.getTime())) {
        parsed.setHours(23, 59, 59, 999);
        dateRange.$lte = parsed;
      }
    }
    if (date_before) {
      const parsed = new Date(String(date_before));
      if (!Number.isNaN(parsed.getTime())) dateRange.$lt = parsed;
    }
    if (date_after) {
      const parsed = new Date(String(date_after));
      if (!Number.isNaN(parsed.getTime())) dateRange.$gt = parsed;
    }
    if (Object.keys(dateRange).length) {
      andConditions.push({ date: dateRange });
    }

    if (expiry_date) {
      const exactExpiryDate = new Date(String(expiry_date));
      if (!Number.isNaN(exactExpiryDate.getTime())) {
        const nextDate = new Date(exactExpiryDate);
        nextDate.setDate(nextDate.getDate() + 1);
        andConditions.push({ expiryDate: { $gte: exactExpiryDate, $lt: nextDate } });
      }
    }

    const customerSearchTerm = String(customer_name || "").trim();
    const searchTextTerm = String(search_text || "").trim();
    const customerTerms = [customerSearchTerm, searchTextTerm].filter(Boolean);
    let matchingCustomerIds: string[] = [];

    if (customerTerms.length) {
      const customerRegexes = customerTerms.map((term) => new RegExp(escapeRegex(term), "i"));
      const matchingCustomers = await Customer.find({
        organization,
        $or: customerRegexes.flatMap((regex) => ([
          { displayName: regex },
          { name: regex },
          { companyName: regex },
        ])),
      })
        .select("_id")
        .lean();

      matchingCustomerIds = matchingCustomers.map((customer) => String(customer._id));
    }

    if (customerSearchTerm) {
      if (!matchingCustomerIds.length) {
        res.json({
          code: 0,
          message: "success",
          estimates: [],
          page_context: {
            page: Number.parseInt(String(page), 10) || 1,
            per_page: Number.parseInt(String(per_page), 10) || 200,
            has_more_page: false,
            report_name: "estimates",
          },
        });
        return;
      }
      andConditions.push({ customer: { $in: matchingCustomerIds } });
    }

    if (searchTextTerm) {
      const regex = new RegExp(escapeRegex(searchTextTerm), "i");
      const searchConditions: any[] = [
        { quoteNumber: regex },
        { referenceNumber: regex },
      ];
      if (matchingCustomerIds.length) {
        searchConditions.push({ customer: { $in: matchingCustomerIds } });
      }
      andConditions.push({ $or: searchConditions });
    }

    const finalQuery = andConditions.length > 1 ? { $and: andConditions } : andConditions[0];

    const quotes = await Quote.find(finalQuery)
      .populate("customer", "displayName name companyName contactPersons billingAddress shippingAddress")
      .populate("salesperson", "name email")
      .populate("currencyId", "code symbol")
      .select("-__v")
      .lean();

    const mappedEstimates = quotes.map((quote) => mapQuoteToEstimate(quote, { summary: true }));
    const sortColumn = String(sort_column || "created_time");

    mappedEstimates.sort((left: any, right: any) => {
      const getSortValue = (estimate: any) => {
        switch (sortColumn) {
          case "customer_name":
            return String(estimate.customer_name || "").toLowerCase();
          case "estimate_number":
            return String(estimate.estimate_number || "").toLowerCase();
          case "date":
            return String(estimate.date || "");
          case "total":
            return Number(estimate.total || 0);
          case "created_time":
          default:
            return String(estimate.created_time || "");
        }
      };

      const leftValue = getSortValue(left);
      const rightValue = getSortValue(right);
      if (leftValue < rightValue) return -1;
      if (leftValue > rightValue) return 1;
      return 0;
    });

    if (sortColumn === "created_time" || sortColumn === "date" || sortColumn === "estimate_number" || sortColumn === "customer_name" || sortColumn === "total") {
      mappedEstimates.reverse();
    }

    const pageNumber = Math.max(1, Number.parseInt(String(page), 10) || 1);
    const perPageNumber = Math.max(1, Math.min(200, Number.parseInt(String(per_page), 10) || 200));
    const startIndex = (pageNumber - 1) * perPageNumber;
    const paginated = mappedEstimates.slice(startIndex, startIndex + perPageNumber);

    res.json({
      code: 0,
      message: "success",
      estimates: paginated,
      page_context: {
        page: pageNumber,
        per_page: perPageNumber,
        has_more_page: startIndex + perPageNumber < mappedEstimates.length,
        report_name: "estimates",
        sort_column: sortColumn,
      },
    });
  } catch (error: any) {
    console.error("[ESTIMATES] Error listing estimates:", error);
    res.status(500).json({
      code: 1,
      message: error.message || "Failed to list estimates",
    });
  }
};

export const getEstimateById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ code: 1, message: "Unauthorized" });
      return;
    }

    const { estimate_id } = req.params as { estimate_id?: string };
    const rawEstimateId = String(estimate_id || "").trim();
    if (!rawEstimateId) {
      res.status(400).json({ code: 1, message: "estimate_id is required" });
      return;
    }

    const orgFilter = { organization: req.user.organizationId };
    const quote = mongoose.Types.ObjectId.isValid(rawEstimateId)
      ? await Quote.findOne({ ...orgFilter, _id: rawEstimateId })
        .populate("customer", "displayName name companyName contactPersons billingAddress shippingAddress")
        .populate("salesperson", "name email")
        .populate("currencyId", "code symbol")
        .select("-__v")
      : await Quote.findOne({ ...orgFilter, quoteNumber: rawEstimateId })
        .populate("customer", "displayName name companyName contactPersons billingAddress shippingAddress")
        .populate("salesperson", "name email")
        .populate("currencyId", "code symbol")
        .select("-__v");

    if (!quote) {
      res.status(404).json({ code: 1, message: "The estimate does not exist." });
      return;
    }

    res.json({
      code: 0,
      message: "success",
      estimate: mapQuoteToEstimate(quote.toObject()),
    });
  } catch (error: any) {
    console.error("[ESTIMATES] Error fetching estimate:", error);
    res.status(500).json({
      code: 1,
      message: error.message || "Failed to fetch estimate",
    });
  }
};

export const createEstimate = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (mongoose.connection.readyState !== 1) {
      res.status(503).json({ code: 1, message: "Database not connected" });
      return;
    }

    if (!req.user?.organizationId) {
      res.status(401).json({ code: 1, message: "Unauthorized" });
      return;
    }

    const organization = req.user.organizationId;
    const body = req.body || {};
    const customerLookup = String(body.customer_id || body.customerId || body.customer || "").trim();
    const lineItemsInput = Array.isArray(body.line_items) ? body.line_items : [];

    if (!customerLookup) {
      res.status(400).json({ code: 1, message: "customer_id is required" });
      return;
    }

    if (!lineItemsInput.length) {
      res.status(400).json({ code: 1, message: "line_items is required" });
      return;
    }

    let customerDoc: any = null;
    if (mongoose.Types.ObjectId.isValid(customerLookup)) {
      customerDoc = await Customer.findOne({ _id: customerLookup, organization });
    }
    if (!customerDoc) {
      customerDoc = await Customer.findOne({
        organization,
        $or: [
          { displayName: customerLookup },
          { name: customerLookup },
          { email: customerLookup },
          { companyName: customerLookup },
        ],
      });
    }

    if (!customerDoc) {
      res.status(404).json({ code: 1, message: "Customer not found" });
      return;
    }

    const requestedEstimateNumber = String(body.estimate_number || body.quoteNumber || "").trim();
    const estimateNumber = requestedEstimateNumber || await generateNextEstimateNumber(String(organization));

    const existingQuote = await Quote.findOne({ organization, quoteNumber: estimateNumber }).select("_id").lean();
    if (existingQuote) {
      res.status(400).json({ code: 1, message: "estimate_number already exists" });
      return;
    }

    let salespersonDoc: any = null;
    const salespersonLookup = String(body.salesperson_id || body.salespersonId || "").trim();
    const salespersonName = String(body.salesperson_name || "").trim();
    if (salespersonLookup && mongoose.Types.ObjectId.isValid(salespersonLookup)) {
      salespersonDoc = await Salesperson.findOne({ _id: salespersonLookup, organization }).lean();
    } else if (salespersonName) {
      salespersonDoc = await Salesperson.findOne({ organization, name: salespersonName }).lean();
    }

    let projectDoc: any = null;
    const projectLookup = String(body.project_id || body.projectId || "").trim();
    if (projectLookup && mongoose.Types.ObjectId.isValid(projectLookup)) {
      projectDoc = await Project.findOne({ _id: projectLookup, organization }).lean();
    }

    let currencyDoc: any = null;
    const currencyLookup = String(body.currency_id || "").trim();
    const currencyCodeLookup = String(body.currency_code || customerDoc.currency || "").trim().toUpperCase();
    if (currencyLookup && mongoose.Types.ObjectId.isValid(currencyLookup)) {
      currencyDoc = await Currency.findOne({ _id: currencyLookup, organization }).lean();
    }
    if (!currencyDoc && currencyCodeLookup) {
      currencyDoc = await Currency.findOne({ organization, code: currencyCodeLookup }).lean();
    }

    const requestedItemIds = Array.from(new Set(
      lineItemsInput
        .map((entry: any) => String(entry?.item_id || "").trim())
        .filter((entry: string) => mongoose.Types.ObjectId.isValid(entry))
    ));

    const itemDocs = requestedItemIds.length
      ? await Item.find({ organization, _id: { $in: requestedItemIds } })
        .select("name description salesDescription unit sellingPrice type taxInfo")
        .lean()
      : [];
    const itemMap = new Map(itemDocs.map((entry: any) => [String(entry._id), entry]));

    const requestedTaxIds = Array.from(new Set(
      lineItemsInput
        .map((entry: any) => String(entry?.tax_id || "").trim())
        .filter((entry: string) => mongoose.Types.ObjectId.isValid(entry))
    ));
    const requestedTaxNames = Array.from(new Set(
      lineItemsInput
        .map((entry: any) => String(entry?.tax_name || "").trim())
        .filter(Boolean)
    ));
    const taxDocs = (requestedTaxIds.length || requestedTaxNames.length)
      ? await Tax.find({
        organization,
        $or: [
          ...(requestedTaxIds.length ? [{ _id: { $in: requestedTaxIds } }] : []),
          ...(requestedTaxNames.length ? [{ name: { $in: requestedTaxNames } }] : []),
        ],
      })
        .select("name rate")
        .lean()
      : [];
    const taxById = new Map(taxDocs.map((entry: any) => [String(entry._id), entry]));
    const taxByName = new Map(taxDocs.map((entry: any) => [String(entry.name), entry]));

    const isInclusiveTax = Boolean(body.is_inclusive_tax);
    const isDiscountBeforeTax = body.is_discount_before_tax !== undefined ? Boolean(body.is_discount_before_tax) : true;
    const discountScope = String(body.discount_type || "entity_level").trim() === "item_level" ? "item_level" : "entity_level";
    const overallDiscount = parseEstimateDiscountInput(body.discount);
    const shippingCharge = toNumericValue(body.shipping_charge, 0);
    const adjustment = toNumericValue(body.adjustment, 0);

    const normalizedLineItems = lineItemsInput.map((entry: any, index: number) => {
      const itemId = String(entry?.item_id || "").trim();
      const itemDoc = itemMap.get(itemId);
      const itemDiscountInput = parseEstimateDiscountInput(entry?.discount ?? entry?.discount_amount);
      const quantity = Math.max(0, toNumericValue(entry?.quantity, 0));
      const rate = toNumericValue(entry?.rate, itemDoc?.sellingPrice || 0);
      const baseSubtotal = quantity * rate;
      const itemDiscountAmount = itemDiscountInput.mode === "percent"
        ? (baseSubtotal * itemDiscountInput.value) / 100
        : itemDiscountInput.value;
      const lineSubtotal = Math.max(0, baseSubtotal - itemDiscountAmount);
      const taxDoc = taxById.get(String(entry?.tax_id || "")) || taxByName.get(String(entry?.tax_name || ""));
      const taxPercentage = toNumericValue(entry?.tax_percentage, taxDoc?.rate || itemDoc?.taxInfo?.taxRate || 0);
      const taxAmount = taxPercentage > 0
        ? (isInclusiveTax
          ? (lineSubtotal - (lineSubtotal / (1 + (taxPercentage / 100))))
          : ((lineSubtotal * taxPercentage) / 100))
        : 0;

      return {
        item: itemId && mongoose.Types.ObjectId.isValid(itemId) ? new mongoose.Types.ObjectId(itemId) : undefined,
        lineItemId: String(entry?.line_item_id || entry?.lineItemId || "").trim() || undefined,
        name: entry?.name || itemDoc?.name || "Item",
        description: entry?.description || itemDoc?.salesDescription || itemDoc?.description || "",
        itemOrder: entry?.item_order !== undefined ? Number(entry.item_order) || index + 1 : index + 1,
        productType: entry?.product_type || (itemDoc?.type ? String(itemDoc.type).toLowerCase() : undefined),
        bcyRate: entry?.bcy_rate !== undefined ? toNumericValue(entry.bcy_rate, rate) : undefined,
        unit: entry?.unit || itemDoc?.unit || undefined,
        quantity,
        unitPrice: rate,
        discountAmount: itemDiscountAmount,
        discount: entry?.discount ?? entry?.discount_amount,
        taxId: taxDoc?._id ? String(taxDoc._id) : (entry?.tax_id ? String(entry.tax_id) : undefined),
        taxName: taxDoc?.name || entry?.tax_name || undefined,
        taxType: entry?.tax_type || (taxPercentage > 0 ? "tax" : undefined),
        taxPercentage: taxPercentage || undefined,
        taxTreatmentCode: entry?.tax_treatment_code || undefined,
        locationId: entry?.location_id || body.location_id || undefined,
        locationName: entry?.location_name || body.location_name || undefined,
        tags: Array.isArray(entry?.tags) ? entry.tags : [],
        taxRate: taxPercentage,
        taxAmount,
        total: lineSubtotal,
      };
    });

    const subtotal = normalizedLineItems.reduce((sum: number, item: any) => sum + (Number(item.total || 0) || 0), 0);
    const lineLevelTaxTotal = normalizedLineItems.reduce((sum: number, item: any) => sum + (Number(item.taxAmount || 0) || 0), 0);
    const entityDiscountAmount = discountScope === "entity_level"
      ? (overallDiscount.mode === "percent" ? (subtotal * overallDiscount.value) / 100 : overallDiscount.value)
      : 0;
    const adjustedSubtotal = Math.max(0, subtotal - entityDiscountAmount);
    const adjustedTaxTotal = (discountScope === "entity_level" && isDiscountBeforeTax && subtotal > 0)
      ? (lineLevelTaxTotal * (adjustedSubtotal / subtotal))
      : lineLevelTaxTotal;

    const computedTotal = isInclusiveTax
      ? (adjustedSubtotal + shippingCharge + adjustment)
      : (adjustedSubtotal + adjustedTaxTotal + shippingCharge + adjustment);

    const requestedStatus = String(body.status || (String(req.query.send || "").toLowerCase() === "true" ? "sent" : "draft")).trim();
    const finalStatus = mapEstimateStatusToQuoteStatus(requestedStatus);
    const now = new Date();

    const quote = new Quote({
      organization,
      quoteNumber: estimateNumber,
      customer: customerDoc._id,
      date: body.date ? new Date(body.date) : now,
      expiryDate: body.expiry_date ? new Date(body.expiry_date) : undefined,
      referenceNumber: String(body.reference_number || "").trim(),
      salesperson: salespersonDoc?._id ? new mongoose.Types.ObjectId(String(salespersonDoc._id)) : undefined,
      salespersonName: salespersonDoc?.name || salespersonName || undefined,
      projectId: projectDoc?._id ? new mongoose.Types.ObjectId(String(projectDoc._id)) : undefined,
      projectName: projectDoc?.name || undefined,
      subject: String(body.subject || body.custom_subject || "").trim() || undefined,
      customSubject: String(body.custom_subject || "").trim() || undefined,
      customBody: String(body.custom_body || "").trim() || undefined,
      items: normalizedLineItems,
      subtotal,
      subTotal: subtotal,
      tax: adjustedTaxTotal,
      discount: overallDiscount.value,
      discountType: overallDiscount.mode,
      discountScope,
      isDiscountBeforeTax,
      discountAccount: "General Income",
      currencyId: currencyDoc?._id ? new mongoose.Types.ObjectId(String(currencyDoc._id)) : undefined,
      shippingCharges: shippingCharge,
      exchangeRate: body.exchange_rate !== undefined ? toNumericValue(body.exchange_rate, 1) : (customerDoc.exchangeRate || 1),
      shippingChargeTax: "",
      adjustment,
      adjustmentDescription: String(body.adjustment_description || "").trim(),
      roundOff: 0,
      total: body.total !== undefined ? toNumericValue(body.total, computedTotal) : computedTotal,
      taxExclusive: isInclusiveTax ? "Tax Inclusive" : "Tax Exclusive",
      currency: currencyDoc?.code || currencyCodeLookup || "USD",
      locationId: String(body.location_id || "").trim() || undefined,
      locationName: String(body.location_name || "").trim() || undefined,
      placeOfSupply: String(body.place_of_supply || "").trim() || undefined,
      gstNo: String(body.gst_no || "").trim() || undefined,
      gstTreatment: String(body.gst_treatment || "").trim() || undefined,
      taxTreatment: String(body.tax_treatment || "").trim() || undefined,
      isReverseChargeApplied: body.is_reverse_charge_applied !== undefined ? Boolean(body.is_reverse_charge_applied) : undefined,
      templateId: String(body.template_id || "").trim() || undefined,
      templateName: String(body.template_name || "").trim() || undefined,
      customFields: Array.isArray(body.custom_fields) ? body.custom_fields : [],
      contactPersonsAssociated: Array.isArray(body.contact_persons_associated) ? body.contact_persons_associated : [],
      billingAddress: mapEstimateAddressToSnapshot(body.billing_address || customerDoc.billingAddress || {}),
      shippingAddress: mapEstimateAddressToSnapshot(body.shipping_address || customerDoc.shippingAddress || {}),
      taxes: adjustedTaxTotal > 0
        ? [{ tax_name: "Tax", tax_amount: adjustedTaxTotal }]
        : [],
      pricePrecision: body.price_precision !== undefined ? Math.max(0, Number(body.price_precision) || 2) : 2,
      notes: String(body.notes || "").trim() || undefined,
      terms: String(body.terms || "").trim() || undefined,
      tags: Array.isArray(body.tags) ? body.tags : [],
      acceptRetainer: body.accept_retainer !== undefined ? Boolean(body.accept_retainer) : undefined,
      retainerPercentage: body.retainer_percentage !== undefined ? toNumericValue(body.retainer_percentage, 0) : undefined,
      isViewedByClient: false,
      acceptedDate: finalStatus === "accepted" ? now : undefined,
      declinedDate: finalStatus === "declined" ? now : undefined,
      status: finalStatus,
      attachedFiles: [],
      comments: [],
    });

    await quote.save();

    const series = await TransactionNumberSeries.findOne({
      organization,
      module: "Quote",
      isDefault: true,
      isActive: true,
    });
    if (series) {
      const nextNumberPart = (series.currentNumber || 0) + 1;
      const expectedPadded = String(nextNumberPart).padStart(series.startingNumber?.length || 6, "0");
      const expectedEstimateNumber = `${series.prefix || "EST-"}${expectedPadded}`;
      if (estimateNumber === expectedEstimateNumber) {
        series.currentNumber = nextNumberPart;
        await series.save();
      }
    }

    const populatedQuote = await Quote.findById(quote._id)
      .populate("customer", "displayName name companyName contactPersons billingAddress shippingAddress")
      .populate("salesperson", "name email")
      .populate("currencyId", "code symbol")
      .select("-__v")
      .lean();

    res.status(201).json({
      code: 0,
      message: "The estimate has been created",
      estimate: mapQuoteToEstimate(populatedQuote),
    });
  } catch (error: any) {
    console.error("[ESTIMATES] Error creating estimate:", error);
    res.status(500).json({
      code: 1,
      message: error.message || "Failed to create estimate",
    });
  }
};

// ============================================================================
// QUOTES CRUD OPERATIONS
// ============================================================================

// Get all quotes
export const getAllQuotes = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Check database connection
    if (mongoose.connection.readyState !== 1) {
      res.status(503).json({
        success: false,
        message: 'Database not connected',
        error: 'MongoDB connection is not established. Please check your database connection.'
      });
      return;
    }

    // Check authentication
    if (!req.user || !req.user.organizationId) {
      console.error('[QUOTES] No user or organizationId found. req.user:', req.user);
      res.status(401).json({
        success: false,
        message: 'Unauthorized - Organization ID required',
        error: 'User authentication or organization ID is missing'
      });
      return;
    }

    const {
      page = '1',
      limit = '50',
      search = '',
      status,
      customerId,
      sortBy = 'date',
      sortOrder = 'desc'
    } = req.query as {
      page?: string;
      limit?: string;
      search?: string;
      status?: string;
      customerId?: string;
      sortBy?: string;
      sortOrder?: string;
    };

    // Build organization filter
    const orgId = req.user.organizationId;
    const query: any = { organization: orgId };

    // Build final query
    const andConditions: any[] = [query];

    if (search && search.trim()) {
      andConditions.push({
        $or: [
          { quoteNumber: { $regex: search.trim(), $options: 'i' } },
          { referenceNumber: { $regex: search.trim(), $options: 'i' } },
          { notes: { $regex: search.trim(), $options: 'i' } },
          { terms: { $regex: search.trim(), $options: 'i' } }
        ]
      });
    }

    if (status && status !== 'All') {
      andConditions.push({ status: status });
    }

    if (customerId) {
      andConditions.push({ customer: customerId });
    }

    const finalQuery = andConditions.length > 1 ? { $and: andConditions } : query;

    // Sorting
    const validSortFields = ['date', 'createdAt', 'updatedAt', 'quoteNumber', 'referenceNumber', 'status', 'total'];
    const safeSortBy = validSortFields.includes(sortBy) ? sortBy : 'date';
    const sort: any = {};
    sort[safeSortBy] = sortOrder === 'asc' ? 1 : -1;

    // Pagination
    const skip = Math.max(0, (parseInt(page) - 1) * parseInt(limit));
    const limitValue = Math.max(1, Math.min(100, parseInt(limit)));

    let quotes: any[] = [];
    let total = 0;

    try {
      quotes = await Quote.find(finalQuery)
        .populate('customer', 'displayName name companyName email')
        .populate('items.item', 'name sku')
        .sort(sort)
        .skip(skip)
        .limit(limitValue)
        .select('-__v')
        .lean();

      total = await Quote.countDocuments(finalQuery);
    } catch (dbError: any) {
      console.error('[QUOTES] Database error in getAllQuotes:', dbError);
      throw dbError;
    }

    res.json({
      success: true,
      data: quotes,
      pagination: {
        page: parseInt(page),
        limit: limitValue,
        total,
        pages: Math.ceil(total / limitValue)
      }
    });
  } catch (error: any) {
    console.error('[QUOTES] Error in getAllQuotes:', error);
    console.error('[QUOTES] Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      query: req.query
    });

    if (res.headersSent) {
      console.error('[QUOTES] Response already sent, cannot send error response');
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Error fetching quotes',
      error: error.message || 'Unknown error occurred'
    });
  }
};

// Get single quote by ID
export const getQuoteById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Check if it's a valid MongoDB ObjectId
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(id);

    if (!isValidObjectId) {
      res.status(404).json({
        success: false,
        message: 'Quote not found - Invalid ID format',
        hint: `The quote ID "${id}" is not a valid MongoDB ObjectId.`
      });
      return;
    }

    const quote = await Quote.findById(id)
      .populate('customer', 'displayName name companyName email workPhone mobile billingAddress shippingAddress')
      .populate('items.item', 'name sku unit sellingPrice')
      .populate('convertedToInvoice', 'invoiceNumber total status')
      .select('-__v');

    if (!quote) {
      res.status(404).json({
        success: false,
        message: 'Quote not found',
        hint: `No quote found with ID "${id}".`
      });
      return;
    }

    // Check organization access
    if (req.user?.organizationId) {
      const orgId = req.user.organizationId;
      const quoteOrgId = quote.organization?.toString();
      const userOrgId = orgId.toString();

      if (quoteOrgId !== userOrgId &&
        quote.organization?.toString() !== orgId &&
        String(quote.organization) !== String(orgId)) {
        res.status(403).json({
          success: false,
          message: 'Access denied',
          error: 'You do not have access to this quote'
        });
        return;
      }
    }

    res.json({
      success: true,
      data: quote
    });
  } catch (error: any) {
    console.error('[QUOTES] Error in getQuoteById:', error);

    if (error.name === 'CastError' || error.message.includes('Cast to ObjectId failed')) {
      res.status(404).json({
        success: false,
        message: 'Invalid quote ID format',
        hint: `The ID "${req.params.id}" is not a valid MongoDB ObjectId.`
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Error fetching quote',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Create new quote
export const createQuote = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Check database connection
    if (mongoose.connection.readyState !== 1) {
      res.status(503).json({
        success: false,
        message: 'Database not connected'
      });
      return;
    }

    // Check authentication
    if (!req.user || !req.user.organizationId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized - Organization ID required'
      });
      return;
    }

    const {
      quoteNumber,
      customerId,
      customer, // Also accept 'customer' field from frontend
      referenceNumber,
      quoteDate,
      expiryDate,
      salesperson,
      projectName,
      subject,
      items = [],
      currency = 'KES',
      customerNotes = '',
      termsAndConditions = '',
      status = 'draft',
      salespersonId,
      discountType = 'percent',
      discountAccount = 'General Income',
      taxExclusive = 'Tax Exclusive',
      attachedFiles = [],
      comments = []
    } = req.body;

    console.log('[QUOTES] Create quote request body:', JSON.stringify(req.body, null, 2));

    // Handle salespersonId
    const finalSalespersonId = salespersonId || salesperson || req.body.salesperson_id;
    let salespersonToSave = null;
    if (finalSalespersonId && mongoose.Types.ObjectId.isValid(finalSalespersonId)) {
      salespersonToSave = new mongoose.Types.ObjectId(finalSalespersonId);
    } else if (finalSalespersonId) {
      console.warn(`[QUOTES] Received invalid salesperson ID: ${finalSalespersonId}. Setting to null.`);
      salespersonToSave = null;
    }

    // Validate required fields
    const finalQuoteNumber = quoteNumber || req.body.quote_number;
    if (!finalQuoteNumber) {
      res.status(400).json({
        success: false,
        message: 'Quote number is required'
      });
      return;
    }

    // Handle customer ID - accept both customerId and customer
    const finalCustomerId = customerId || customer || req.body.customer_id;
    if (!finalCustomerId) {
      res.status(400).json({
        success: false,
        message: 'Customer is required. Please provide customerId or customer field.'
      });
      return;
    }

    // Check if quote number already exists
    const existingQuote = await Quote.findOne({
      organization: req.user.organizationId,
      quoteNumber: finalQuoteNumber.toString()
    });

    if (existingQuote) {
      res.status(400).json({
        success: false,
        message: `Quote number ${finalQuoteNumber} already exists`
      });
      return;
    }

    // Validate customer exists - handle both ObjectId and string
    let customerDoc;
    if (mongoose.Types.ObjectId.isValid(finalCustomerId)) {
      customerDoc = await Customer.findById(finalCustomerId);
    } else {
      // Try to find by name or email if ID is not valid ObjectId
      customerDoc = await Customer.findOne({
        organization: req.user.organizationId,
        $or: [
          { displayName: finalCustomerId },
          { name: finalCustomerId },
          { email: finalCustomerId }
        ]
      });
    }

    if (!customerDoc) {
      res.status(404).json({
        success: false,
        message: `Customer not found: ${finalCustomerId}`,
        hint: 'Please provide a valid customer ID'
      });
      return;
    }

    // Use the actual customer ObjectId
    const actualCustomerId = customerDoc._id;

    // Build organization filter
    /*
    let _organizationId: any;
    if (mongoose.Types.ObjectId.isValid(orgId as string)) {
      _organizationId = new mongoose.Types.ObjectId(orgId as string);
    } else {
      _organizationId = orgId;
    }
    */

    const parseOptionalNumber = (value: any): number | undefined => {
      if (value === null || value === undefined || value === '') return undefined;
      const parsed = parseFloat(String(value));
      return Number.isFinite(parsed) ? parsed : undefined;
    };

    const taxMode = String(taxExclusive || req.body.taxExclusive || 'Tax Exclusive').toLowerCase();
    const isTaxInclusive = taxMode.includes('inclusive');

    // Map items to quote item schema
    const quoteItems = (items && Array.isArray(items) ? items : []).map((item: any, index: number) => {
      const quantity = parseOptionalNumber(item.quantity) ?? 0;
      const unitPrice = parseOptionalNumber(item.rate ?? item.price ?? item.unitPrice) ?? 0;
      const lineSubtotal = parseOptionalNumber(item.total ?? item.amount) ?? (quantity * unitPrice);

      if (!Number.isFinite(quantity) || !Number.isFinite(unitPrice) || !Number.isFinite(lineSubtotal)) {
        console.warn(`[QUOTES] Item at index ${index} has invalid numeric values:`, {
          quantity: item.quantity,
          unitPrice: item.rate ?? item.price ?? item.unitPrice,
          total: item.total ?? item.amount
        });
      }

      const taxRate = parseOptionalNumber(item.taxRate) ?? (() => {
        if (!item.tax) return 0;
        const cleaned = parseFloat(String(item.tax).replace('%', '').replace(' ', ''));
        return Number.isFinite(cleaned) ? cleaned : 0;
      })();

      const providedTaxAmount = parseOptionalNumber(item.taxAmount);
      const calculatedTaxAmount = taxRate > 0
        ? (isTaxInclusive
          ? (lineSubtotal - (lineSubtotal / (1 + taxRate / 100)))
          : ((lineSubtotal * taxRate) / 100))
        : 0;
      const lineTaxAmount = providedTaxAmount ?? calculatedTaxAmount;

      return {
        item: (item.itemId && mongoose.Types.ObjectId.isValid(item.itemId)) ? new mongoose.Types.ObjectId(item.itemId) :
          (item.item && mongoose.Types.ObjectId.isValid(item.item)) ? new mongoose.Types.ObjectId(item.item) : null,
        name: item.itemDetails || item.name || item.itemName || 'Item',
        description: item.description || item.itemDetails || '',
        quantity,
        unitPrice,
        taxRate,
        taxAmount: lineTaxAmount,
        total: lineSubtotal
      };
    });

    // Calculate totals from items if not provided
    const calculatedSubtotal = quoteItems.reduce((sum, item) => sum + (item.total || 0), 0);
    const calculatedTax = quoteItems.reduce((sum, item) => sum + (item.taxAmount || 0), 0);
    const finalSubtotal = parseOptionalNumber(req.body.subTotal) ?? parseOptionalNumber(req.body.subtotal) ?? calculatedSubtotal;
    const finalTax = parseOptionalNumber(req.body.tax) ?? calculatedTax;
    const finalDiscount = parseOptionalNumber(req.body.discountAmount) ?? parseOptionalNumber(req.body.discount) ?? 0;
    const finalShipping = parseOptionalNumber(req.body.shippingCharges) ?? parseOptionalNumber(req.body.shipping) ?? 0;
    const finalShippingChargeTax = String(req.body.shippingChargeTax ?? req.body.shippingTax ?? req.body.shippingTaxId ?? '').trim();
    const finalAdjustment = parseOptionalNumber(req.body.adjustment) ?? parseOptionalNumber(req.body.adjustments) ?? 0;
    const finalRoundOff = parseOptionalNumber(req.body.roundOff) ?? 0;

    const providedTotal = parseOptionalNumber(req.body.total);
    const calculatedTotal = isTaxInclusive
      ? (finalSubtotal - finalDiscount + finalShipping + finalAdjustment + finalRoundOff)
      : (finalSubtotal + finalTax - finalDiscount + finalShipping + finalAdjustment + finalRoundOff);
    const finalTotal = providedTotal ?? calculatedTotal;

    // Determine Initial Status based on Approval Settings
    let finalStatus = (status || 'draft').toLowerCase();
    let approvalLevel = 0;

    const organization = await Organization.findById(req.user.organizationId);
    const approvalType = organization?.settings?.quoteSettings?.approvalType || 'no-approval';

    if (approvalType === 'custom') {
      // Fetch active rules for Quotes
      const activeRules = await ApprovalRule.find({
        organization: req.user.organizationId,
        module: 'Quote',
        isActive: true
      }).sort({ priority: 1 });

      for (const rule of activeRules) {
        if (evaluateCriteria(rule.criteria, rule.criteriaPattern, {
          ...req.body,
          subtotal: finalSubtotal,
          total: finalTotal,
          customer: customerDoc // Include customer details for rule evaluation
        })) {
          console.log(`[QUOTES] Approval Rule Matched: ${rule.name} (${rule.approvalMode})`);
          if (rule.approvalMode === 'auto-approve') {
            finalStatus = 'accepted';
          } else if (rule.approvalMode === 'auto-reject') {
            finalStatus = 'rejected';
          } else if (rule.approvalMode === 'configure') {
            finalStatus = 'pending_approval';
            approvalLevel = 1; // Start at step 1
          }
          break; // Use the first matching rule
        }
      }
    } else if (approvalType === 'simple' || approvalType === 'multi-level') {
      // Fallback for simple/multi-level if needed, but here we focus on custom
      finalStatus = 'pending_approval';
      approvalLevel = 1;
    }

    console.log('[QUOTES] Creating quote with data:', {
      organization: req.user.organizationId,
      quoteNumber: finalQuoteNumber.toString(),
      customer: actualCustomerId,
      itemsCount: quoteItems.length,
      subtotal: finalSubtotal,
      total: finalTotal,
      status: finalStatus
    });

    // Create quote
    const quote = new Quote({
      organization: req.user.organizationId,
      quoteNumber: finalQuoteNumber.toString(),
      customer: actualCustomerId,
      date: quoteDate || req.body.date ? new Date(quoteDate || req.body.date) : new Date(),
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
      referenceNumber: referenceNumber || req.body.reference_number || '',
      salesperson: salespersonToSave,
      projectName: projectName || '',
      subject: subject || '',
      items: quoteItems,
      subtotal: finalSubtotal,
      subTotal: finalSubtotal,
      tax: finalTax,
      discount: finalDiscount,
      shippingCharges: finalShipping,
      shippingChargeTax: finalShippingChargeTax,
      adjustment: finalAdjustment,
      roundOff: finalRoundOff,
      total: finalTotal,
      currency: (currency || 'KES').toUpperCase(),
      status: finalStatus,
      approvalLevel: approvalLevel,
      taxExclusive: taxExclusive || req.body.taxExclusive || 'Tax Exclusive',
      discountType: discountType || req.body.discountType || 'percent',
      discountAccount: discountAccount || req.body.discountAccount || 'General Income',
      notes: customerNotes || req.body.notes || '',
      terms: termsAndConditions || req.body.terms || '',
      attachedFiles: (attachedFiles && Array.isArray(attachedFiles)) ? attachedFiles.map((file: any) => ({
        name: file.name,
        url: file.url,
        size: parseFloat(file.size),
        mimeType: file.mimeType || file.type || '',
        documentId: file.documentId || '',
        uploadedAt: file.uploadedAt || new Date()
      })) : [],
      comments: (comments && Array.isArray(comments))
        ? comments
          .filter((comment: any) => comment && String(comment.text || '').trim())
          .map((comment: any) => ({
            text: String(comment.text || '').trim(),
            author: comment.author || 'User',
            bold: Boolean(comment.bold),
            italic: Boolean(comment.italic),
            underline: Boolean(comment.underline),
            timestamp: comment.timestamp ? new Date(comment.timestamp) : new Date()
          }))
        : []
    });

    try {
      await quote.save();
      console.log('[QUOTES] Quote saved successfully:', quote._id);

      // Increment TransactionNumberSeries if applicable
      const series = await TransactionNumberSeries.findOne({
        organization: req.user.organizationId,
        module: 'Quote',
        isDefault: true,
        isActive: true
      });

      if (series) {
        // Only increment if the used quote number matches the series prefix + next number
        // Or more simply, always increment if it's the default series?
        // Let's increment if the currentNumber + 1 matches the numeric part of the quoteNumber
        const nextNumberPart = (series.currentNumber || 0) + 1;
        const expectedPadded = String(nextNumberPart).padStart(series.startingNumber?.length || 6, '0');
        const expectedQuoteNumber = `${series.prefix}${expectedPadded}`;

        if (finalQuoteNumber.toString() === expectedQuoteNumber) {
          series.currentNumber = nextNumberPart;
          await series.save();
          console.log(`[QUOTES] Incremented series ${series._id} to ${nextNumberPart}`);
        }
      }

      try {
        await executeQuoteCreateWorkflows({
          organizationId: String(req.user.organizationId),
          quote,
          customer: customerDoc || null,
          actorEmail: req.user?.email,
        });
      } catch (workflowError: any) {
        console.error('[QUOTES] Workflow execution failed after quote creation:', workflowError?.message || workflowError);
      }
    } catch (saveError: any) {
      console.error('[QUOTES] Error saving quote to database:', saveError);
      if (saveError.name === 'ValidationError') {
        console.error('[QUOTES] Validation details:', JSON.stringify(saveError.errors, null, 2));
      }
      throw saveError;
    }

    // Populate and return
    const populatedQuote = await Quote.findById(quote._id)
      .populate('customer', 'displayName name companyName email')
      .populate('items.item', 'name sku')
      .select('-__v')
      .lean();

    console.log('[QUOTES] ✅ Quote created successfully:', quote._id);

    res.status(201).json({
      success: true,
      message: 'Quote created successfully',
      data: populatedQuote
    });
  } catch (error: any) {
    console.error('[QUOTES] ❌ Error creating quote:', error);
    console.error('[QUOTES] Error stack:', error.stack);
    console.error('[QUOTES] Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      errors: error.errors
    });

    if (error.code === 11000) {
      res.status(400).json({
        success: false,
        message: 'Quote number already exists',
        error: 'A quote with this number already exists'
      });
      return;
    }

    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors || {}).map((err: any) => ({
        field: err.path,
        message: err.message,
        value: err.value
      }));

      console.error('[QUOTES] Validation failed details:', JSON.stringify(validationErrors, null, 2));

      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Error creating quote',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Update quote
export const updateQuote = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Check database connection
    if (mongoose.connection.readyState !== 1) {
      res.status(503).json({
        success: false,
        message: 'Database not connected'
      });
      return;
    }

    // Check authentication
    if (!req.user || !req.user.organizationId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized - Organization ID required'
      });
      return;
    }

    const { id } = req.params;
    const updateData: any = req.body;

    // Find quote and verify organization access
    const quote = await Quote.findById(id);
    if (!quote) {
      res.status(404).json({
        success: false,
        message: 'Quote not found'
      });
      return;
    }

    // Check organization access
    const orgId = req.user.organizationId;
    const quoteOrgId = quote.organization?.toString();
    const userOrgId = orgId.toString();

    if (quoteOrgId !== userOrgId &&
      quote.organization?.toString() !== orgId &&
      String(quote.organization) !== String(orgId)) {
      res.status(403).json({
        success: false,
        message: 'Access denied',
        error: 'You do not have access to this quote'
      });
      return;
    }

    // Check if quote is accepted and if editing is allowed
    if (quote.status === 'accepted') {
      const organization = await Organization.findById(req.user.organizationId);
      const allowEditing = organization?.settings?.quoteSettings?.allowEditingAcceptedQuotes;

      if (allowEditing === false) {
        res.status(400).json({
          success: false,
          message: 'Cannot edit an accepted quote. Please change settings to allow this.'
        });
        return;
      }
    }

    // Handle items update
    if (updateData.items && Array.isArray(updateData.items)) {
      const isTaxInclusive = String(updateData.taxExclusive || quote.taxExclusive || '').toLowerCase().includes('inclusive');

      updateData.items = updateData.items.map((item: any) => {
        const quantity = parseFloat(String(item.quantity ?? 0));
        const unitPrice = parseFloat(String(item.rate ?? item.price ?? item.unitPrice ?? 0));
        const total = parseFloat(String(item.total ?? item.amount ?? ((Number.isFinite(quantity) ? quantity : 0) * (Number.isFinite(unitPrice) ? unitPrice : 0))));
        const directTaxRate = parseFloat(String(item.taxRate ?? ''));
        const fallbackTaxRate = parseFloat(String(item.tax ?? '').replace('%', '').replace(' ', ''));
        const taxRate = Number.isFinite(directTaxRate)
          ? directTaxRate
          : (Number.isFinite(fallbackTaxRate) ? fallbackTaxRate : 0);
        const providedTaxAmount = parseFloat(String(item.taxAmount ?? ''));
        const taxAmount = Number.isFinite(providedTaxAmount)
          ? providedTaxAmount
          : (taxRate > 0
            ? (isTaxInclusive
              ? (total - (total / (1 + taxRate / 100)))
              : ((total * taxRate) / 100))
            : 0);

        return {
          item: item.itemId || item.item || null,
          name: item.itemDetails || item.name || item.itemName || 'Item',
          description: item.description || item.itemDetails || '',
          quantity: isNaN(quantity) ? 0 : quantity,
          unitPrice: isNaN(unitPrice) ? 0 : unitPrice,
          taxRate,
          taxAmount,
          total: isNaN(total) ? 0 : total
        };
      });
    }

    // Map top level fields
    if (updateData.subtotal === undefined && updateData.subTotal !== undefined) {
      updateData.subtotal = updateData.subTotal;
    }

    // Sanitize other numeric fields
    ['subtotal', 'subTotal', 'tax', 'discount', 'shippingCharges', 'adjustment', 'roundOff', 'total'].forEach(field => {
      if (updateData[field] !== undefined) {
        updateData[field] = parseFloat(updateData[field]) || 0;
      }
    });

    if (
      updateData.shippingChargeTax === undefined &&
      (updateData.shippingTax !== undefined || updateData.shippingTaxId !== undefined || req.body.shippingTax !== undefined || req.body.shippingTaxId !== undefined)
    ) {
      updateData.shippingChargeTax =
        updateData.shippingTax ??
        updateData.shippingTaxId ??
        req.body.shippingTax ??
        req.body.shippingTaxId;
    }
    if (updateData.shippingChargeTax !== undefined) {
      updateData.shippingChargeTax = String(updateData.shippingChargeTax || '').trim();
    }

    // Handle date fields
    if (updateData.quoteDate || updateData.date || req.body.date) {
      updateData.date = new Date(updateData.quoteDate || updateData.date || req.body.date);
      delete updateData.quoteDate;
    }
    if (updateData.expiryDate) {
      updateData.expiryDate = new Date(updateData.expiryDate);
    }

    // Handle customer ID
    if (updateData.customerId || req.body.customer_id) {
      updateData.customer = updateData.customerId || req.body.customer_id;
      delete updateData.customerId;
    }

    // Handle notes and terms
    if (updateData.customerNotes !== undefined || req.body.notes !== undefined) {
      updateData.notes = updateData.customerNotes || req.body.notes;
      delete updateData.customerNotes;
    }
    if (updateData.termsAndConditions !== undefined || req.body.terms !== undefined) {
      updateData.terms = updateData.termsAndConditions || req.body.terms;
      delete updateData.termsAndConditions;
    }

    // Handle salesperson - ensure it's a valid ObjectId or null
    if (updateData.salesperson || updateData.salespersonId || req.body.salesperson_id) {
      const spId = updateData.salespersonId || updateData.salesperson || req.body.salesperson_id;
      if (spId && mongoose.Types.ObjectId.isValid(spId)) {
        updateData.salesperson = new mongoose.Types.ObjectId(spId);
      } else {
        console.warn(`[QUOTES] Invalid salesperson ID in update: ${spId}. Setting to null.`);
        updateData.salesperson = null;
      }
      delete updateData.salespersonId;
    }

    // Handle reference number
    if (req.body.reference_number !== undefined) {
      updateData.referenceNumber = req.body.reference_number;
    }

    // Handle numeric fields
    if (updateData.subTotal !== undefined || updateData.subtotal !== undefined) {
      updateData.subtotal = parseFloat(String(updateData.subTotal ?? updateData.subtotal ?? 0)) || 0;
      delete updateData.subTotal;
    }
    if (updateData.discountAmount !== undefined || updateData.discount !== undefined) {
      updateData.discount = parseFloat(String(updateData.discountAmount ?? updateData.discount ?? 0)) || 0;
      delete updateData.discountAmount;
    }
    if (updateData.shippingCharges !== undefined) {
      updateData.shippingCharges = parseFloat(updateData.shippingCharges) || 0;
    }
    if (updateData.adjustment !== undefined) {
      updateData.adjustment = parseFloat(updateData.adjustment) || 0;
    }
    if (updateData.roundOff !== undefined) {
      updateData.roundOff = parseFloat(updateData.roundOff) || 0;
    }
    if (updateData.attachedFiles && Array.isArray(updateData.attachedFiles)) {
      updateData.attachedFiles = updateData.attachedFiles.map((file: any) => ({
        name: file.name,
        url: file.url,
        size: parseFloat(file.size) || 0,
        mimeType: file.mimeType || file.type || '',
        documentId: file.documentId || '',
        uploadedAt: file.uploadedAt || new Date()
      }));
    }
    if (updateData.comments && Array.isArray(updateData.comments)) {
      updateData.comments = updateData.comments
        .filter((comment: any) => comment && String(comment.text || '').trim())
        .map((comment: any) => ({
          text: String(comment.text || '').trim(),
          author: comment.author || 'User',
          bold: Boolean(comment.bold),
          italic: Boolean(comment.italic),
          underline: Boolean(comment.underline),
          timestamp: comment.timestamp ? new Date(comment.timestamp) : new Date()
        }));
    }
    if (updateData.total !== undefined) {
      updateData.total = parseFloat(updateData.total) || 0;
    }

    // Check if quote number is being changed and if it already exists
    if (updateData.quoteNumber && updateData.quoteNumber !== quote.quoteNumber) {
      const existingQuote = await Quote.findOne({
        organization: req.user.organizationId,
        quoteNumber: updateData.quoteNumber.toString(),
        _id: { $ne: id }
      });

      if (existingQuote) {
        res.status(400).json({
          success: false,
          message: `Quote number ${updateData.quoteNumber} already exists`
        });
        return;
      }
    }

    // Update quote
    const updatedQuote = await Quote.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .populate('customer', 'displayName name companyName email')
      .populate('items.item', 'name sku')
      .select('-__v');

    if (!updatedQuote) {
      res.status(404).json({
        success: false,
        message: 'Quote not found after update'
      });
      return;
    }

    res.json({
      success: true,
      message: 'Quote updated successfully',
      data: updatedQuote
    });
  } catch (error: any) {
    console.error('[QUOTES] Error updating quote:', error);

    if (error.code === 11000) {
      res.status(400).json({
        success: false,
        message: 'Quote number already exists',
        error: 'A quote with this number already exists'
      });
      return;
    }

    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors || {}).map((err: any) => ({
        field: err.path,
        message: err.message,
        value: err.value
      }));

      console.error('[QUOTES] Validation failed in update:', JSON.stringify(validationErrors, null, 2));

      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
      return;
    }



    res.status(500).json({
      success: false,
      message: 'Error updating quote',
      error: error.message
    });
  }
};

// Delete quote
export const deleteQuote = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Check authentication
    if (!req.user || !req.user.organizationId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized - Organization ID required'
      });
      return;
    }

    const { id } = req.params;

    // Find quote and verify organization access
    const quote = await Quote.findById(id);
    if (!quote) {
      res.status(404).json({
        success: false,
        message: 'Quote not found'
      });
      return;
    }

    // Check organization access
    const orgId = req.user.organizationId;
    const quoteOrgId = quote.organization?.toString();
    const userOrgId = orgId.toString();

    if (quoteOrgId !== userOrgId &&
      quote.organization?.toString() !== orgId &&
      String(quote.organization) !== String(orgId)) {
      res.status(403).json({
        success: false,
        message: 'Access denied',
        error: 'You do not have access to this quote'
      });
      return;
    }

    // Check if quote has been converted to invoice
    if (quote.convertedToInvoice) {
      res.status(400).json({
        success: false,
        message: 'Cannot delete quote',
        error: 'This quote has been converted to an invoice and cannot be deleted'
      });
      return;
    }

    // Delete quote
    await Quote.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Quote deleted successfully'
    });
  } catch (error: any) {
    console.error('[QUOTES] Error deleting quote:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting quote',
      error: error.message
    });
  }
};

// Convert quote to invoice
export const convertQuoteToInvoice = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Check authentication
    if (!req.user || !req.user.organizationId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized - Organization ID required'
      });
      return;
    }

    const { id } = req.params;

    // Find quote
    const quote = await Quote.findById(id)
      .populate('customer')
      .populate('items.item');

    if (!quote) {
      res.status(404).json({
        success: false,
        message: 'Quote not found'
      });
      return;
    }

    // Check organization access
    const orgId = req.user.organizationId;
    const quoteOrgId = quote.organization?.toString();
    const userOrgId = orgId.toString();

    if (quoteOrgId !== userOrgId &&
      quote.organization?.toString() !== orgId &&
      String(quote.organization) !== String(orgId)) {
      res.status(403).json({
        success: false,
        message: 'Access denied'
      });
      return;
    }

    // Check if already converted
    if (quote.convertedToInvoice) {
      res.status(400).json({
        success: false,
        message: 'Quote already converted',
        error: 'This quote has already been converted to an invoice',
        invoiceId: quote.convertedToInvoice
      });
      return;
    }

    // Generate invoice number
    const lastInvoice = await Invoice.findOne({
      organization: req.user.organizationId,
      invoiceNumber: new RegExp('^INV-')
    })
      .sort({ invoiceNumber: -1 })
      .lean() as any;

    let nextInvoiceNumber = 1;
    if (lastInvoice && lastInvoice.invoiceNumber) {
      const match = lastInvoice.invoiceNumber.match(/\d+$/);
      if (match) {
        nextInvoiceNumber = parseInt(match[0], 10) + 1;
      }
    }

    const invoiceNumber = `INV-${String(nextInvoiceNumber).padStart(6, '0')}`;

    // Fetch organization settings for retainFields
    const organization = await Organization.findById(req.user.organizationId);
    const quoteSettings = organization?.settings?.quoteSettings;
    const retainFields = quoteSettings?.retainFields || {
      customerNotes: true,
      termsConditions: true,
      address: true
    };

    // Map quote items to invoice items
    const invoiceItems = quote.items.map((item: any) => ({
      item: item.item || item.itemId || null,
      name: item.name || '',
      description: item.description || '',
      quantity: item.quantity || 0,
      unitPrice: item.unitPrice || 0,
      taxRate: item.taxRate || 0,
      taxAmount: item.taxAmount || 0,
      total: item.total || 0
    }));

    // Build organization ID
    let organizationId: any;
    if (mongoose.Types.ObjectId.isValid(orgId as string)) {
      organizationId = new mongoose.Types.ObjectId(orgId as string);
    } else {
      organizationId = orgId;
    }

    // Calculate balance (total - paidAmount, initially balance = total)
    const invoiceTotal = quote.total || 0;

    // Create invoice
    const invoice = new Invoice({
      organization: organizationId,
      invoiceNumber: invoiceNumber,
      customer: quote.customer,
      date: new Date(),
      dueDate: quote.expiryDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      items: invoiceItems,
      subtotal: quote.subtotal || 0,
      tax: quote.tax || 0,
      discount: quote.discount || 0,
      shippingCharges: (quote as any).shippingCharges || 0,
      shippingChargeTax: String((quote as any).shippingChargeTax || ''),
      adjustment: (quote as any).adjustment || 0,
      total: invoiceTotal,
      balance: invoiceTotal, // Initially balance equals total
      paidAmount: 0,
      currency: quote.currency || 'KES',
      status: 'draft',
      notes: retainFields.customerNotes ? (quote.notes || '') : '',
      terms: retainFields.termsConditions ? (quote.terms || '') : '',
      convertedFromQuote: quote._id
    });

    await invoice.save();

    // Update quote status and link to invoice
    quote.status = 'invoiced';
    quote.convertedToInvoice = invoice._id;
    await quote.save();

    // Populate invoice
    const populatedInvoice = await Invoice.findById(invoice._id)
      .populate('customer', 'displayName name companyName email')
      .populate('items.item', 'name sku')
      .select('-__v')
      .lean();

    res.status(201).json({
      success: true,
      message: 'Quote converted to invoice successfully',
      data: populatedInvoice,
      quoteId: quote._id
    });
  } catch (error: any) {
    console.error('[QUOTES] Error converting quote to invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Error converting quote to invoice',
      error: error.message
    });
  }
};

// Bulk delete quotes
export const bulkDeleteQuotes = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Check authentication
    if (!req.user || !req.user.organizationId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized - Organization ID required'
      });
      return;
    }

    const { quoteIds } = req.body;

    if (!quoteIds || !Array.isArray(quoteIds) || quoteIds.length === 0) {
      res.status(400).json({
        success: false,
        message: 'Quote IDs array is required'
      });
      return;
    }

    // Build organization filter
    const orgId = req.user.organizationId;
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

    // Validate all quotes exist and belong to the organization
    const validIds = quoteIds.filter(id => mongoose.Types.ObjectId.isValid(id));

    if (validIds.length === 0) {
      res.status(400).json({
        success: false,
        message: 'No valid quote IDs provided'
      });
      return;
    }

    // Find quotes and check organization access
    const quotes = await Quote.find({
      _id: { $in: validIds.map(id => new mongoose.Types.ObjectId(id)) },
      ...orgFilter
    });

    if (quotes.length === 0) {
      res.status(404).json({
        success: false,
        message: 'No quotes found with the provided IDs or you do not have access to them'
      });
      return;
    }

    // Check if any quotes have been converted to invoice
    const convertedQuotes = quotes.filter(q => q.convertedToInvoice);
    if (convertedQuotes.length > 0) {
      res.status(400).json({
        success: false,
        message: 'Cannot delete converted quotes',
        error: `${convertedQuotes.length} quote(s) have been converted to invoices and cannot be deleted`,
        convertedQuoteIds: convertedQuotes.map(q => q._id)
      });
      return;
    }

    // Delete quotes
    const deleteResult = await Quote.deleteMany({
      _id: { $in: quotes.map(q => q._id) },
      ...orgFilter
    });

    res.json({
      success: true,
      message: `Successfully deleted ${deleteResult.deletedCount} quote(s)`,
      deletedCount: deleteResult.deletedCount,
      quoteIds: quotes.map(q => q._id)
    });
  } catch (error: any) {
    console.error('[QUOTES] Error in bulk delete quotes:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting quotes',
      error: error.message
    });
  }
};

// Bulk update quotes
export const bulkUpdateQuotes = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Check authentication
    if (!req.user || !req.user.organizationId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized - Organization ID required'
      });
      return;
    }

    const { quoteIds, updateData } = req.body;

    if (!quoteIds || !Array.isArray(quoteIds) || quoteIds.length === 0) {
      res.status(400).json({
        success: false,
        message: 'Quote IDs array is required'
      });
      return;
    }

    if (!updateData || typeof updateData !== 'object' || Object.keys(updateData).length === 0) {
      res.status(400).json({
        success: false,
        message: 'Update data is required'
      });
      return;
    }

    // Build organization filter
    const orgId = req.user.organizationId;
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

    // Validate all quote IDs
    const validIds = quoteIds.filter(id => mongoose.Types.ObjectId.isValid(id));

    if (validIds.length === 0) {
      res.status(400).json({
        success: false,
        message: 'No valid quote IDs provided'
      });
      return;
    }

    // Prepare update data - handle date fields and customer mapping
    const preparedUpdateData: any = { ...updateData };

    // Handle date fields
    if (preparedUpdateData.quoteDate || preparedUpdateData.date) {
      preparedUpdateData.date = new Date(preparedUpdateData.quoteDate || preparedUpdateData.date);
      delete preparedUpdateData.quoteDate;
    }
    if (preparedUpdateData.expiryDate) {
      preparedUpdateData.expiryDate = new Date(preparedUpdateData.expiryDate);
    }

    // Handle customer ID mapping
    if (preparedUpdateData.customerId) {
      preparedUpdateData.customer = preparedUpdateData.customerId;
      delete preparedUpdateData.customerId;
    }

    // Handle notes and terms mapping
    if (preparedUpdateData.customerNotes !== undefined) {
      preparedUpdateData.notes = preparedUpdateData.customerNotes;
      delete preparedUpdateData.customerNotes;
    }
    if (preparedUpdateData.termsAndConditions !== undefined) {
      preparedUpdateData.terms = preparedUpdateData.termsAndConditions;
      delete preparedUpdateData.termsAndConditions;
    }

    // Handle numeric fields
    if (preparedUpdateData.subTotal !== undefined) {
      preparedUpdateData.subtotal = parseFloat(preparedUpdateData.subTotal);
      delete preparedUpdateData.subTotal;
    }
    if (preparedUpdateData.discountAmount !== undefined) {
      preparedUpdateData.discount = parseFloat(preparedUpdateData.discountAmount);
      delete preparedUpdateData.discountAmount;
    }

    // Check if quote number is being updated - must be unique
    if (preparedUpdateData.quoteNumber) {
      const existingQuote = await Quote.findOne({
        organization: req.user.organizationId,
        quoteNumber: preparedUpdateData.quoteNumber.toString(),
        _id: { $nin: validIds.map(id => new mongoose.Types.ObjectId(id)) }
      });

      if (existingQuote) {
        res.status(400).json({
          success: false,
          message: `Quote number ${preparedUpdateData.quoteNumber} already exists`,
          error: 'Cannot update quotes with a duplicate quote number'
        });
        return;
      }
    }

    // Update quotes
    const updateResult = await Quote.updateMany(
      {
        _id: { $in: validIds.map(id => new mongoose.Types.ObjectId(id)) },
        ...orgFilter
      },
      { $set: preparedUpdateData },
      { runValidators: true }
    );

    if (updateResult.matchedCount === 0) {
      res.status(404).json({
        success: false,
        message: 'No quotes found with the provided IDs or you do not have access to them'
      });
      return;
    }

    // Fetch updated quotes
    const updatedQuotes = await Quote.find({
      _id: { $in: validIds.map(id => new mongoose.Types.ObjectId(id)) },
      ...orgFilter
    })
      .populate('customer', 'displayName name companyName email')
      .populate('items.item', 'name sku')
      .select('-__v')
      .lean();

    res.json({
      success: true,
      message: `Successfully updated ${updateResult.modifiedCount} quote(s)`,
      matchedCount: updateResult.matchedCount,
      modifiedCount: updateResult.modifiedCount,
      data: updatedQuotes
    });
  } catch (error: any) {
    console.error('[QUOTES] Error in bulk update quotes:', error);

    if (error.code === 11000) {
      res.status(400).json({
        success: false,
        message: 'Duplicate quote number',
        error: 'A quote with this number already exists'
      });
      return;
    }

    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors || {}).map((err: any) => ({
        field: err.path,
        message: err.message
      }));
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Error updating quotes',
      error: error.message
    });
  }
};

// Bulk mark quotes as sent
export const bulkMarkQuotesAsSent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Check authentication
    if (!req.user || !req.user.organizationId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized - Organization ID required'
      });
      return;
    }

    const { quoteIds } = req.body;

    if (!quoteIds || !Array.isArray(quoteIds) || quoteIds.length === 0) {
      res.status(400).json({
        success: false,
        message: 'Quote IDs array is required'
      });
      return;
    }

    // Build organization filter
    const orgId = req.user.organizationId;
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

    // Validate all quote IDs
    const validIds = quoteIds.filter(id => mongoose.Types.ObjectId.isValid(id));

    if (validIds.length === 0) {
      res.status(400).json({
        success: false,
        message: 'No valid quote IDs provided'
      });
      return;
    }

    // Update quotes status to 'sent'
    const updateResult = await Quote.updateMany(
      {
        _id: { $in: validIds.map(id => new mongoose.Types.ObjectId(id)) },
        ...orgFilter
      },
      { $set: { status: 'sent' } },
      { runValidators: true }
    );

    if (updateResult.matchedCount === 0) {
      res.status(404).json({
        success: false,
        message: 'No quotes found with the provided IDs or you do not have access to them'
      });
      return;
    }

    // Fetch updated quotes
    const updatedQuotes = await Quote.find({
      _id: { $in: validIds.map(id => new mongoose.Types.ObjectId(id)) },
      ...orgFilter
    })
      .populate('customer', 'displayName name companyName email')
      .populate('items.item', 'name sku')
      .select('-__v')
      .lean();

    res.json({
      success: true,
      message: `Successfully marked ${updateResult.modifiedCount} quote(s) as sent`,
      matchedCount: updateResult.matchedCount,
      modifiedCount: updateResult.modifiedCount,
      data: updatedQuotes
    });
  } catch (error: any) {
    console.error('[QUOTES] Error in bulk mark quotes as sent:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking quotes as sent',
      error: error.message
    });
  }
};

// ============================================================================
// QUOTE NUMBER GENERATION
// ============================================================================

// Get next quote number
export const getNextQuoteNumber = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
      return;
    }

    const { prefix: queryPrefix } = req.query as { prefix?: string };

    // 1. Try to get from TransactionNumberSeries
    const series = await TransactionNumberSeries.findOne({
      organization: req.user.organizationId,
      module: 'Quote',
      isDefault: true,
      isActive: true
    });

    if (series) {
      const nextNumber = (series.currentNumber || 0) + 1;
      const prefix = queryPrefix || series.prefix || 'QT-';
      const paddedNumber = String(nextNumber).padStart(series.startingNumber?.length || 6, '0');
      const nextQuoteNumber = `${prefix}${paddedNumber}`;

      res.json({
        success: true,
        data: {
          quoteNumber: nextQuoteNumber,
          nextNumber: nextNumber,
          prefix: prefix,
          seriesId: series._id
        }
      });
      return;
    }

    // 2. Fallback to existing logic if no series found
    const prefix = queryPrefix || 'QT-';

    // Find the highest quote number with this prefix
    const lastQuote = await Quote.findOne({
      organization: req.user.organizationId,
      quoteNumber: new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`)
    })
      .sort({ quoteNumber: -1 })
      .lean();

    let nextNumber = 1;
    if (lastQuote && lastQuote.quoteNumber) {
      // Extract number from quote number (e.g., "QT-000001" -> 1)
      const match = lastQuote.quoteNumber.match(/\d+$/);
      if (match) {
        nextNumber = parseInt(match[0], 10) + 1;
      }
    }

    // Format with zero padding
    const paddedNumber = String(nextNumber).padStart(6, '0');
    const nextQuoteNumber = `${prefix}${paddedNumber}`;

    res.json({
      success: true,
      data: {
        quoteNumber: nextQuoteNumber,
        nextNumber: nextNumber,
        prefix: prefix
      }
    });
  } catch (error: any) {
    console.error('[QUOTES] Error getting next quote number:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating quote number',
      error: error.message
    });
  }
};

// ============================================================================
// RECURRING INVOICES CRUD OPERATIONS
// ============================================================================

// Get all recurring invoices
export const getAllRecurringInvoices = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
      return;
    }

    const recurringInvoices = await RecurringInvoice.find({
      organization: req.user.organizationId
    })
      .populate('customer', 'displayName name companyName email')
      .populate('salespersonId', 'name email')
      .populate('items.item', 'name sku')
      .populate('projectIds', 'name projectNumber status customer')
      .populate('associatedProjects', 'name projectNumber status customer')
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: recurringInvoices
    });
  } catch (error: any) {
    console.error('[RECURRING INVOICES] Error fetching recurring invoices:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching recurring invoices',
      error: error.message
    });
  }
};

// Get single recurring invoice by ID
export const getRecurringInvoiceById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id || id === 'undefined') {
      res.status(400).json({
        success: false,
        message: 'Invalid recurring invoice ID'
      });
      return;
    }

    const recurringInvoice = await RecurringInvoice.findById(id)
      .populate('customer', 'displayName name companyName email')
      .populate('salespersonId', 'name email')
      .populate('items.item', 'name sku')
      .populate('projectIds', 'name projectNumber status customer')
      .populate('associatedProjects', 'name projectNumber status customer');

    if (!recurringInvoice) {
      res.status(404).json({
        success: false,
        message: 'Recurring invoice not found'
      });
      return;
    }

    // Check organization access
    if (req.user?.organizationId &&
      recurringInvoice.organization?.toString() !== req.user.organizationId.toString()) {
      res.status(403).json({
        success: false,
        message: 'Access denied'
      });
      return;
    }

    res.json({
      success: true,
      data: recurringInvoice
    });
  } catch (error: any) {
    console.error('[RECURRING INVOICES] Error fetching recurring invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching recurring invoice',
      error: error.message
    });
  }
};

// Create new recurring invoice
export const createRecurringInvoice = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
      return;
    }

    const {
      profileName,
      customer,
      orderNumber = "",
      frequency,
      startDate,
      endDate,
      items = [],
      subtotal = 0,
      tax = 0,
      discount = 0,
      shippingCharges = 0,
      shippingChargeTax = '',
      adjustment = 0,
      total = 0,
      currency = 'USD',
      paymentTerms = "",
      accountsReceivable = "",
      salesperson = "",
      salespersonId,
      projectIds = [],
      associatedProjects = [],
      notes = '',
      terms = '',
      attachedFiles = [],
      status = 'active'
    } = req.body;

    const parseNumber = (value: any, fallback = 0): number => {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : fallback;
    };

    const normalizedSubtotal = parseNumber(subtotal);
    const normalizedTax = parseNumber(tax);
    const normalizedDiscount = parseNumber(discount);
    const normalizedShippingCharges = parseNumber(shippingCharges);
    const normalizedAdjustment = parseNumber(adjustment);
    const normalizedTotal = parseNumber(total);
    const normalizedSalesperson = String(salesperson || "").trim();
    const normalizedSalespersonId = normalizeOptionalObjectId(salespersonId);
    const normalizedProjectIds = normalizeObjectIdArray(projectIds);
    const normalizedAssociatedProjects = normalizeObjectIdArray(associatedProjects);
    const mergedProjectIds = Array.from(
      new Set([
        ...normalizedProjectIds.map((projectId) => String(projectId)),
        ...normalizedAssociatedProjects.map((projectId) => String(projectId)),
      ])
    ).map((projectId) => new mongoose.Types.ObjectId(projectId));
    const normalizedAttachedFiles = normalizeRecurringAttachedFiles(attachedFiles);
    const normalizedShippingChargeTax = String(
      shippingChargeTax ?? req.body.shippingTax ?? req.body.shippingTaxId ?? ''
    ).trim();

    // Validate required fields
    if (!profileName || !customer || !frequency || !startDate) {
      res.status(400).json({
        success: false,
        message: 'Missing required fields: profileName, customer, frequency, startDate'
      });
      return;
    }

    // Create recurring invoice with proper date calculation
    const recurringInvoice = new RecurringInvoice({
      organization: req.user.organizationId,
      profileName,
      customer,
      orderNumber,
      paymentTerms,
      accountsReceivable,
      salesperson: normalizedSalesperson,
      salespersonId: normalizedSalespersonId,
      projectIds: mergedProjectIds,
      associatedProjects: mergedProjectIds,
      frequency,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : undefined,
      nextInvoiceDate: new Date(startDate), // Will be calculated by model method
      items,
      subtotal: normalizedSubtotal,
      tax: normalizedTax,
      discount: normalizedDiscount,
      shippingCharges: normalizedShippingCharges,
      shippingChargeTax: normalizedShippingChargeTax,
      adjustment: normalizedAdjustment,
      total: normalizedTotal,
      currency: currency.toUpperCase(),
      notes,
      terms,
      attachedFiles: normalizedAttachedFiles,
      status,
      invoicesGenerated: 0
    });

    // Calculate initial next invoice date
    recurringInvoice.nextInvoiceDate = recurringInvoice.calculateNextInvoiceDate();

    await recurringInvoice.save();

    const populatedRecurringInvoice = await RecurringInvoice.findById(recurringInvoice._id)
      .populate('customer', 'displayName name companyName email')
      .populate('salespersonId', 'name email')
      .populate('items.item', 'name sku')
      .populate('projectIds', 'name projectNumber status customer')
      .populate('associatedProjects', 'name projectNumber status customer');

    // Send email notification
    if (populatedRecurringInvoice) {
      try {
        const customerData = populatedRecurringInvoice.customer as any;
        if (customerData?.email) {
          const emailHtml = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Recurring Invoice Created</title>
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
                <h2>Recurring Invoice Created</h2>
              </div>
              <div class="content">
                <p>Dear ${customerData.displayName || customerData.name || 'Customer'},</p>
                <p>A new recurring invoice has been set up for you:</p>
                <p><strong>Profile Name:</strong> ${profileName}</p>
                <p><strong>Frequency:</strong> ${frequency}</p>
                <p><strong>Start Date:</strong> ${new Date(startDate).toLocaleDateString()}</p>
                <p><strong>Next Invoice Date:</strong> ${recurringInvoice.nextInvoiceDate.toLocaleDateString()}</p>
                <p><strong>Total Amount:</strong> ${currency} ${normalizedTotal.toFixed(2)}</p>
                <p>You will receive invoices automatically based on the schedule above.</p>
              </div>
              <div class="footer">
                <p>Thank you for your business!</p>
                <p>This email was sent from Taban Books</p>
              </div>
            </div>
          </body>
          </html>
        `;

          await sendEmail({
            to: customerData.email,
            subject: `Recurring Invoice Created: ${profileName}`,
            html: emailHtml
          });

          console.log('✅ Recurring invoice email sent to:', customerData.email);
        }
      } catch (emailError) {
        console.error('❌ Error sending recurring invoice email:', emailError);
        // Continue with response even if email fails
      }

      res.status(201).json({
        success: true,
        message: 'Recurring invoice created successfully',
        data: populatedRecurringInvoice
      });
    }
  } catch (error: any) {
    console.error('[RECURRING INVOICES] Error creating recurring invoice:', error);

    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors || {}).map((err: any) => ({
        field: err.path,
        message: err.message
      }));
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Error creating recurring invoice',
      error: error.message
    });
  }
};

// Generate invoice from recurring template
export const generateInvoiceFromRecurring = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
      return;
    }

    const { id } = req.params;

    const recurringInvoice = await RecurringInvoice.findById(id)
      .populate('customer', 'displayName name companyName email')
      .populate('items.item', 'name sku');

    if (!recurringInvoice) {
      res.status(404).json({
        success: false,
        message: 'Recurring invoice not found'
      });
      return;
    }

    // Check organization access
    if (req.user?.organizationId &&
      recurringInvoice.organization?.toString() !== req.user.organizationId.toString()) {
      res.status(403).json({
        success: false,
        message: 'Access denied'
      });
      return;
    }

    // Create actual invoice from recurring template
    const customerData = recurringInvoice.customer as any;

    // Determine invoice number using transaction number series
    const invoiceNumber = await generateInvoiceNumber(req.user.organizationId.toString(), true);

    const newInvoice = new Invoice({
      organization: req.user.organizationId,
      customer: recurringInvoice.customer,
      invoiceNumber,
      orderNumber: (recurringInvoice as any).orderNumber || `RI-${recurringInvoice.profileName}`,
      items: recurringInvoice.items,
      subtotal: recurringInvoice.subtotal,
      tax: recurringInvoice.tax,
      discount: recurringInvoice.discount,
      shippingCharges: (recurringInvoice as any).shippingCharges || 0,
      shippingChargeTax: String((recurringInvoice as any).shippingChargeTax || ''),
      adjustment: (recurringInvoice as any).adjustment || 0,
      total: recurringInvoice.total,
      currency: recurringInvoice.currency,
      paymentTerms: (recurringInvoice as any).paymentTerms,
      notes: recurringInvoice.notes,
      terms: recurringInvoice.terms,
      // Save as draft initially; will be sent when user chooses to send or when payment is recorded
      status: 'draft',
      date: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      accountsReceivable: (recurringInvoice as any).accountsReceivable,
      isRecurringInvoice: true,
      recurringProfileId: recurringInvoice._id,
      recurringInvoiceId: recurringInvoice._id,
      paidAmount: 0,
      balance: recurringInvoice.total
    });

    await newInvoice.save();

    // Update recurring invoice dates
    recurringInvoice.lastInvoiceDate = newInvoice.date;
    await recurringInvoice.save();

    // Only send email if invoice status is 'sent' (we default to 'draft' so no email will be sent here)
    try {
      if (newInvoice.status === 'sent' && customerData?.email) {
        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>New Invoice Generated</title>
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
                <h2>New Invoice Generated</h2>
              </div>
              <div class="content">
                <p>Dear ${customerData.displayName || customerData.name || 'Customer'},</p>
                <p>A new invoice has been generated from your recurring invoice template:</p>
                <p><strong>Invoice Number:</strong> ${newInvoice.invoiceNumber}</p>
                <p><strong>Profile Name:</strong> ${recurringInvoice.profileName}</p>
                <p><strong>Invoice Date:</strong> ${new Date().toLocaleDateString()}</p>
                <p><strong>Due Date:</strong> ${newInvoice.dueDate.toLocaleDateString()}</p>
                <p><strong>Total Amount:</strong> ${recurringInvoice.currency} ${recurringInvoice.total.toFixed(2)}</p>
                <p>Please process the payment by the due date.</p>
              </div>
              <div class="footer">
                <p>Thank you for your business!</p>
                <p>This email was sent from Taban Books</p>
              </div>
            </div>
          </body>
          </html>
        `;

        await sendEmail({
          to: customerData.email,
          subject: `New Invoice: ${newInvoice.invoiceNumber}`,
          html: emailHtml
        });

        console.log('✅ Invoice email sent to:', customerData.email);
      }
    } catch (emailError) {
      console.error('❌ Error sending invoice email:', emailError);
    }

    res.status(201).json({
      success: true,
      message: 'Invoice generated successfully from recurring template',
      data: {
        invoice: newInvoice,
        recurringInvoice: recurringInvoice
      }
    });
  } catch (error: any) {
    console.error('[RECURRING INVOICES] Error generating invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating invoice',
      error: error.message
    });
  }
};

// Update recurring invoice
export const updateRecurringInvoice = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
      return;
    }

    const { id } = req.params;
    const updateData = req.body || {};

    const recurringInvoice = await RecurringInvoice.findById(id);
    if (!recurringInvoice) {
      res.status(404).json({
        success: false,
        message: 'Recurring invoice not found'
      });
      return;
    }

    // Check organization access
    if (recurringInvoice.organization?.toString() !== req.user.organizationId.toString()) {
      res.status(403).json({
        success: false,
        message: 'Access denied'
      });
      return;
    }

    const normalizedUpdates: any = { ...updateData };
    if (
      normalizedUpdates.shippingChargeTax === undefined &&
      (normalizedUpdates.shippingTax !== undefined || normalizedUpdates.shippingTaxId !== undefined)
    ) {
      normalizedUpdates.shippingChargeTax = normalizedUpdates.shippingTax ?? normalizedUpdates.shippingTaxId;
    }
    if (normalizedUpdates.shippingChargeTax !== undefined) {
      normalizedUpdates.shippingChargeTax = String(normalizedUpdates.shippingChargeTax || '').trim();
    }
    if (normalizedUpdates.startDate !== undefined && normalizedUpdates.startDate) {
      normalizedUpdates.startDate = new Date(normalizedUpdates.startDate);
    }
    if (normalizedUpdates.endDate !== undefined) {
      normalizedUpdates.endDate = normalizedUpdates.endDate ? new Date(normalizedUpdates.endDate) : undefined;
    }
    if (normalizedUpdates.nextInvoiceDate !== undefined && normalizedUpdates.nextInvoiceDate) {
      normalizedUpdates.nextInvoiceDate = new Date(normalizedUpdates.nextInvoiceDate);
    }
    if (normalizedUpdates.salesperson !== undefined) {
      normalizedUpdates.salesperson = String(normalizedUpdates.salesperson || "").trim();
    }
    if (normalizedUpdates.salespersonId !== undefined) {
      normalizedUpdates.salespersonId = normalizeOptionalObjectId(normalizedUpdates.salespersonId);
    }
    if (normalizedUpdates.projectIds !== undefined || normalizedUpdates.associatedProjects !== undefined) {
      const normalizedProjectIds = normalizeObjectIdArray(normalizedUpdates.projectIds);
      const normalizedAssociatedProjects = normalizeObjectIdArray(normalizedUpdates.associatedProjects);
      const mergedProjectIds = Array.from(
        new Set([
          ...normalizedProjectIds.map((projectId) => String(projectId)),
          ...normalizedAssociatedProjects.map((projectId) => String(projectId)),
        ])
      ).map((projectId) => new mongoose.Types.ObjectId(projectId));
      normalizedUpdates.projectIds = mergedProjectIds;
      normalizedUpdates.associatedProjects = mergedProjectIds;
    }
    if (normalizedUpdates.attachedFiles !== undefined) {
      normalizedUpdates.attachedFiles = normalizeRecurringAttachedFiles(normalizedUpdates.attachedFiles);
    }

    recurringInvoice.set(normalizedUpdates);

    const scheduleChanged =
      updateData.frequency !== undefined ||
      updateData.startDate !== undefined ||
      updateData.nextInvoiceDate !== undefined;

    if (scheduleChanged) {
      const hasGenerated = Boolean(recurringInvoice.lastInvoiceDate) || (recurringInvoice.invoicesGenerated || 0) > 0;
      if (!hasGenerated && recurringInvoice.startDate) {
        // Ensure base date is the start date for profiles with no generated invoices yet.
        recurringInvoice.nextInvoiceDate = recurringInvoice.startDate;
      }
      recurringInvoice.nextInvoiceDate = recurringInvoice.calculateNextInvoiceDate();
    }

    await recurringInvoice.save();

    const updatedRecurringInvoice = await RecurringInvoice.findById(id)
      .populate('customer', 'displayName name companyName email')
      .populate('salespersonId', 'name email')
      .populate('items.item', 'name sku')
      .populate('projectIds', 'name projectNumber status customer')
      .populate('associatedProjects', 'name projectNumber status customer');

    res.json({
      success: true,
      message: 'Recurring invoice updated successfully',
      data: updatedRecurringInvoice
    });
  } catch (error: any) {
    console.error('[RECURRING INVOICES] Error updating recurring invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating recurring invoice',
      error: error.message
    });
  }
};

// Delete recurring invoice
export const deleteRecurringInvoice = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
      return;
    }

    const { id } = req.params;

    const recurringInvoice = await RecurringInvoice.findById(id);
    if (!recurringInvoice) {
      res.status(404).json({
        success: false,
        message: 'Recurring invoice not found'
      });
      return;
    }

    // Check organization access
    if (recurringInvoice.organization?.toString() !== req.user.organizationId.toString()) {
      res.status(403).json({
        success: false,
        message: 'Access denied'
      });
      return;
    }

    await RecurringInvoice.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Recurring invoice deleted successfully'
    });
  } catch (error: any) {
    console.error('[RECURRING INVOICES] Error deleting recurring invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting recurring invoice',
      error: error.message
    });
  }
};

// ============================================================================
// RETAINER INVOICES CRUD OPERATIONS
// ============================================================================

// Get all retainer invoices
export const getAllRetainerInvoices = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
      return;
    }

    const retainerInvoices = await RetainerInvoice.find({
      organization: req.user.organizationId
    })
      .populate('customer', 'displayName name companyName email')
      .populate('items.item', 'name sku')
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: retainerInvoices
    });
  } catch (error: any) {
    console.error('[RETAINER INVOICES] Error fetching retainer invoices:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching retainer invoices',
      error: error.message
    });
  }
};

// Get single retainer invoice by ID
export const getRetainerInvoiceById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const retainerInvoice = await RetainerInvoice.findById(id)
      .populate('customer', 'displayName name companyName email')
      .populate('items.item', 'name sku');

    if (!retainerInvoice) {
      res.status(404).json({
        success: false,
        message: 'Retainer invoice not found'
      });
      return;
    }

    // Check organization access
    if (req.user?.organizationId &&
      retainerInvoice.organization?.toString() !== req.user.organizationId.toString()) {
      res.status(403).json({
        success: false,
        message: 'Access denied'
      });
      return;
    }

    res.json({
      success: true,
      data: retainerInvoice
    });
  } catch (error: any) {
    console.error('[RETAINER INVOICES] Error fetching retainer invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching retainer invoice',
      error: error.message
    });
  }
};

// Create new retainer invoice
export const createRetainerInvoice = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
      return;
    }

    const {
      retainerInvoiceNumber,
      customer,
      customerName = '',
      date,
      invoiceDate,
      reference = '',
      orderNumber = '',
      location = '',
      projectId,
      projectName = '',
      locationName = '',
      selectedLocation = '',
      retainerType = 'advance',
      validUntil,
      items = [],
      subtotal = 0,
      tax = 0,
      discount = 0,
      total = 0,
      currency = 'USD',
      notes = '',
      terms = '',
      reportingTags = [],
      status = 'draft'
    } = req.body;

    let normalizedRetainerInvoiceNumber = String(retainerInvoiceNumber || "").trim();
    const organizationId = req.user.organizationId;

    if (!normalizedRetainerInvoiceNumber) {
      normalizedRetainerInvoiceNumber = await buildNextRetainerInvoiceNumber(organizationId);
    } else {
      const existingRetainer = await RetainerInvoice.findOne({
        organization: organizationId,
        retainerInvoiceNumber: normalizedRetainerInvoiceNumber,
      }).select("_id retainerInvoiceNumber");
      if (existingRetainer) {
        normalizedRetainerInvoiceNumber = await buildNextRetainerInvoiceNumber(
          organizationId,
          normalizedRetainerInvoiceNumber
        );
      }
    }

    // Validate required fields
    if (!normalizedRetainerInvoiceNumber || !customer) {
      res.status(400).json({
        success: false,
        message: 'Missing required fields: retainerInvoiceNumber, customer'
      });
      return;
    }

    const retainerInvoice = new RetainerInvoice({
      organization: organizationId,
      retainerInvoiceNumber: normalizedRetainerInvoiceNumber,
      customer,
      customerName,
      reference,
      orderNumber,
      location,
      projectId: projectId ? new mongoose.Types.ObjectId(String(projectId)) : undefined,
      projectName,
      locationName,
      selectedLocation,
      date: date ? new Date(date) : new Date(),
      invoiceDate: invoiceDate ? new Date(invoiceDate) : (date ? new Date(date) : new Date()),
      retainerType,
      validUntil: validUntil ? new Date(validUntil) : undefined,
      items,
      subtotal,
      tax,
      discount,
      total,
      currency: currency.toUpperCase(),
      status,
      amountUsed: 0,
      amountRemaining: total,
      amountPaid: 0,
      paidAmount: 0,
      balance: total,
      balanceDue: total,
      paymentsReceived: [],
      notes,
      terms,
      reportingTags
    });

    await retainerInvoice.save();

    const populatedRetainerInvoice = await RetainerInvoice.findById(retainerInvoice._id)
      .populate('customer', 'displayName name companyName email')
      .populate('projectId', 'name projectName')
      .populate('items.item', 'name sku');

    res.status(201).json({
      success: true,
      message: 'Retainer invoice created successfully',
      data: populatedRetainerInvoice
    });
  } catch (error: any) {
    console.error('[RETAINER INVOICES] Error creating retainer invoice:', error);

    if (error?.code === 11000 || error?.code === 11001) {
      try {
        const fallbackInvoiceNumber = await buildNextRetainerInvoiceNumber(
          req.user!.organizationId,
          String(req.body?.retainerInvoiceNumber || "")
        );
        const retryInvoice = new RetainerInvoice({
          organization: req.user!.organizationId,
          retainerInvoiceNumber: fallbackInvoiceNumber,
          customer: req.body?.customer,
          customerName: String(req.body?.customerName || ""),
          reference: String(req.body?.reference || ""),
          orderNumber: String(req.body?.orderNumber || ""),
          location: String(req.body?.location || ""),
          projectId: req.body?.projectId ? new mongoose.Types.ObjectId(String(req.body.projectId)) : undefined,
          projectName: String(req.body?.projectName || ""),
          locationName: String(req.body?.locationName || ""),
          selectedLocation: String(req.body?.selectedLocation || ""),
          date: req.body?.date ? new Date(req.body.date) : new Date(),
          invoiceDate: req.body?.invoiceDate ? new Date(req.body.invoiceDate) : (req.body?.date ? new Date(req.body.date) : new Date()),
          retainerType: req.body?.retainerType || 'advance',
          validUntil: req.body?.validUntil ? new Date(req.body.validUntil) : undefined,
          items: Array.isArray(req.body?.items) ? req.body.items : [],
          subtotal: Number(req.body?.subtotal || 0),
          tax: Number(req.body?.tax || 0),
          discount: Number(req.body?.discount || 0),
          total: Number(req.body?.total || 0),
          currency: String(req.body?.currency || "USD").toUpperCase(),
          status: req.body?.status || 'draft',
          amountUsed: 0,
          amountRemaining: Number(req.body?.total || 0),
          amountPaid: 0,
          paidAmount: 0,
          balance: Number(req.body?.total || 0),
          balanceDue: Number(req.body?.total || 0),
          paymentsReceived: [],
          notes: String(req.body?.notes || ""),
          terms: String(req.body?.terms || ""),
          reportingTags: Array.isArray(req.body?.reportingTags) ? req.body.reportingTags : [],
        });

        await retryInvoice.save();
        const populatedRetryInvoice = await RetainerInvoice.findById(retryInvoice._id)
          .populate('customer', 'displayName name companyName email')
          .populate('projectId', 'name projectName')
          .populate('items.item', 'name sku');

        res.status(201).json({
          success: true,
          message: 'Retainer invoice created successfully',
          data: populatedRetryInvoice
        });
        return;
      } catch (retryError: any) {
        console.error('[RETAINER INVOICES] Retainer retry failed:', retryError);
      }
    }

    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors || {}).map((err: any) => ({
        field: err.path,
        message: err.message
      }));
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Error creating retainer invoice',
      error: error.message
    });
  }
};

// Update retainer invoice
export const updateRetainerInvoice = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
      return;
    }

    const { id } = req.params;
    const updateData = req.body;

    if (updateData.projectId) {
      updateData.projectId = new mongoose.Types.ObjectId(String(updateData.projectId));
    }

    const retainerInvoice = await RetainerInvoice.findById(id);
    if (!retainerInvoice) {
      res.status(404).json({
        success: false,
        message: 'Retainer invoice not found'
      });
      return;
    }

    // Check organization access
    if (retainerInvoice.organization?.toString() !== req.user.organizationId.toString()) {
      res.status(403).json({
        success: false,
        message: 'Access denied'
      });
      return;
    }

    const updatedRetainerInvoice = await RetainerInvoice.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .populate('customer', 'displayName name companyName email')
      .populate('items.item', 'name sku');

    res.json({
      success: true,
      message: 'Retainer invoice updated successfully',
      data: updatedRetainerInvoice
    });
  } catch (error: any) {
    console.error('[RETAINER INVOICES] Error updating retainer invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating retainer invoice',
      error: error.message
    });
  }
};

// Delete retainer invoice
export const deleteRetainerInvoice = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
      return;
    }

    const { id } = req.params;

    const retainerInvoice = await RetainerInvoice.findById(id);
    if (!retainerInvoice) {
      res.status(404).json({
        success: false,
        message: 'Retainer invoice not found'
      });
      return;
    }

    // Check organization access
    if (retainerInvoice.organization?.toString() !== req.user.organizationId.toString()) {
      res.status(403).json({
        success: false,
        message: 'Access denied'
      });
      return;
    }

    await RetainerInvoice.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Retainer invoice deleted successfully'
    });
  } catch (error: any) {
    console.error('[RETAINER INVOICES] Error deleting retainer invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting retainer invoice',
      error: error.message
    });
  }
};

// ============================================================================
// DEBIT NOTES CRUD OPERATIONS
// ============================================================================

// Get all debit notes
export const getAllDebitNotes = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
      return;
    }

    const debitNotes = await DebitNote.find({
      organization: req.user.organizationId
    })
      .populate('customer', 'displayName name companyName email')
      .populate('invoice', 'invoiceNumber total')
      .populate('items.item', 'name sku')
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: debitNotes
    });
  } catch (error: any) {
    console.error('[DEBIT NOTES] Error fetching debit notes:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching debit notes',
      error: error.message
    });
  }
};

// Get single debit note by ID
export const getDebitNoteById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const debitNote = await DebitNote.findById(id)
      .populate('customer', 'displayName name companyName email')
      .populate('invoice', 'invoiceNumber total')
      .populate('items.item', 'name sku');

    if (!debitNote) {
      res.status(404).json({
        success: false,
        message: 'Debit note not found'
      });
      return;
    }

    // Check organization access
    if (req.user?.organizationId &&
      debitNote.organization?.toString() !== req.user.organizationId.toString()) {
      res.status(403).json({
        success: false,
        message: 'Access denied'
      });
      return;
    }

    res.json({
      success: true,
      data: debitNote
    });
  } catch (error: any) {
    console.error('[DEBIT NOTES] Error fetching debit note:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching debit note',
      error: error.message
    });
  }
};

// Create new debit note
export const createDebitNote = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
      return;
    }

    const {
      debitNoteNumber,
      customer,
      invoice,
      date,
      reason = '',
      items = [],
      subtotal = 0,
      tax = 0,
      discount = 0,
      total = 0,
      currency = 'USD',
      notes = '',
      terms = '',
      status = 'draft'
    } = req.body;

    // Validate required fields
    if (!debitNoteNumber || !customer) {
      res.status(400).json({
        success: false,
        message: 'Missing required fields: debitNoteNumber, customer'
      });
      return;
    }

    const debitNote = new DebitNote({
      organization: req.user.organizationId,
      debitNoteNumber,
      customer,
      invoice,
      date: date ? new Date(date) : new Date(),
      reason,
      items,
      subtotal,
      tax,
      discount,
      total,
      currency: currency.toUpperCase(),
      status,
      notes,
      terms
    });

    await debitNote.save();

    const populatedDebitNote = await DebitNote.findById(debitNote._id)
      .populate('customer', 'displayName name companyName email')
      .populate('invoice', 'invoiceNumber total')
      .populate('items.item', 'name sku');

    res.status(201).json({
      success: true,
      message: 'Debit note created successfully',
      data: populatedDebitNote
    });
  } catch (error: any) {
    console.error('[DEBIT NOTES] Error creating debit note:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating debit note',
      error: error.message
    });
  }
};

// Update debit note
export const updateDebitNote = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
      return;
    }

    const { id } = req.params;
    const updateData = req.body;

    const debitNote = await DebitNote.findById(id);
    if (!debitNote) {
      res.status(404).json({
        success: false,
        message: 'Debit note not found'
      });
      return;
    }

    // Check organization access
    if (debitNote.organization?.toString() !== req.user.organizationId.toString()) {
      res.status(403).json({
        success: false,
        message: 'Access denied'
      });
      return;
    }

    const updatedDebitNote = await DebitNote.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .populate('customer', 'displayName name companyName email')
      .populate('invoice', 'invoiceNumber total')
      .populate('items.item', 'name sku');

    res.json({
      success: true,
      message: 'Debit note updated successfully',
      data: updatedDebitNote
    });
  } catch (error: any) {
    console.error('[DEBIT NOTES] Error updating debit note:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating debit note',
      error: error.message
    });
  }
};

// Delete debit note
export const deleteDebitNote = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
      return;
    }

    const { id } = req.params;

    const debitNote = await DebitNote.findById(id);
    if (!debitNote) {
      res.status(404).json({
        success: false,
        message: 'Debit note not found'
      });
      return;
    }

    // Check organization access
    if (debitNote.organization?.toString() !== req.user.organizationId.toString()) {
      res.status(403).json({
        success: false,
        message: 'Access denied'
      });
      return;
    }

    await DebitNote.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Debit note deleted successfully'
    });
  } catch (error: any) {
    console.error('[DEBIT NOTES] Error deleting debit note:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting debit note',
      error: error.message
    });
  }
};

// ============================================================================
// CREDIT NOTES CRUD OPERATIONS
// ============================================================================

// Get all credit notes
export const getAllCreditNotes = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
      return;
    }

    const { invoiceId } = req.query as { invoiceId?: string };
    const query: any = { organization: req.user.organizationId };

    if (invoiceId) {
      query.invoice = invoiceId;
    }

    const creditNotes = await CreditNote.find(query)
      .populate('customer', 'displayName name companyName email')
      .populate('invoice', 'invoiceNumber')
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: creditNotes
    });
  } catch (error: any) {
    console.error('[CREDIT NOTES] Error fetching credit notes:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching credit notes',
      error: error.message
    });
  }
};

// Get single credit note by ID
export const getCreditNoteById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const creditNote = await CreditNote.findById(id)
      .populate('customer', 'displayName name companyName email phone mobile website currency address')
      .populate('invoice', 'invoiceNumber total date dueDate status')
      .populate('items.item', 'name sku description rate unit');

    if (!creditNote) {
      res.status(404).json({
        success: false,
        message: 'Credit note not found'
      });
      return;
    }

    if (req.user?.organizationId &&
      creditNote.organization?.toString() !== req.user.organizationId.toString()) {
      res.status(403).json({
        success: false,
        message: 'Access denied'
      });
      return;
    }

    // Also fetch associated journal entry (if any) so frontend can render accounting lines
    try {
      const journalEntry = await JournalEntry.findOne({ sourceId: creditNote._id, sourceType: 'credit_note' }).lean();
      const creditNoteObj: any = creditNote.toObject ? creditNote.toObject() : creditNote;
      if (journalEntry) creditNoteObj.journalEntry = journalEntry;

      res.json({
        success: true,
        data: creditNoteObj
      });
    } catch (jeErr) {
      console.error('[CREDIT NOTES] Error fetching journal entry:', jeErr);
      res.json({
        success: true,
        data: creditNote
      });
    }
  } catch (error: any) {
    console.error('[CREDIT NOTES] Error fetching credit note:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching credit note',
      error: error.message
    });
  }
};

const generateNextCreditNoteNumber = async (
  organizationId: mongoose.Types.ObjectId | string
): Promise<{ creditNoteNumber: string; nextNumber?: number; prefix?: string; seriesId?: any }> => {
  // 1) Prefer configured transaction number series
  const series = await TransactionNumberSeries.findOne({
    organization: organizationId,
    module: 'Credit Note',
    isDefault: true,
    isActive: true
  });

  if (series) {
    const prefix = series.prefix || 'CN-';
    const padLength = Math.max((series.startingNumber || '').length, 6);
    let numberPart = (series.currentNumber || 0) + 1;

    for (let i = 0; i < 1000; i += 1) {
      const candidate = `${prefix}${String(numberPart).padStart(padLength, '0')}`;
      const exists = await CreditNote.exists({ creditNoteNumber: candidate });
      if (!exists) {
        return {
          creditNoteNumber: candidate,
          nextNumber: numberPart,
          prefix,
          seriesId: series._id
        };
      }
      numberPart += 1;
    }
  }

  // 2) Fallback based on latest credit note in this organization
  const lastCreditNote = await CreditNote.findOne({ organization: organizationId })
    .sort({ createdAt: -1 })
    .select('creditNoteNumber');

  let prefix = 'CN-';
  let nextNumberPart = 1;
  let padLength = 6;

  if (lastCreditNote?.creditNoteNumber) {
    const match = String(lastCreditNote.creditNoteNumber).match(/^([^\d]*)(\d+)$/);
    if (match) {
      prefix = match[1] || 'CN-';
      nextNumberPart = parseInt(match[2], 10) + 1;
      padLength = Math.max(match[2].length, 6);
    }
  }

  for (let i = 0; i < 10000; i += 1) {
    const numberPart = nextNumberPart + i;
    const candidate = `${prefix}${String(numberPart).padStart(padLength, '0')}`;
    const exists = await CreditNote.exists({ creditNoteNumber: candidate });
    if (!exists) {
      return {
        creditNoteNumber: candidate,
        nextNumber: numberPart,
        prefix
      };
    }
  }

  // Last-resort safety fallback
  return {
    creditNoteNumber: `CN-${Date.now()}`,
    prefix: 'CN-'
  };
};

const updateCreditNoteSeriesCurrentNumber = async (
  organizationId: mongoose.Types.ObjectId | string,
  creditNoteNumber: string
) => {
  const series = await TransactionNumberSeries.findOne({
    organization: organizationId,
    module: 'Credit Note',
    isDefault: true,
    isActive: true
  });

  if (!series) return;

  const prefix = series.prefix || 'CN-';
  if (!creditNoteNumber.startsWith(prefix)) return;

  const numberPartString = creditNoteNumber.slice(prefix.length);
  if (!/^\d+$/.test(numberPartString)) return;

  const numericPart = parseInt(numberPartString, 10);
  if (numericPart > (series.currentNumber || 0)) {
    series.currentNumber = numericPart;
    await series.save();
  }
};

const isCreditNotePostingStatus = (status?: string): boolean => {
  const normalizedStatus = String(status || "").toLowerCase().trim();
  return normalizedStatus !== "draft" && normalizedStatus !== "void" && normalizedStatus !== "cancelled";
};

const collectCreditNoteItemQuantities = (items: any[] = []): Map<string, number> => {
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

const buildCreditNoteStockDelta = (
  previousItems: any[] = [],
  previousStatus?: string,
  nextItems: any[] = [],
  nextStatus?: string
): Map<string, number> => {
  const previousAffectsStock = isCreditNotePostingStatus(previousStatus);
  const nextAffectsStock = isCreditNotePostingStatus(nextStatus);

  if (!previousAffectsStock && !nextAffectsStock) {
    return new Map<string, number>();
  }

  const previousQuantities = previousAffectsStock ? collectCreditNoteItemQuantities(previousItems) : new Map<string, number>();
  const nextQuantities = nextAffectsStock ? collectCreditNoteItemQuantities(nextItems) : new Map<string, number>();

  const itemIds = new Set<string>([
    ...Array.from(previousQuantities.keys()),
    ...Array.from(nextQuantities.keys()),
  ]);

  const stockDelta = new Map<string, number>();
  for (const itemId of itemIds) {
    // Credit note represents sales returns, so active note increases stock.
    // Delta = nextEffect - previousEffect = nextQty - previousQty.
    const previousQty = previousQuantities.get(itemId) || 0;
    const nextQty = nextQuantities.get(itemId) || 0;
    const delta = nextQty - previousQty;
    if (delta !== 0) stockDelta.set(itemId, delta);
  }

  return stockDelta;
};

const applyCreditNoteStockDelta = async (
  organizationId: string,
  stockDelta: Map<string, number>,
  session?: mongoose.ClientSession
): Promise<void> => {
  if (!stockDelta.size) return;

  const { getItemsSettings } = await import('../utils/itemsSettings.js');
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

const isMongoDuplicateKeyError = (error: any): boolean => {
  if (!error) return false;
  if (Number(error?.code) === 11000) return true;
  if (Array.isArray(error?.writeErrors)) {
    return error.writeErrors.some((entry: any) => Number(entry?.code) === 11000);
  }
  return typeof error?.message === "string" && error.message.includes("E11000");
};

const normalizeCreditNoteAttachedFiles = (attachedFiles: any): any[] => {
  if (!Array.isArray(attachedFiles)) return [];
  return attachedFiles
    .filter((file: any) => file && file.name)
    .slice(0, 5)
    .map((file: any) => ({
      id: String(file.id || `att_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`),
      name: String(file.name || "Attachment"),
      size: Number(file.size || 0),
      type: String(file.type || ""),
      mimeType: String(file.mimeType || file.type || ""),
      preview: typeof file.preview === "string" ? file.preview : "",
      url: String(file.url || ""),
      documentId: String(file.documentId || ""),
      uploadedAt: file.uploadedAt ? new Date(file.uploadedAt) : new Date(),
      uploadedBy: String(file.uploadedBy || "")
    }));
};

const normalizeCreditNoteComments = (comments: any): any[] => {
  if (!Array.isArray(comments)) return [];
  return comments
    .filter((comment: any) => comment && typeof comment.text === "string" && comment.text.trim() !== "")
    .slice(-200)
    .map((comment: any) => ({
      id: String(comment.id || `com_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`),
      text: String(comment.text || "").trim(),
      author: String(comment.author || "User"),
      timestamp: comment.timestamp ? new Date(comment.timestamp) : new Date(),
      bold: Boolean(comment.bold),
      italic: Boolean(comment.italic),
      underline: Boolean(comment.underline)
    }));
};

// Create new credit note
export const createCreditNote = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
      return;
    }

    const {
      creditNoteNumber: requestedCreditNoteNumber,
      customer,
      invoice,
      date,
      referenceNumber,
      reason,
      items,
      subtotal,
      tax,
      total,
      currency,
      status,
      notes,
      terms,
      templateId,
      gstTreatment,
      taxTreatment,
      isReverseChargeApplied,
      gstNo,
      cfdiUsage,
      cfdiReferenceType,
      placeOfSupply,
      isInclusiveTax,
      attachedFiles = [],
      comments = []
    } = req.body;

    if (!customer || !items || items.length === 0) {
      res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
      return;
    }

    let creditNoteNumber = String(requestedCreditNoteNumber || '').trim();
    const isPlaceholderCreditNoteNumber = /^CN-0*1$/i.test(creditNoteNumber);
    if (!creditNoteNumber || isPlaceholderCreditNoteNumber) {
      const generated = await generateNextCreditNoteNumber(req.user.organizationId);
      creditNoteNumber = generated.creditNoteNumber;
    } else {
      const duplicateInOrganization = await CreditNote.findOne({
        organization: req.user.organizationId,
        creditNoteNumber
      }).select('_id');

      if (duplicateInOrganization) {
        res.status(400).json({
          success: false,
          message: `Credit note number "${creditNoteNumber}" already exists. Please use a different number.`
        });
        return;
      }
    }

    const creditNote = new CreditNote({
      organization: req.user.organizationId,
      creditNoteNumber,
      customer,
      invoice,
      date,
      referenceNumber,
      reason,
      items,
      subtotal,
      tax,
      total,
      currency,
      status: status || 'open',
      notes,
      terms,
      templateId,
      gstTreatment,
      taxTreatment,
      isReverseChargeApplied,
      gstNo,
      cfdiUsage,
      cfdiReferenceType,
      placeOfSupply,
      isInclusiveTax,
      balance: total, // Initialize balance with total
      attachedFiles: normalizeCreditNoteAttachedFiles(attachedFiles),
      comments: normalizeCreditNoteComments(comments)
    });

    let saved = false;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        await creditNote.save();
        saved = true;
        break;
      } catch (saveError: any) {
        if (!isMongoDuplicateKeyError(saveError)) {
          throw saveError;
        }

        // Number collision (race condition or old global unique index): regenerate and retry.
        const generated = await generateNextCreditNoteNumber(req.user.organizationId);
        creditNote.creditNoteNumber = generated.creditNoteNumber;
      }
    }

    if (!saved) {
      throw new Error('Unable to generate a unique credit note number. Please try again.');
    }

    const postingStatus = isCreditNotePostingStatus(creditNote.status);

    // Returned goods should increase inventory only when credit note is active.
    if (postingStatus) {
      const stockDelta = buildCreditNoteStockDelta([], 'draft', items, creditNote.status);
      await applyCreditNoteStockDelta(req.user.organizationId.toString(), stockDelta);
    }

    // Active credit note should impact accounting and customer balances.
    if (postingStatus) {
      const journalId = await createCreditNoteJournalEntry(
        creditNote,
        req.user.organizationId,
        req.user.userId
      );

      if (journalId) {
        creditNote.journalEntryId = journalId;
        await creditNote.save();
      }

      try {
        await Customer.findByIdAndUpdate(customer, {
          $inc: {
            receivables: -parseFloat(total),
            unusedCredits: parseFloat(total)
          }
        });
        console.log(`[CREDIT NOTES] Updated balances for customer ${customer}: receivables -${total}, unusedCredits +${total}`);
      } catch (custError: any) {
        console.error('[CREDIT NOTES] Failed to update customer balances:', custError.message);
      }
    }

    // If linked to an invoice, apply it automatically
    if (postingStatus && invoice && mongoose.Types.ObjectId.isValid(invoice)) {
      try {
        const invoiceDoc = await Invoice.findById(invoice);
        if (invoiceDoc) {
          const invoiceCurrentBalance = Math.max(
            0,
            Number(invoiceDoc.balance ?? (Number(invoiceDoc.total || 0) - Number(invoiceDoc.paidAmount || 0) - Number((invoiceDoc as any).creditsApplied || 0)))
          );
          const applyAmount = Math.min(invoiceCurrentBalance, total);
          if (applyAmount > 0) {
            invoiceDoc.creditsApplied = (invoiceDoc.creditsApplied || 0) + applyAmount;
            invoiceDoc.balance = Math.max(
              0,
              Number(invoiceDoc.total || 0) - Number(invoiceDoc.paidAmount || 0) - Number(invoiceDoc.creditsApplied || 0)
            );
            if (invoiceDoc.balance <= 0) {
              invoiceDoc.status = 'paid';
            } else {
              invoiceDoc.status = 'partially paid';
            }
            await invoiceDoc.save();

            // Reduce credit note balance and customer unused credits
            creditNote.balance = (creditNote.balance || 0) - applyAmount;

            // Add allocation record
            if (!creditNote.allocations) creditNote.allocations = [];
            creditNote.allocations.push({
              invoice: invoiceDoc._id,
              amount: applyAmount,
              date: new Date()
            });

            if (creditNote.balance <= 0) {
              creditNote.status = 'closed';
            }
            await creditNote.save();

            await Customer.findByIdAndUpdate(customer, {
              $inc: { unusedCredits: -applyAmount }
            });
            console.log(`[CREDIT NOTES] Automatically applied ${applyAmount} to invoice ${invoiceDoc.invoiceNumber}`);
          }
        }
      } catch (applyError: any) {
        console.error('[CREDIT NOTES] Failed to auto-apply to invoice:', applyError.message);
      }
    }

    // Increment TransactionNumberSeries if applicable
    try {
      await updateCreditNoteSeriesCurrentNumber(req.user.organizationId, creditNote.creditNoteNumber);
    } catch (seriesError) {
      console.error('[CREDIT NOTES] Error incrementing series:', seriesError);
    }

    const populatedCreditNote = await CreditNote.findById(creditNote._id)
      .populate('customer', 'displayName name companyName email')
      .populate('invoice', 'invoiceNumber');

    res.status(201).json({
      success: true,
      message: 'Credit note created successfully',
      data: populatedCreditNote
    });
  } catch (error: any) {
    console.error('[CREDIT NOTES] Error creating credit note:', error);
    if (isMongoDuplicateKeyError(error)) {
      res.status(400).json({
        success: false,
        message: 'Credit note number already exists. Please retry and use the generated next number.',
        error: error.message
      });
      return;
    }
    res.status(500).json({
      success: false,
      message: 'Error creating credit note',
      error: error.message
    });
  }
};

// Update credit note
export const updateCreditNote = async (req: AuthRequest, res: Response): Promise<void> => {
  const session = await mongoose.startSession();
  let updatedCreditNoteId: string | null = null;
  let shouldReverseJournal = false;
  let shouldCreateJournal = false;
  try {
    session.startTransaction();

    if (!req.user?.organizationId) {
      await session.abortTransaction();
      res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
      return;
    }

    const { id } = req.params;
    const updateData = { ...(req.body || {}) };

    const creditNote = await CreditNote.findById(id).session(session);
    if (!creditNote) {
      await session.abortTransaction();
      res.status(404).json({
        success: false,
        message: 'Credit note not found'
      });
      return;
    }

    if (creditNote.organization.toString() !== req.user.organizationId.toString()) {
      await session.abortTransaction();
      res.status(403).json({
        success: false,
        message: 'Access denied'
      });
      return;
    }

    if (updateData.attachedFiles !== undefined) {
      updateData.attachedFiles = normalizeCreditNoteAttachedFiles(updateData.attachedFiles);
    }
    if (updateData.comments !== undefined) {
      updateData.comments = normalizeCreditNoteComments(updateData.comments);
    }

    const metadataOnlyFields = new Set(["attachedFiles", "comments"]);
    const incomingKeys = Object.keys(updateData).filter((key) => updateData[key] !== undefined);
    const isMetadataOnlyUpdate =
      incomingKeys.length > 0 &&
      incomingKeys.every((key) => metadataOnlyFields.has(key));

    if (isMetadataOnlyUpdate) {
      Object.assign(creditNote, updateData);
      await creditNote.save({ session });
      await session.commitTransaction();

      const updatedCreditNote = await CreditNote.findById(id)
        .populate('customer', 'displayName name companyName email')
        .populate('invoice', 'invoiceNumber');

      res.json({
        success: true,
        message: 'Credit note updated successfully',
        data: updatedCreditNote
      });
      return;
    }

    const previousStatus = String((creditNote as any).status || "");
    const previousItems = Array.isArray((creditNote as any).items) ? [...(creditNote as any).items] : [];
    const previousPosting = isCreditNotePostingStatus(previousStatus);
    const previousTotal = Number((creditNote as any).total || 0);
    const previousBalance = Number((creditNote as any).balance ?? previousTotal);
    const previousCustomerId = (creditNote.customer as any)?.toString?.() || String(creditNote.customer);

    const requestedStatus = updateData.status !== undefined ? String(updateData.status) : previousStatus;
    const nextStatus = requestedStatus || previousStatus;
    const nextPosting = isCreditNotePostingStatus(nextStatus);
    const utilizedCredits = Math.max(0, previousTotal - previousBalance);

    if (previousPosting && !nextPosting && utilizedCredits > 0.000001) {
      await session.abortTransaction();
      res.status(400).json({
        success: false,
        message: "Cannot convert this credit note to draft/void because credits were already applied or refunded."
      });
      return;
    }

    const requestedCustomer = updateData.customer ?? previousCustomerId;
    const nextCustomerId = requestedCustomer?.toString?.() || String(requestedCustomer);
    if (nextCustomerId !== previousCustomerId && utilizedCredits > 0.000001) {
      await session.abortTransaction();
      res.status(400).json({
        success: false,
        message: "Cannot change customer after credits are applied or refunded."
      });
      return;
    }

    const requestedTotal =
      updateData.total !== undefined ? Number(updateData.total) : previousTotal;
    const nextTotal = Number.isFinite(requestedTotal) ? requestedTotal : previousTotal;

    let nextBalance: number;
    if (updateData.balance !== undefined && updateData.balance !== null) {
      const parsedBalance = Number(updateData.balance);
      nextBalance = Number.isFinite(parsedBalance) ? parsedBalance : previousBalance;
    } else if (updateData.total !== undefined) {
      nextBalance = Math.max(0, nextTotal - utilizedCredits);
      updateData.balance = nextBalance;
    } else {
      nextBalance = previousBalance;
    }

    if (nextPosting) {
      nextBalance = Math.max(0, Math.min(nextTotal, nextBalance));
      updateData.balance = nextBalance;
    }

    Object.assign(creditNote, updateData);
    (creditNote as any).status = nextStatus;
    if (updateData.total !== undefined || updateData.balance !== undefined || previousPosting !== nextPosting) {
      (creditNote as any).balance = nextPosting ? nextBalance : Math.max(0, nextBalance);
    }

    await creditNote.save({ session });

    const nextItems = Array.isArray((creditNote as any).items) ? [...(creditNote as any).items] : [];
    const nextTotalAfterSave = Number((creditNote as any).total || 0);
    const nextBalanceAfterSave = Number((creditNote as any).balance ?? nextTotalAfterSave);
    const nextCustomerIdAfterSave = (creditNote.customer as any)?.toString?.() || String(creditNote.customer);
    const nextStatusAfterSave = String((creditNote as any).status || nextStatus);

    const stockDelta = buildCreditNoteStockDelta(
      previousItems,
      previousStatus,
      nextItems,
      nextStatusAfterSave
    );
    await applyCreditNoteStockDelta(req.user.organizationId.toString(), stockDelta, session);

    if (previousCustomerId === nextCustomerIdAfterSave) {
      const receivablesDelta =
        (isCreditNotePostingStatus(nextStatusAfterSave) ? -nextTotalAfterSave : 0) -
        (previousPosting ? -previousTotal : 0);
      const unusedCreditsDelta =
        (isCreditNotePostingStatus(nextStatusAfterSave) ? Math.max(0, nextBalanceAfterSave) : 0) -
        (previousPosting ? Math.max(0, previousBalance) : 0);

      if (receivablesDelta !== 0 || unusedCreditsDelta !== 0) {
        await Customer.findByIdAndUpdate(previousCustomerId, {
          $inc: {
            receivables: receivablesDelta,
            unusedCredits: unusedCreditsDelta
          }
        }).session(session);
      }
    } else {
      if (previousPosting) {
        await Customer.findByIdAndUpdate(previousCustomerId, {
          $inc: {
            receivables: previousTotal,
            unusedCredits: -Math.max(0, previousBalance)
          }
        }).session(session);
      }

      if (isCreditNotePostingStatus(nextStatusAfterSave)) {
        await Customer.findByIdAndUpdate(nextCustomerIdAfterSave, {
          $inc: {
            receivables: -nextTotalAfterSave,
            unusedCredits: Math.max(0, nextBalanceAfterSave)
          }
        }).session(session);
      }
    }

    shouldReverseJournal = true;
    shouldCreateJournal = isCreditNotePostingStatus(nextStatusAfterSave);
    updatedCreditNoteId = creditNote._id.toString();

    await session.commitTransaction();

    if (updatedCreditNoteId) {
      try {
        if (shouldReverseJournal) {
          await reverseAndDeleteCreditNoteJournals([updatedCreditNoteId], req.user.organizationId.toString());
        }

        if (shouldCreateJournal) {
          const refreshedCreditNote = await CreditNote.findById(updatedCreditNoteId);
          if (refreshedCreditNote) {
            const journalId = await createCreditNoteJournalEntry(
              refreshedCreditNote,
              req.user.organizationId.toString(),
              req.user.userId
            );
            if (journalId) {
              await CreditNote.findByIdAndUpdate(updatedCreditNoteId, { $set: { journalEntryId: journalId } });
            }
          }
        } else {
          await CreditNote.findByIdAndUpdate(updatedCreditNoteId, { $unset: { journalEntryId: 1 } });
        }
      } catch (journalError: any) {
        console.error('[CREDIT NOTES] Failed to sync journal entry on update:', journalError?.message || journalError);
      }
    }

    const updatedCreditNote = await CreditNote.findById(id)
      .populate('customer', 'displayName name companyName email')
      .populate('invoice', 'invoiceNumber');

    res.json({
      success: true,
      message: 'Credit note updated successfully',
      data: updatedCreditNote
    });
  } catch (error: any) {
    if (session.inTransaction()) {
      try {
        await session.abortTransaction();
      } catch (abortError) {
        console.error('[CREDIT NOTES] Failed to abort update transaction:', abortError);
      }
    }
    console.error('[CREDIT NOTES] Error updating credit note:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating credit note',
      error: error.message
    });
  } finally {
    session.endSession();
  }
};

// Apply credit note to invoices
export const applyCreditNoteToInvoices = async (req: AuthRequest, res: Response): Promise<void> => {
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
    const { allocations } = req.body;

    if (!allocations || !Array.isArray(allocations) || allocations.length === 0) {
      await session.abortTransaction();
      session.endSession();
      res.status(400).json({ success: false, message: 'Allocations are required' });
      return;
    }

    const creditNote = await CreditNote.findById(id).session(session);
    if (!creditNote) {
      await session.abortTransaction();
      session.endSession();
      res.status(404).json({ success: false, message: 'Credit note not found' });
      return;
    }

    if (creditNote.organization.toString() !== req.user.organizationId.toString()) {
      await session.abortTransaction();
      session.endSession();
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }

    const creditNoteStatus = String(creditNote.status || '').toLowerCase().trim();
    if (creditNoteStatus === 'closed' || !isCreditNotePostingStatus(creditNoteStatus)) {
      await session.abortTransaction();
      session.endSession();
      res.status(400).json({
        success: false,
        message: `Credit note ${creditNote.creditNoteNumber || id} is ${creditNote.status || 'not eligible'} and cannot be applied.`
      });
      return;
    }

    let totalApplied = 0;

    for (const allocation of allocations) {
      const { invoiceId, amount } = allocation;
      const appliedAmount = parseFloat(amount);

      if (isNaN(appliedAmount) || appliedAmount <= 0) continue;

      const invoice = await Invoice.findById(invoiceId).session(session);
      if (!invoice) continue;

      if (invoice.organization.toString() !== req.user.organizationId.toString()) continue;
      if (invoice.customer.toString() !== creditNote.customer.toString()) continue;

      const invoiceStatus = String(invoice.status || '').toLowerCase().trim();
      if (invoiceStatus === 'void' || invoiceStatus === 'draft' || invoiceStatus === 'paid' || invoiceStatus === 'closed' || invoiceStatus === 'cancelled') {
        await session.abortTransaction();
        session.endSession();
        res.status(400).json({
          success: false,
          message: `Invoice ${invoice.invoiceNumber || invoiceId} is ${invoice.status || 'not eligible'} and cannot be credited.`
        });
        return;
      }

      // Update invoice balance
      const fallbackComputedBalance =
        Number(invoice.total || 0) -
        Number((invoice as any).paidAmount || 0) -
        Number((invoice as any).creditsApplied || 0);
      const currentBalanceRaw =
        (invoice.balance !== undefined && invoice.balance !== null)
          ? invoice.balance
          : fallbackComputedBalance;
      const currentBalance = Math.max(0, Number(currentBalanceRaw || 0));

      if (currentBalance <= 0) {
        await session.abortTransaction();
        session.endSession();
        res.status(400).json({
          success: false,
          message: `Invoice ${invoice.invoiceNumber || invoiceId} has no outstanding balance to credit.`
        });
        return;
      }

      if (appliedAmount > currentBalance) {
        await session.abortTransaction();
        session.endSession();
        res.status(400).json({
          success: false,
          message: `Allocation exceeds invoice balance for invoice ${invoice.invoiceNumber || invoiceId}. Balance: ${currentBalance}, Attempted: ${appliedAmount}`
        });
        return;
      }
      const newBalance = currentBalance - appliedAmount;

      invoice.balance = Math.max(0, newBalance);
      invoice.creditsApplied = (invoice.creditsApplied || 0) + appliedAmount;

      if (invoice.balance <= 0) {
        invoice.status = 'paid';
      } else {
        invoice.status = 'partially paid';
      }

      await invoice.save({ session });

      // Add to credit note allocations
      if (!creditNote.allocations) creditNote.allocations = [];
      creditNote.allocations.push({
        invoice: invoiceId,
        amount: appliedAmount,
        date: new Date()
      });

      totalApplied += appliedAmount;
    }

    // Validate that we have enough balance
    const currentCreditBalance = creditNote.balance || 0;

    if (totalApplied > currentCreditBalance) {
      await session.abortTransaction();
      session.endSession();
      res.status(400).json({
        success: false,
        message: `Insufficient credit balance. Available: ${currentCreditBalance}, Attempted: ${totalApplied}`
      });
      return;
    }

    // Update credit note balance
    creditNote.balance = Math.max(0, currentCreditBalance - totalApplied);

    if (creditNote.balance <= 0) {
      creditNote.status = 'closed';
    } else {
      creditNote.status = 'open';
    }

    await creditNote.save({ session });

    // Update customer unused credits
    await Customer.findByIdAndUpdate(creditNote.customer, {
      $inc: { unusedCredits: -totalApplied }
    }).session(session);

    await session.commitTransaction();
    session.endSession();

    res.json({
      success: true,
      message: `Successfully applied ${totalApplied} from credit note to invoices`,
      data: creditNote
    });
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    console.error('[CREDIT NOTES] Error applying credits:', error);
    res.status(500).json({ success: false, message: 'Error applying credits', error: error.message });
  }
};

// Delete credit note
export const deleteCreditNote = async (req: AuthRequest, res: Response): Promise<void> => {
  const session = await mongoose.startSession();
  let deletedCreditNoteId: string | null = null;
  try {
    session.startTransaction();

    if (!req.user?.organizationId) {
      await session.abortTransaction();
      res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
      return;
    }

    const { id } = req.params;

    const creditNote = await CreditNote.findById(id).session(session);
    if (!creditNote) {
      await session.abortTransaction();
      res.status(404).json({
        success: false,
        message: 'Credit note not found'
      });
      return;
    }

    if (creditNote.organization.toString() !== req.user.organizationId.toString()) {
      await session.abortTransaction();
      res.status(403).json({
        success: false,
        message: 'Access denied'
      });
      return;
    }

    const creditNoteStatus = String((creditNote as any).status || "");
    const postingStatus = isCreditNotePostingStatus(creditNoteStatus);
    const creditNoteTotal = Number((creditNote as any).total || 0);
    const creditNoteBalance = Number((creditNote as any).balance ?? creditNoteTotal);
    const utilizedCredits = Math.max(0, creditNoteTotal - creditNoteBalance);

    if (postingStatus && utilizedCredits > 0.000001) {
      await session.abortTransaction();
      res.status(400).json({
        success: false,
        message: 'Cannot delete this credit note because credits were already applied or refunded.'
      });
      return;
    }

    const stockDelta = buildCreditNoteStockDelta(
      Array.isArray((creditNote as any).items) ? [...(creditNote as any).items] : [],
      creditNoteStatus,
      [],
      'draft'
    );
    await applyCreditNoteStockDelta(req.user.organizationId.toString(), stockDelta, session);

    if (postingStatus) {
      const customerId = (creditNote.customer as any)?.toString?.() || String(creditNote.customer);
      await Customer.findByIdAndUpdate(customerId, {
        $inc: {
          receivables: creditNoteTotal,
          unusedCredits: -Math.max(0, creditNoteBalance)
        }
      }).session(session);
    }

    await CreditNote.deleteOne({
      _id: id,
      organization: req.user.organizationId
    }).session(session);

    deletedCreditNoteId = creditNote._id.toString();

    await session.commitTransaction();

    if (deletedCreditNoteId) {
      try {
        await reverseAndDeleteCreditNoteJournals([deletedCreditNoteId], req.user.organizationId.toString());
      } catch (journalError: any) {
        console.error('[CREDIT NOTES] Failed to reverse journal on delete:', journalError?.message || journalError);
      }
    }

    res.json({
      success: true,
      message: 'Credit note deleted successfully'
    });
  } catch (error: any) {
    if (session.inTransaction()) {
      try {
        await session.abortTransaction();
      } catch (abortError) {
        console.error('[CREDIT NOTES] Failed to abort delete transaction:', abortError);
      }
    }
    console.error('[CREDIT NOTES] Error deleting credit note:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting credit note',
      error: error.message
    });
  } finally {
    session.endSession();
  }
};

// Get next credit note number
export const getNextCreditNoteNumber = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
      return;
    }

    const next = await generateNextCreditNoteNumber(req.user.organizationId);
    const nextNumber = next.creditNoteNumber;

    res.json({
      success: true,
      nextNumber,
      data: {
        creditNoteNumber: nextNumber,
        nextNumber: next.nextNumber,
        prefix: next.prefix,
        seriesId: next.seriesId
      }
    });
  } catch (error: any) {
    console.error('Error generating next credit note number:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating next credit note number'
    });
  }
};

// ============================================================================
// SALES RECEIPTS CRUD OPERATIONS
// ============================================================================


// Get all sales receipts
export const getAllSalesReceipts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const {
      page = '1',
      limit = '50',
      search = '',
      status,
      customerId,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query: any = { organization: req.user.organizationId };

    if (status && status !== 'All') query.status = (status as string).toLowerCase();
    if (customerId) {
      const normalizedCustomerId = String(customerId || "").trim();
      if (normalizedCustomerId && normalizedCustomerId.toLowerCase() !== "all") {
        const customerObjectId = toObjectId(normalizedCustomerId);
        if (customerObjectId) {
          query.customer = customerObjectId;
        }
      }
    }

    if (search) {
      const searchRegex = new RegExp(escapeRegex(String(search)), 'i');
      query.$or = [
        { receiptNumber: searchRegex },
        { paymentReference: searchRegex },
        { notes: searchRegex }
      ];
    }

    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 50;
    const skip = (pageNum - 1) * limitNum;

    const sort: any = {};
    sort[sortBy as string] = sortOrder === 'desc' ? -1 : 1;

    const [receipts, total] = await Promise.all([
      SalesReceipt.find(query)
        .populate('customer', 'displayName name companyName email')
        .populate('createdBy', 'name email firstName lastName')
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      SalesReceipt.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: receipts,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error: any) {
    console.error('[SALES RECEIPTS] Error fetching sales receipts:', error);
    res.status(500).json({ success: false, message: 'Error fetching sales receipts', error: error.message });
  }
};

// Get single sales receipt by ID
export const getSalesReceiptById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    let receipt;

    if (mongoose.Types.ObjectId.isValid(id)) {
      receipt = await SalesReceipt.findById(id)
        .populate('customer', 'displayName name companyName email')
        .populate('createdBy', 'name email firstName lastName');
    }

    if (!receipt) {
      receipt = await SalesReceipt.findOne({
        receiptNumber: id,
        organization: req.user?.organizationId
      })
        .populate('customer', 'displayName name companyName email')
        .populate('createdBy', 'name email firstName lastName');
    }

    if (!receipt) {
      res.status(404).json({ success: false, message: 'Sales receipt not found' });
      return;
    }

    if (req.user?.organizationId && receipt.organization?.toString() !== req.user.organizationId.toString()) {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }

    // Fetch organization and profile data
    const organization = await Organization.findById(receipt.organization).lean();
    const profile = await Profile.findOne({ organization: receipt.organization }).lean();

    // Combine data: Use Organization.email if available, otherwise fall back to Profile
    const organizationProfile = {
      name: organization?.name || profile?.name || '',
      email: (organization as any)?.email || profile?.email || '',
      country: profile?.address?.country || '',
      phone: profile?.phone || '',
      address: profile?.address
    };

    res.json({
      success: true,
      data: {
        ...receipt.toObject ? receipt.toObject() : receipt,
        organizationProfile
      }
    });
  } catch (error: any) {
    console.error('[SALES RECEIPTS] Error fetching sales receipt:', error);
    res.status(500).json({ success: false, message: 'Error fetching sales receipt', error: error.message });
  }
};

// Helper to update account balances local to this controller
const updateAccountBalancesLocal = async (lines: any[], _organizationId: string, session: mongoose.ClientSession, reverse: boolean = false) => {
  for (const line of lines) {
    const { account: accountId, debit = 0, credit = 0 } = line;
    if (!accountId) continue;

    const account = await ChartOfAccount.findById(accountId).session(session);
    if (account) {
      const isDebitType = isDebitNormalAccountType(account.accountType);
      let netChange = isDebitType ? (debit - credit) : (credit - debit);
      if (reverse) netChange = -netChange;

      account.balance = (account.balance || 0) + netChange;
      await account.save({ session });
    }
  }
};

const normalizeSalesReceiptAttachments = (attachments: any): any[] => {
  if (!Array.isArray(attachments)) return [];
  return attachments
    .filter((attachment: any) => attachment && attachment.name)
    .slice(0, 5)
    .map((attachment: any) => ({
      id: String(attachment.id || `att_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`),
      name: String(attachment.name || "Attachment"),
      type: String(attachment.type || ""),
      size: Number(attachment.size || 0),
      preview: typeof attachment.preview === "string" ? attachment.preview : "",
      uploadedAt: attachment.uploadedAt ? new Date(attachment.uploadedAt) : new Date(),
      uploadedBy: String(attachment.uploadedBy || "")
    }));
};

const normalizeSalesReceiptComments = (comments: any): any[] => {
  if (!Array.isArray(comments)) return [];
  return comments
    .filter((comment: any) => comment && typeof comment.text === "string" && comment.text.trim() !== "")
    .slice(-200)
    .map((comment: any) => ({
      id: String(comment.id || `com_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`),
      text: String(comment.text || "").trim(),
      bold: Boolean(comment.bold),
      italic: Boolean(comment.italic),
      underline: Boolean(comment.underline),
      author: String(comment.author || "User"),
      timestamp: comment.timestamp ? new Date(comment.timestamp) : new Date()
    }));
};

// Create new sales receipt
export const createSalesReceipt = async (req: AuthRequest, res: Response): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { items, depositToAccount, date, attachments, comments } = req.body;

    // 1. Validate Deposit Account
    if (!depositToAccount) {
      throw new Error("Deposit To Account is required to record the payment.");
    }

    // Comprehensive helper to find accounts by name/ID with type-based fallback
    const resolveAccount = async (nameOrId: string, types: string[]): Promise<string> => {
      if (!nameOrId) return "";
      if (mongoose.Types.ObjectId.isValid(nameOrId)) return nameOrId.toString();

      const sanitized = nameOrId.replace(/^["']|["']$/g, '').trim();
      let acc = await ChartOfAccount.findOne({
        organization: req.user!.organizationId,
        $or: [{ accountName: sanitized }, { name: sanitized }]
      }).session(session);

      if (!acc && types.length > 0) {
        // Broaden search to types if name lookup fails
        acc = await ChartOfAccount.findOne({
          organization: req.user!.organizationId,
          accountType: { $in: types }
        }).sort({ createdAt: 1 }).session(session);
      }

      if (!acc) {
        throw new Error(`Account '${sanitized}' not found. No alternative account of type(s) [${types.join(', ')}] exists for your organization.`);
      }

      return acc._id.toString();
    };

    const parseNumber = (value: any, fallback = 0): number => {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : fallback;
    };

    const parseOptionalNumber = (value: any): number | null => {
      if (value === undefined || value === null || value === "") return null;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    };

    const normalizeDiscountType = (rawType: any): "percent" | "amount" => {
      const value = String(rawType || "").trim().toLowerCase();
      if (!value || value.includes("%") || value.includes("percent")) return "percent";
      if (value.includes("amount") || value.includes("flat") || value.includes("value")) return "amount";
      return "percent";
    };

    // 2. Prepare Calculation Variables
    let itemSubtotal = 0;
    let calculatedItemTax = 0;

    // Grouping for Journal Entries
    const salesCredits: Record<string, number> = {};
    const inventoryCredits: Record<string, number> = {};
    const cogsDebits: Record<string, number> = {};

    const depositAccountId = await resolveAccount(depositToAccount, ['bank', 'cash', 'other_current_asset']);

    // 3. Process Items & Inventory
    const processedItems: any[] = [];
    for (const itemData of items) {
      if (!itemData.item) {
        throw new Error(`Item ID is missing for one of the lines (${itemData.name || 'Unknown Item'}).`);
      }
      const item = await Item.findById(itemData.item).session(session);
      if (!item) {
        throw new Error(`Item not found in database: ${itemData.item} (${itemData.name || 'Unknown'}).`);
      }

      const quantity = parseNumber(itemData.quantity);
      const rate = parseNumber(itemData.unitPrice);
      const taxVal = parseNumber(itemData.taxAmount);
      const discount = parseNumber(itemData.discount);
      const discountType = itemData.discountType || "percent";

      const baseAmount = quantity * rate;
      const discountAmount = discountType === "percent"
        ? (baseAmount * discount / 100)
        : discount;
      const lineSubtotal = Math.max(baseAmount - discountAmount, 0);
      itemSubtotal += lineSubtotal;
      calculatedItemTax += taxVal;

      // Inventory Logic
      if (item.trackInventory) {
        if ((item.stockQuantity || 0) < quantity) {
          throw new Error(`Insufficient stock for item: ${item.name}. Available: ${item.stockQuantity}`);
        }
        item.stockQuantity = (item.stockQuantity || 0) - quantity;
        await item.save({ session });

        // COGS & Inventory Asset Journal Data
        const cost = (item.costPrice || 0) * quantity;

        // Inventory Asset Account (Credit)
        const invAccount = item.inventoryAccount || "Inventory Asset";
        inventoryCredits[invAccount] = (inventoryCredits[invAccount] || 0) + cost;

        // COGS Account (Debit)
        const cogsAccount = item.purchaseAccount || "Cost of Goods Sold";
        cogsDebits[cogsAccount] = (cogsDebits[cogsAccount] || 0) + cost;
      }

      // Sales Income Account (Credit)
      // Sales credit should ideally be the net amount after discount, or gross with a separate debit for Sales Discount.
      // For simplicity/standard practice in small systems, we'll credit the Net Sales (Rate * Qty - Discount).
      const salesAccount = item.salesAccount || "Sales Income";
      salesCredits[salesAccount] = (salesCredits[salesAccount] || 0) + lineSubtotal;

      processedItems.push(itemData);
    }

    const rawDiscount = parseNumber(req.body.discount ?? req.body.discountAmount, 0);
    const discountType = normalizeDiscountType(req.body.discountType);
    const discountAmount = discountType === "percent"
      ? (itemSubtotal * rawDiscount / 100)
      : rawDiscount;
    const providedTax = parseOptionalNumber(req.body.tax ?? req.body.taxAmount);
    const normalizedTax = providedTax ?? calculatedItemTax;
    const normalizedShippingCharges = parseNumber(req.body.shippingCharges ?? req.body.shipping, 0);
    const normalizedAdjustment = parseNumber(req.body.adjustment ?? req.body.adjustments, 0);
    const normalizedShippingChargeTax = String(
      req.body.shippingChargeTax ?? req.body.shippingTax ?? req.body.shippingTaxId ?? ""
    ).trim();
    const totalAmount = Math.max(
      0,
      itemSubtotal + normalizedTax - discountAmount + normalizedShippingCharges + normalizedAdjustment
    );

    // Apply transaction-level adjustments to revenue bucket to keep journal balanced.
    const transactionNetAdjustment = normalizedShippingCharges + normalizedAdjustment - discountAmount;
    if (transactionNetAdjustment !== 0) {
      salesCredits["Sales Income"] = (salesCredits["Sales Income"] || 0) + transactionNetAdjustment;
    }

    // 4. Create Sales Receipt Document
    const receipt = new SalesReceipt({
      ...req.body,
      organization: req.user.organizationId,
      createdBy: req.user.userId,
      items: processedItems,
      depositToAccount: depositAccountId,
      subtotal: itemSubtotal,
      tax: normalizedTax,
      discount: rawDiscount,
      discountType,
      shippingCharges: normalizedShippingCharges,
      shippingChargeTax: normalizedShippingChargeTax,
      adjustment: normalizedAdjustment,
      total: totalAmount,
      attachments: normalizeSalesReceiptAttachments(attachments),
      comments: normalizeSalesReceiptComments(comments)
    });
    await receipt.save({ session });

    // 5. Create Journal Entry
    const journalLines = [];

    // LINE 1: Debit Deposit Account
    journalLines.push({
      account: depositAccountId,
      description: `Sales Receipt #${receipt.receiptNumber}`,
      debit: totalAmount,
      credit: 0
    });

    // LINE 2: Sales Income / Sales Adjustments
    for (const [acc, amount] of Object.entries(salesCredits)) {
      if (!amount) continue;
      const accountId = await resolveAccount(acc, ['income', 'other_income']);
      journalLines.push({
        account: accountId,
        description: `Sales Income - ${receipt.receiptNumber}`,
        debit: amount < 0 ? Math.abs(amount) : 0,
        credit: amount > 0 ? amount : 0
      });
    }

    // LINE 3: Credit Tax Payable
    if (normalizedTax > 0) {
      const taxAccountId = await resolveAccount("Tax Payable", ['tax_payable', 'other_current_liability']);
      journalLines.push({
        account: taxAccountId,
        description: "Tax Payable",
        debit: 0,
        credit: normalizedTax
      });
    }

    // LINE 4 & 5: Inventory Movement (Only if tracked) of COGS
    for (const [acc, amount] of Object.entries(cogsDebits)) {
      if (amount <= 0) continue;
      const accountId = await resolveAccount(acc, ['cost_of_goods_sold', 'expense']);
      journalLines.push({ account: accountId, description: "Cost of Goods Sold", debit: amount, credit: 0 });
    }
    for (const [acc, amount] of Object.entries(inventoryCredits)) {
      if (amount <= 0) continue;
      const accountId = await resolveAccount(acc, ['stock', 'other_current_asset']);
      journalLines.push({ account: accountId, description: "Inventory Asset", debit: 0, credit: amount });
    }

    const journalEntry = new JournalEntry({
      organization: req.user.organizationId,
      entryNumber: `JE-${receipt.receiptNumber}`,
      date: date || new Date(),
      lines: journalLines,
      description: `Journal for Sales Receipt #${receipt.receiptNumber}`,
      status: 'posted',
      sourceId: receipt._id,
      sourceType: 'sales_receipt'
    });
    await journalEntry.save({ session });


    // Increment TransactionNumberSeries if applicable
    try {
      const series = await TransactionNumberSeries.findOne({
        organization: req.user.organizationId,
        module: 'Sales Receipt',
        isDefault: true,
        isActive: true
      }).session(session);

      if (series) {
        const nextNumberPart = (series.currentNumber || 0) + 1;
        const expectedPadded = String(nextNumberPart).padStart(series.startingNumber?.length || 5, '0');
        const expectedNumber = `${series.prefix}${expectedPadded}`;

        // If the user used the auto-generated number, increment it
        if (receipt.receiptNumber === expectedNumber) {
          series.currentNumber = nextNumberPart;
          await series.save({ session });
        }
      }
    } catch (seriesError) {
      console.error('[SALES RECEIPTS] Error incrementing series:', seriesError);
    }

    // Update Chart of Account Balances
    await updateAccountBalancesLocal(journalLines, req.user.organizationId, session);

    await session.commitTransaction();
    res.status(201).json({ success: true, message: 'Sales receipt created successfully', data: receipt });

  } catch (error: any) {
    await session.abortTransaction();

    // Log for server-side debugging
    console.error('[SALES RECEIPTS] Error creating sales receipt:', error);
    if (error.stack) console.error('[SALES RECEIPTS] Stack:', error.stack);
    console.error('[SALES RECEIPTS] Payload:', JSON.stringify(req.body, null, 2));

    // Handle specific error types for better frontend experience
    let statusCode = 500;
    let message = error.message || 'Error creating sales receipt';

    if (error.name === 'ValidationError') {
      statusCode = 400;
      message = Object.values(error.errors || {}).map((e: any) => e.message).join(', ');
    } else if (error.code === 11000) {
      statusCode = 400;
      message = `Sales Receipt number '${req.body.receiptNumber}' already exists. Please use a different number.`;
    } else if (message.includes('not found') || message.includes('required') || message.includes('missing')) {
      statusCode = 400; // Validation/Logic error
    }

    res.status(statusCode).json({
      success: false,
      message: message,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  } finally {
    session.endSession();
  }
};

// Update sales receipt
export const updateSalesReceipt = async (req: AuthRequest, res: Response): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const updateData: any = req.body || {};
    const oldReceipt = await SalesReceipt.findOne({ _id: id, organization: req.user.organizationId }).session(session);

    if (!oldReceipt) {
      await session.abortTransaction();
      res.status(404).json({ success: false, message: 'Sales receipt not found' });
      return;
    }

    if (updateData.attachments !== undefined) {
      updateData.attachments = normalizeSalesReceiptAttachments(updateData.attachments);
      req.body.attachments = updateData.attachments;
    }
    if (updateData.comments !== undefined) {
      updateData.comments = normalizeSalesReceiptComments(updateData.comments);
      req.body.comments = updateData.comments;
    }

    const metadataOnlyFields = new Set(["attachments", "comments"]);
    const incomingKeys = Object.keys(updateData).filter((key) => updateData[key] !== undefined);
    const isMetadataOnlyUpdate =
      incomingKeys.length > 0 &&
      incomingKeys.every((key) => metadataOnlyFields.has(key));

    if (isMetadataOnlyUpdate) {
      oldReceipt.set(updateData);
      await oldReceipt.save({ session });
      await session.commitTransaction();
      res.json({ success: true, message: 'Sales receipt updated successfully', data: oldReceipt });
      return;
    }

    // ==========================================
    // 1. REVERSE OLD EFFECTS
    // ==========================================

    // A. Reverse Inventory
    if (oldReceipt.items && oldReceipt.items.length > 0) {
      for (const line of oldReceipt.items) {
        if (!line.item) continue;
        const item = await Item.findById(line.item).session(session);
        if (item && item.trackInventory) {
          const quantity = Number(line.quantity) || 0;
          item.stockQuantity = (item.stockQuantity || 0) + quantity;
          await item.save({ session });
        }
      }
    }

    // B. Reverse Accounting (Journal)
    const oldJournal = await JournalEntry.findOne({
      organization: req.user.organizationId,
      sourceId: oldReceipt._id,
      sourceType: 'sales_receipt'
    }).session(session);

    if (oldJournal) {
      // Reverse balances
      if (oldJournal.lines) {
        await updateAccountBalancesLocal(oldJournal.lines, req.user.organizationId, session, true);
      }
      // Delete old journal
      await JournalEntry.deleteOne({ _id: oldJournal._id }).session(session);
    }

    // ==========================================
    // 2. PREPARE NEW TRANSACTION
    // ==========================================

    const { date } = req.body;

    const items = Array.isArray(req.body.items)
      ? req.body.items
      : (Array.isArray(oldReceipt.items) ? oldReceipt.items : []);

    if (!Array.isArray(items) || items.length === 0) {
      throw new Error("At least one item is required.");
    }

    const depositToAccount = req.body.depositToAccount
      || req.body.depositTo
      || oldReceipt.depositToAccount?.toString();

    // Validate Deposit Account
    if (!depositToAccount) {
      throw new Error("Deposit To Account is required.");
    }

    // Comprehensive helper to find accounts by name/ID with type-based fallback (Same as in Create)
    const resolveAccount = async (nameOrId: string, types: string[]): Promise<string> => {
      if (!nameOrId) return "";
      if (mongoose.Types.ObjectId.isValid(nameOrId)) return nameOrId.toString();

      const sanitized = nameOrId.replace(/^["']|["']$/g, '').trim();
      let acc = await ChartOfAccount.findOne({
        organization: req.user!.organizationId,
        $or: [{ accountName: sanitized }, { name: sanitized }]
      }).session(session);

      if (!acc && types.length > 0) {
        // Broaden search to types if name lookup fails
        acc = await ChartOfAccount.findOne({
          organization: req.user!.organizationId,
          accountType: { $in: types }
        }).sort({ createdAt: 1 }).session(session);
      }

      if (!acc) {
        throw new Error(`Account '${sanitized}' not found. No alternative account of type(s) [${types.join(', ')}] exists for your organization.`);
      }

      return acc._id.toString();
    };

    const parseNumber = (value: any, fallback = 0): number => {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : fallback;
    };

    const parseOptionalNumber = (value: any): number | null => {
      if (value === undefined || value === null || value === "") return null;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    };

    const normalizeDiscountType = (rawType: any): "percent" | "amount" => {
      const value = String(rawType || "").trim().toLowerCase();
      if (!value || value.includes("%") || value.includes("percent")) return "percent";
      if (value.includes("amount") || value.includes("flat") || value.includes("value")) return "amount";
      return "percent";
    };

    let itemSubtotal = 0;
    let calculatedItemTax = 0;

    const salesCredits: Record<string, number> = {};
    const inventoryCredits: Record<string, number> = {};
    const cogsDebits: Record<string, number> = {};

    const depositAccountId = await resolveAccount(depositToAccount, ['bank', 'cash', 'other_current_asset']);
    const processedItems: any[] = [];

    // ==========================================
    // 3. PROCESS NEW ITEMS (Inventory & Calcs)
    // ==========================================
    for (const itemData of items) {
      if (!itemData.item) {
        throw new Error(`Item ID is missing for one of the lines (${itemData.name || 'Unknown Item'}).`);
      }
      const item = await Item.findById(itemData.item).session(session);
      if (!item) {
        throw new Error(`Item not found: ${itemData.item}`);
      }

      const quantity = parseNumber(itemData.quantity);
      const rate = parseNumber(itemData.unitPrice);
      const taxVal = parseNumber(itemData.taxAmount);
      const discount = parseNumber(itemData.discount);
      const discountType = itemData.discountType || "percent";

      const baseAmount = quantity * rate;
      const discountAmount = discountType === "percent"
        ? (baseAmount * discount / 100)
        : discount;
      const lineSubtotal = Math.max(baseAmount - discountAmount, 0);

      itemSubtotal += lineSubtotal;
      calculatedItemTax += taxVal;

      // Inventory Logic
      if (item.trackInventory) {
        if ((item.stockQuantity || 0) < quantity) {
          throw new Error(`Insufficient stock for item: ${item.name}. Available: ${item.stockQuantity}`);
        }
        item.stockQuantity = (item.stockQuantity || 0) - quantity;
        await item.save({ session });

        // COGS & Inventory Asset Journal Data
        const cost = (item.costPrice || 0) * quantity;

        // Inventory Asset Account (Credit)
        const invAccount = item.inventoryAccount || "Inventory Asset";
        inventoryCredits[invAccount] = (inventoryCredits[invAccount] || 0) + cost;

        // COGS Account (Debit)
        const cogsAccount = item.purchaseAccount || "Cost of Goods Sold";
        cogsDebits[cogsAccount] = (cogsDebits[cogsAccount] || 0) + cost;
      }

      const salesAccount = item.salesAccount || "Sales Income";
      salesCredits[salesAccount] = (salesCredits[salesAccount] || 0) + lineSubtotal;

      processedItems.push(itemData);
    }

    // ==========================================
    // 4. UPDATE SALES RECEIPT DOCUMENT
    // ==========================================

    const rawDiscount = parseNumber(req.body.discount ?? req.body.discountAmount, 0);
    const discountType = normalizeDiscountType(req.body.discountType);
    const discountAmount = discountType === "percent"
      ? (itemSubtotal * rawDiscount / 100)
      : rawDiscount;
    const providedTax = parseOptionalNumber(req.body.tax ?? req.body.taxAmount);
    const normalizedTax = providedTax ?? calculatedItemTax;
    const normalizedShippingCharges = parseNumber(req.body.shippingCharges ?? req.body.shipping, 0);
    const normalizedAdjustment = parseNumber(req.body.adjustment ?? req.body.adjustments, 0);
    const normalizedShippingChargeTax = String(
      req.body.shippingChargeTax ?? req.body.shippingTax ?? req.body.shippingTaxId ?? ""
    ).trim();
    const totalAmount = Math.max(
      0,
      itemSubtotal + normalizedTax - discountAmount + normalizedShippingCharges + normalizedAdjustment
    );

    // Apply transaction-level adjustments to revenue bucket to keep journal balanced.
    const transactionNetAdjustment = normalizedShippingCharges + normalizedAdjustment - discountAmount;
    if (transactionNetAdjustment !== 0) {
      salesCredits["Sales Income"] = (salesCredits["Sales Income"] || 0) + transactionNetAdjustment;
    }

    // Update fields
    oldReceipt.set(req.body);

    // Explicitly set calculated fields to ensure consistency
    oldReceipt.items = processedItems;
    oldReceipt.depositToAccount = new mongoose.Types.ObjectId(depositAccountId);
    oldReceipt.subtotal = itemSubtotal;
    oldReceipt.tax = normalizedTax;
    oldReceipt.discount = rawDiscount;
    oldReceipt.discountType = discountType;
    oldReceipt.shippingCharges = normalizedShippingCharges;
    oldReceipt.shippingChargeTax = normalizedShippingChargeTax;
    oldReceipt.adjustment = normalizedAdjustment;
    oldReceipt.total = totalAmount;

    await oldReceipt.save({ session });

    // ==========================================
    // 5. CREATE NEW JOURNAL ENTRY
    // ==========================================
    const journalLines = [];

    // LINE 1: Debit Deposit Account
    journalLines.push({
      account: depositAccountId,
      description: `Sales Receipt #${oldReceipt.receiptNumber}`,
      debit: totalAmount,
      credit: 0
    });

    // LINE 2: Sales Income / Sales Adjustments
    for (const [acc, amount] of Object.entries(salesCredits)) {
      if (!amount) continue;
      const accountId = await resolveAccount(acc, ['income', 'other_income']);
      journalLines.push({
        account: accountId,
        description: `Sales Income - ${oldReceipt.receiptNumber}`,
        debit: amount < 0 ? Math.abs(amount) : 0,
        credit: amount > 0 ? amount : 0
      });
    }

    // LINE 3: Credit Tax Payable
    if (normalizedTax > 0) {
      const taxAccountId = await resolveAccount("Tax Payable", ['tax_payable', 'other_current_liability']);
      journalLines.push({
        account: taxAccountId,
        description: "Tax Payable",
        debit: 0,
        credit: normalizedTax
      });
    }

    // LINE 4 & 5: Inventory Movement
    for (const [acc, amount] of Object.entries(cogsDebits)) {
      if (amount <= 0) continue;
      const accountId = await resolveAccount(acc, ['cost_of_goods_sold', 'expense']);
      journalLines.push({ account: accountId, description: "Cost of Goods Sold", debit: amount, credit: 0 });
    }
    for (const [acc, amount] of Object.entries(inventoryCredits)) {
      if (amount <= 0) continue;
      const accountId = await resolveAccount(acc, ['stock', 'other_current_asset']);
      journalLines.push({ account: accountId, description: "Inventory Asset", debit: 0, credit: amount });
    }

    const journalEntry = new JournalEntry({
      organization: req.user.organizationId,
      entryNumber: `JE-${oldReceipt.receiptNumber}`, // Reuse the same number pattern
      date: date || new Date(),
      lines: journalLines,
      description: `Journal for Sales Receipt #${oldReceipt.receiptNumber}`,
      status: 'posted',
      sourceId: oldReceipt._id,
      sourceType: 'sales_receipt'
    });
    await journalEntry.save({ session });

    // Update Chart of Account Balances
    await updateAccountBalancesLocal(journalLines, req.user.organizationId, session);

    await session.commitTransaction();
    res.json({ success: true, message: 'Sales receipt updated successfully', data: oldReceipt });

  } catch (error: any) {
    await session.abortTransaction();
    console.error('[SALES RECEIPTS] Error updating sales receipt:', error);

    let statusCode = 500;
    let message = error.message || 'Error updating sales receipt';

    if (error.name === 'ValidationError') {
      statusCode = 400;
      message = Object.values(error.errors || {}).map((e: any) => e.message).join(', ');
    } else if (message.includes('not found') || message.includes('required') || message.includes('missing')) {
      statusCode = 400;
    }

    res.status(statusCode).json({ success: false, message: message, error: error.message });
  } finally {
    session.endSession();
  }
};

// Delete sales receipt
export const deleteSalesReceipt = async (req: AuthRequest, res: Response): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const receipt = await SalesReceipt.findOne({ _id: id, organization: req.user.organizationId }).session(session);

    if (!receipt) {
      await session.abortTransaction();
      res.status(404).json({ success: false, message: 'Sales receipt not found' });
      return;
    }

    // 1. Reverse Inventory
    if (receipt.items && receipt.items.length > 0) {
      for (const line of receipt.items) {
        const item = await Item.findById(line.item).session(session);
        if (item && item.trackInventory) {
          const quantity = Number(line.quantity) || 0;
          item.stockQuantity = (item.stockQuantity || 0) + quantity;
          await item.save({ session });
        }
      }
    }

    // 2. Delete Linked Journal Entry
    const linkedJournals = await JournalEntry.find({
      organization: req.user.organizationId,
      sourceId: receipt._id,
      sourceType: 'sales_receipt'
    }).session(session);

    for (const journal of linkedJournals) {
      if (journal.lines) {
        await updateAccountBalancesLocal(journal.lines, req.user.organizationId, session, true); // true = reverse
      }
    }

    await JournalEntry.deleteMany({
      organization: req.user.organizationId,
      sourceId: receipt._id,
      sourceType: 'sales_receipt'
    }).session(session);

    // 3. Delete Receipt
    await SalesReceipt.deleteOne({ _id: id, organization: req.user.organizationId }).session(session);

    await session.commitTransaction();
    res.json({ success: true, message: 'Sales receipt deleted successfully' });

  } catch (error: any) {
    await session.abortTransaction();
    console.error('[SALES RECEIPTS] Error deleting sales receipt:', error);
    res.status(500).json({ success: false, message: 'Error deleting sales receipt', error: error.message });
  } finally {
    session.endSession();
  }
};

// Get next sales receipt number
export const getNextSalesReceiptNumber = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    // 1. Try to get from TransactionNumberSeries
    const series = await TransactionNumberSeries.findOne({
      organization: req.user.organizationId,
      module: 'Sales Receipt',
      isDefault: true,
      isActive: true
    });

    if (series) {
      const nextNumberValue = (series.currentNumber || 0) + 1;
      const prefix = series.prefix || 'SR-';
      const paddedNumber = String(nextNumberValue).padStart(series.startingNumber?.length || 5, '0');
      const nextReceiptNumber = `${prefix}${paddedNumber}`;

      res.json({
        success: true,
        data: {
          nextReceiptNumber,
          nextNumber: nextNumberValue,
          prefix: prefix,
          seriesId: series._id
        }
      });
      return;
    }

    // 2. Fallback to existing logic
    const lastReceipt = await SalesReceipt.findOne({ organization: req.user.organizationId })
      .sort({ createdAt: -1 })
      .select('receiptNumber');

    let nextNumber = 1;
    if (lastReceipt && lastReceipt.receiptNumber) {
      const match = lastReceipt.receiptNumber.match(/\d+$/);
      if (match) {
        nextNumber = parseInt(match[0], 10) + 1;
      }
    }

    const paddedNumber = String(nextNumber).padStart(5, '0');
    const nextReceiptNumber = `SR-${paddedNumber}`;

    res.json({ success: true, data: { nextReceiptNumber } });
  } catch (error: any) {
    console.error('[SALES RECEIPTS] Error getting next receipt number:', error);
    res.status(500).json({ success: false, message: 'Error generating receipt number', error: error.message });
  }
};

// Email sales receipt
export const sendSalesReceiptEmail = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { id } = req.params;
    const { to, cc, bcc, from, subject, body, attachments, attachSystemPDF } = req.body || {};

    if (!to) {
      res.status(400).json({ success: false, message: "Recipient email is required" });
      return;
    }

    const receipt = await SalesReceipt.findById(id).populate("customer", "displayName name companyName email");
    if (!receipt) {
      res.status(404).json({ success: false, message: "Sales receipt not found" });
      return;
    }

    if (receipt.organization.toString() !== req.user.organizationId.toString()) {
      res.status(403).json({ success: false, message: "Access denied" });
      return;
    }

    const organization = await Organization.findById(req.user.organizationId).select("settings name");
    const organizationSettings: any = organization?.settings || {};
    const pdfEnabledInSettings = organizationSettings?.pdfSettings?.attachPaymentReceipt === true;
    const encryptPdfEnabled = organizationSettings?.pdfSettings?.encryptPDF === true;
    const shouldAttachSystemPdf = typeof attachSystemPDF === "boolean" ? attachSystemPDF : pdfEnabledInSettings;

    const normalizedAttachments = Array.isArray(attachments)
      ? attachments
          .filter((a: any) => a && a.filename && (a.path || a.content))
          .map((attachment: any) => {
            const normalized = { ...attachment };
            if (typeof normalized.content === "string") {
              const contentStr = String(normalized.content || "").trim();
              const isDataUri = /^data:.*;base64,/i.test(contentStr);
              const isExplicitBase64 = String(normalized.encoding || "").toLowerCase() === "base64";
              if (isDataUri || isExplicitBase64) {
                const base64Content = isDataUri ? contentStr.split(",")[1] || "" : contentStr;
                normalized.content = Buffer.from(base64Content, "base64");
                delete normalized.encoding;
              }
            }
            return normalized;
          })
      : [];

    if (shouldAttachSystemPdf) {
      const fileName = `${receipt.receiptNumber || "sales-receipt"}${encryptPdfEnabled ? "-protected" : ""}.pdf`;
      const lines = [
        `${organization?.name || "Taban"} Sales Receipt`,
        `Receipt Number: ${receipt.receiptNumber || "-"}`,
        `Date: ${receipt.date ? new Date(receipt.date).toLocaleDateString("en-GB") : "-"}`,
        `Total: ${receipt.currency || ""} ${Number(receipt.total || 0).toFixed(2)}`,
        `PDF Protection: ${encryptPdfEnabled ? "Enabled" : "Disabled"}`,
      ];
      normalizedAttachments.push({
        filename: fileName,
        content: buildSimplePdf(lines),
        contentType: "application/pdf",
      });
    }

    await sendEmail({
      to,
      cc,
      bcc,
      subject,
      html: body,
      from,
      attachments: normalizedAttachments,
      organizationId: req.user.organizationId
    });

    if ((receipt as any).status !== "void") {
      (receipt as any).status = "paid";
    }
    (receipt as any).emailed = true;
    await receipt.save();

    res.json({ success: true, message: "Email sent successfully" });
  } catch (error: any) {
    console.error("[SALES RECEIPT EMAIL] Error sending email:", error);
    res.status(500).json({ success: false, message: "Error sending email", error: error.message });
  }
};


// Email quote
export const sendQuoteEmail = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const { to, cc, bcc, from, subject, body, attachments, attachSystemPDF } = req.body;


    if (!to) {
      res.status(400).json({ success: false, message: 'Recipient email is required' });
      return;
    }

    const quote = await Quote.findById(id);
    if (!quote) {
      res.status(404).json({ success: false, message: 'Quote not found' });
      return;
    }

    // Verify organization ownership
    if (quote.organization.toString() !== req.user.organizationId.toString()) {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }

    console.log(`[QUOTE EMAIL] Sending quote ${quote.quoteNumber} to ${to}`);

    const organization = await Organization.findById(req.user.organizationId).select("settings name");
    const organizationSettings: any = organization?.settings || {};
    const pdfEnabledInSettings = organizationSettings?.pdfSettings?.attachPDFInvoice !== false;
    const encryptPdfEnabled = organizationSettings?.pdfSettings?.encryptPDF === true;
    const shouldAttachSystemPdf = typeof attachSystemPDF === "boolean" ? attachSystemPDF : pdfEnabledInSettings;

    const normalizedAttachments = Array.isArray(attachments)
      ? attachments
          .filter((a: any) => a && a.filename && (a.path || a.content))
          .map((attachment: any) => {
            const normalized = { ...attachment };
            if (typeof normalized.content === "string") {
              const contentStr = String(normalized.content || "").trim();
              const isDataUri = /^data:.*;base64,/i.test(contentStr);
              const isExplicitBase64 = String(normalized.encoding || "").toLowerCase() === "base64";
              if (isDataUri || isExplicitBase64) {
                const base64Content = isDataUri ? contentStr.split(",")[1] || "" : contentStr;
                normalized.content = Buffer.from(base64Content, "base64");
                delete normalized.encoding;
              }
            }
            return normalized;
          })
      : [];

    if (shouldAttachSystemPdf) {
      const fileName = `${quote.quoteNumber || "quote"}${encryptPdfEnabled ? "-protected" : ""}.pdf`;
      const lines = [
        `${organization?.name || "Taban"} Quote`,
        `Quote Number: ${quote.quoteNumber || "-"}`,
        `Date: ${(quote as any).quoteDate || (quote as any).date ? new Date((quote as any).quoteDate || (quote as any).date).toLocaleDateString("en-GB") : "-"}`,
        `Total: ${quote.currency || ""} ${Number(quote.total || 0).toFixed(2)}`,
        `PDF Protection: ${encryptPdfEnabled ? "Enabled" : "Disabled"}`,
      ];
      normalizedAttachments.push({
        filename: fileName,
        content: buildSimplePdf(lines),
        contentType: "application/pdf",
      });
    }

    const emailResult = await sendEmail({
      to,
      cc,
      bcc,
      subject,
      html: body,
      from,
      attachments: normalizedAttachments,
      organizationId: req.user.organizationId
    });

    if (!emailResult.success) {
      const reason = emailResult.error || "Failed to send email";
      console.error(`[QUOTE EMAIL] Send failed for quote ${quote.quoteNumber}: ${reason}`);
      res.status(500).json({ success: false, message: reason });
      return;
    }

    // Update quote status
    quote.status = 'sent';
    await quote.save();

    res.json({ success: true, message: 'Email sent successfully' });
  } catch (error: any) {
    console.error('[QUOTE EMAIL] Error sending email:', error);
    res.status(500).json({ success: false, message: 'Error sending email', error: error.message });
  }
};

// ============================================================================
// CONTACT PERSONS OPERATIONS
// ============================================================================

// Get all contact persons (optionally filtered by customerId)
export const getAllContactPersons = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { customerId } = req.query;

    if (!customerId) {
      res.json({ success: true, data: [] });
      return;
    }

    // Try finding as customer first
    let entity: any = await Customer.findById(customerId);

    // If not found as customer, try as vendor
    if (!entity) {
      entity = await Vendor.findById(customerId);
    }

    if (!entity) {
      res.status(404).json({ success: false, message: 'Entity (Customer/Vendor) not found' });
      return;
    }

    // Verify organization ownership
    if (entity.organization && entity.organization.toString() !== req.user.organizationId.toString()) {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }

    res.json({ success: true, data: entity.contactPersons || [] });

  } catch (error: any) {
    console.error('[CONTACT PERSONS] Error fetching contact persons:', error);
    res.status(500).json({ success: false, message: 'Error fetching contact persons', error: error.message });
  }
};

// Create new contact person
export const createContactPerson = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { customerId, ...contactData } = req.body;

    if (!customerId) {
      res.status(400).json({ success: false, message: 'Customer ID is required' });
      return;
    }

    let entity: any = await Customer.findById(customerId);
    let entityLabel = "customer";

    if (!entity) {
      entity = await Vendor.findById(customerId);
      entityLabel = "vendor";
    }

    if (!entity) {
      res.status(404).json({ success: false, message: 'Customer or vendor not found' });
      return;
    }

    // Verify organization ownership
    if (entity.organization && entity.organization.toString() !== req.user.organizationId.toString()) {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }

    // Initialize contactPersons array if it doesn't exist
    if (!entity.contactPersons) {
      entity.contactPersons = [];
    }

    // Create new contact person object with _id
    const newContactPerson: any = {
      ...contactData,
      // Ensure required fields
      firstName: contactData.firstName || '',
      lastName: contactData.lastName || '',
    };

    // Mongoose subdocument array push will automatically add _id if defined in schema, 
    // but explicit logic is safe.

    entity.contactPersons.push(newContactPerson);
    await entity.save();

    // Get the created contact person (last element)
    const createdContact = entity.contactPersons[entity.contactPersons.length - 1];

    res.status(201).json({
      success: true,
      message: `Contact person created successfully for ${entityLabel}`,
      data: createdContact
    });
  } catch (error: any) {
    console.error('[CONTACT PERSONS] Error creating contact person:', error);
    res.status(500).json({ success: false, message: 'Error creating contact person', error: error.message });
  }
};

// Email invoice
export const sendInvoiceEmail = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const { to, cc, bcc, subject, body, from, attachments, attachSystemPDF } = req.body;

    if (!to) {
      res.status(400).json({ success: false, message: 'Recipient email is required' });
      return;
    }

    const invoice = await Invoice.findById(id);
    if (!invoice) {
      res.status(404).json({ success: false, message: 'Invoice not found' });
      return;
    }

    // Verify organization ownership
    if (invoice.organization.toString() !== req.user.organizationId.toString()) {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }

    console.log(`[INVOICE EMAIL] Sending invoice ${invoice.invoiceNumber} to ${to}`);

    const organization = await Organization.findById(req.user.organizationId).select("settings name");
    const organizationSettings: any = organization?.settings || {};
    const pdfEnabledInSettings = organizationSettings?.pdfSettings?.attachPDFInvoice !== false;
    const encryptPdfEnabled = organizationSettings?.pdfSettings?.encryptPDF === true;
    const shouldAttachSystemPdf = typeof attachSystemPDF === "boolean" ? attachSystemPDF : pdfEnabledInSettings;

    const normalizedAttachments = Array.isArray(attachments)
      ? attachments
          .filter((a: any) => a && a.filename && (a.path || a.content))
          .map((attachment: any) => {
            const normalized = { ...attachment };
            if (typeof normalized.content === "string") {
              const contentStr = String(normalized.content || "").trim();
              const isDataUri = /^data:.*;base64,/i.test(contentStr);
              const isExplicitBase64 = String(normalized.encoding || "").toLowerCase() === "base64";
              if (isDataUri || isExplicitBase64) {
                const base64Content = isDataUri ? contentStr.split(",")[1] || "" : contentStr;
                normalized.content = Buffer.from(base64Content, "base64");
                delete normalized.encoding;
              }
            }
            return normalized;
          })
      : [];

    if (shouldAttachSystemPdf) {
      const fileName = `${invoice.invoiceNumber || "invoice"}${encryptPdfEnabled ? "-protected" : ""}.pdf`;
      const lines = [
        `${organization?.name || "Taban"} Invoice`,
        `Invoice Number: ${invoice.invoiceNumber || "-"}`,
        `Invoice Date: ${invoice.date ? new Date(invoice.date).toLocaleDateString("en-GB") : "-"}`,
        `Due Date: ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString("en-GB") : "-"}`,
        `Total: ${invoice.currency || ""} ${Number(invoice.total || 0).toFixed(2)}`,
        `PDF Protection: ${encryptPdfEnabled ? "Enabled" : "Disabled"}`,
      ];
      normalizedAttachments.push({
        filename: fileName,
        content: buildSimplePdf(lines),
        contentType: "application/pdf",
      });
    }

    await sendEmail({
      to,
      cc,
      bcc,
      subject,
      html: body,
      from,
      attachments: normalizedAttachments,
      organizationId: req.user.organizationId
    });

    // Update invoice status if needed (e.g. draft -> sent) and run the same
    // accounting/inventory side-effects as invoice activation.
    if (invoice.status === 'draft') {
      invoice.status = 'sent';
      await invoice.save();

      // Create journal entry and mark linkage if missing.
      if (!invoice.journalEntryCreated) {
        try {
          const journalEntryId = await createInvoiceJournalEntry(
            invoice,
            req.user.organizationId,
            req.user.userId
          );
          if (journalEntryId) {
            invoice.journalEntryCreated = true;
            invoice.journalEntryId = journalEntryId;
            await invoice.save();

            // Increase customer receivables once invoice becomes active.
            try {
              await Customer.findByIdAndUpdate(invoice.customer, {
                $inc: { receivables: Number(invoice.total || 0) }
              });
            } catch (custError: any) {
              console.error('[INVOICE EMAIL] Failed to update customer receivables:', custError?.message || custError);
            }
          }
        } catch (journalError: any) {
          console.error('[INVOICE EMAIL] Failed creating journal on draft->sent:', journalError?.message || journalError);
        }
      }

      // Reduce stock on draft -> sent transition.
      if (Array.isArray(invoice.items) && invoice.items.length > 0) {
        try {
          const { getItemsSettings } = await import('../utils/itemsSettings.js');
          const settings = await getItemsSettings(req.user.organizationId);
          if (settings.enableInventoryTracking) {
            for (const line of invoice.items as any[]) {
              const rawItemId = line?.item?._id || line?.item?.id || line?.item || line?.itemId;
              const itemId = rawItemId ? String(rawItemId) : '';
              const quantityToDeduct = Math.abs(Number(line?.quantity || 0));
              if (!itemId || !mongoose.Types.ObjectId.isValid(itemId) || quantityToDeduct <= 0) continue;

              const itemDoc = await Item.findById(itemId);
              if (!itemDoc || !itemDoc.trackInventory) continue;

              const currentStock = Number(itemDoc.stockQuantity || 0);
              const newStock = currentStock - quantityToDeduct;

              if (settings.preventNegativeStock && newStock < 0) {
                console.warn(`[INVOICE EMAIL] Insufficient stock for ${itemDoc.name}. Available=${currentStock}, required=${quantityToDeduct}`);
                continue;
              }

              await Item.findByIdAndUpdate(itemId, {
                $inc: { stockQuantity: -quantityToDeduct }
              });

              if (settings.notifyReorderPoint) {
                const { checkAndNotifyReorderPoint } = await import("../utils/reorderPointNotification.js");
                checkAndNotifyReorderPoint(
                  req.user.organizationId,
                  itemId,
                  newStock
                ).catch((err: any) => {
                  console.error(`[INVOICE EMAIL] Reorder check failed for item ${itemId}:`, err);
                });
              }
            }
          }
        } catch (stockError: any) {
          console.error('[INVOICE EMAIL] Stock update failed on draft->sent:', stockError?.message || stockError);
        }
      }
    }

    res.json({ success: true, message: 'Email sent successfully' });
  } catch (error: any) {
    console.error('[INVOICE EMAIL] Error sending email:', error);
    res.status(500).json({ success: false, message: 'Error sending email', error: error.message });
  }
};

// Email retainer invoice
export const sendRetainerInvoiceEmail = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const { to, cc, bcc, subject, body, from, attachments, attachSystemPDF } = req.body;

    if (!to) {
      res.status(400).json({ success: false, message: 'Recipient email is required' });
      return;
    }

    const retainerInvoice = await RetainerInvoice.findById(id)
      .populate('customer', 'displayName name companyName email')
      .populate('projectId', 'name projectName');

    if (!retainerInvoice) {
      res.status(404).json({ success: false, message: 'Retainer invoice not found' });
      return;
    }

    if (retainerInvoice.organization.toString() !== req.user.organizationId.toString()) {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }

    const organization = await Organization.findById(req.user.organizationId).select("settings name");
    const organizationSettings: any = organization?.settings || {};
    const pdfEnabledInSettings = organizationSettings?.pdfSettings?.attachPDFRetainerInvoice !== false;
    const encryptPdfEnabled = organizationSettings?.pdfSettings?.encryptPDF === true;
    const shouldAttachSystemPdf = typeof attachSystemPDF === "boolean" ? attachSystemPDF : pdfEnabledInSettings;

    const normalizedAttachments = Array.isArray(attachments)
      ? attachments
          .filter((a: any) => a && a.filename && (a.path || a.content))
          .map((attachment: any) => {
            const normalized = { ...attachment };
            if (typeof normalized.content === "string") {
              const contentStr = String(normalized.content || "").trim();
              const isDataUri = /^data:.*;base64,/i.test(contentStr);
              const isExplicitBase64 = String(normalized.encoding || "").toLowerCase() === "base64";
              if (isDataUri || isExplicitBase64) {
                const base64Content = isDataUri ? contentStr.split(",")[1] || "" : contentStr;
                normalized.content = Buffer.from(base64Content, "base64");
                delete normalized.encoding;
              }
            }
            return normalized;
          })
      : [];

    if (shouldAttachSystemPdf) {
      const fileName = `${retainerInvoice.retainerInvoiceNumber || "retainer-invoice"}${encryptPdfEnabled ? "-protected" : ""}.pdf`;
      const retainerDate = (retainerInvoice as any).invoiceDate || retainerInvoice.date;
      const lines = [
        `${organization?.name || "Taban"} Retainer Invoice`,
        `Retainer Number: ${retainerInvoice.retainerInvoiceNumber || "-"}`,
        `Retainer Date: ${retainerDate ? new Date(retainerDate).toLocaleDateString("en-GB") : "-"}`,
        `Total: ${retainerInvoice.currency || ""} ${Number(retainerInvoice.total || 0).toFixed(2)}`,
        `PDF Protection: ${encryptPdfEnabled ? "Enabled" : "Disabled"}`,
      ];
      normalizedAttachments.push({
        filename: fileName,
        content: buildSimplePdf(lines),
        contentType: "application/pdf",
      });
    }

    await sendEmail({
      to,
      cc,
      bcc,
      subject,
      html: body,
      from,
      attachments: normalizedAttachments,
      organizationId: req.user.organizationId
    });

    if (retainerInvoice.status === 'draft') {
      retainerInvoice.status = 'sent';
      await retainerInvoice.save();
    }

    res.json({ success: true, message: 'Retainer invoice email sent successfully' });
  } catch (error: any) {
    console.error('[RETAINER EMAIL] Error sending retainer invoice email:', error);
    res.status(500).json({ success: false, message: 'Error sending retainer invoice email', error: error.message });
  }
};

// Manual invoice reminder email (Settings > Reminders templates)
export const sendInvoiceReminder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { id } = req.params;
    const { kind, to: overrideTo } = req.body || {};

    const invoice = await Invoice.findById(id).populate("customer", "displayName name email");
    if (!invoice) {
      res.status(404).json({ success: false, message: "Invoice not found" });
      return;
    }

    if (invoice.organization.toString() !== req.user.organizationId.toString()) {
      res.status(403).json({ success: false, message: "Access denied" });
      return;
    }

    const due = invoice.dueDate ? new Date(invoice.dueDate) : null;
    const isOverdue = due ? due.getTime() < Date.now() : false;
    const reminderKind = kind === "sent" || kind === "overdue" ? kind : (isOverdue ? "overdue" : "sent");

    const templateKey =
      reminderKind === "overdue"
        ? "invoice_manual_overdue_reminder"
        : "invoice_manual_sent_reminder";

    const organization = await Organization.findById(req.user.organizationId).select("name settings");
    const templates: any = (organization as any)?.settings?.emailTemplates || {};
    const template = templates[templateKey] || {};

    const defaultSubject =
      reminderKind === "overdue"
        ? "Payment of %Balance% is outstanding for %InvoiceNumber%"
        : "Your invoice %InvoiceNumber% is due on %DueDate%";

    const defaultBody =
      reminderKind === "overdue"
        ? "Dear %CustomerName%,\n\nYou might have missed the payment date and the invoice is now overdue by %OverdueDays% days.\n\nInvoice#: %InvoiceNumber%\nInvoice Date: %InvoiceDate%\nDue Date: %DueDate%\nBalance: %Balance%\n\nIf you have already paid, please accept our apologies and kindly ignore this payment reminder.\n\nRegards,\n%CompanyName%"
        : "Dear %CustomerName%,\n\nThis is a friendly reminder that your invoice will be due on %DueDate%.\n\nInvoice#: %InvoiceNumber%\nInvoice Date: %InvoiceDate%\nDue Date: %DueDate%\nBalance: %Balance%\n\nIf you have already paid, please ignore this reminder.\n\nRegards,\n%CompanyName%";

    const subjectTemplate = String(template.subject || defaultSubject);
    const bodyTemplate = String(template.body || defaultBody);

    const customer: any = (invoice as any).customer;
    const to = String(overrideTo || customer?.email || "").trim();
    if (!to) {
      res.status(400).json({ success: false, message: "Customer email is required to send a reminder" });
      return;
    }

    const startOfDay = (date: Date): Date => {
      const copy = new Date(date);
      copy.setHours(0, 0, 0, 0);
      return copy;
    };

    const diffDays = (from: Date, toDate: Date): number => {
      const a = startOfDay(from).getTime();
      const b = startOfDay(toDate).getTime();
      return Math.floor((a - b) / (1000 * 60 * 60 * 24));
    };

    const applyPlaceholders = (input: string, values: Record<string, string>): string =>
      String(input || "").replace(/%([A-Za-z0-9_]+)%/g, (_m, key) =>
        values[key] !== undefined ? values[key] : `%${key}%`
      );

    const escapeHtml = (value: string): string =>
      String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

    const hasHtmlTags = (content: string): boolean => /<([a-z][\s\S]*?)>/i.test(content || "");

    const textToHtml = (text: string): string => {
      const normalized = String(text || "").replace(/\r\n/g, "\n");
      const escaped = escapeHtml(normalized);
      const withBold = escaped.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
      const withBreaks = withBold.replace(/\n/g, "<br/>");
      return `<div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #111827;">${withBreaks}</div>`;
    };

    const currency = String((invoice as any).currency || "");
    const balanceValue = Number((invoice as any).balance ?? Math.max(0, Number((invoice as any).total || 0) - Number((invoice as any).paidAmount || 0)));
    const invoiceDate = (invoice as any).date ? new Date((invoice as any).date) : null;
    const dueDate = (invoice as any).dueDate ? new Date((invoice as any).dueDate) : null;
    const expectedPaymentDate = (invoice as any).expectedPaymentDate ? new Date((invoice as any).expectedPaymentDate) : null;

    const placeholders: Record<string, string> = {
      CompanyName: String(organization?.name || "Taban Books"),
      UserName: String(organization?.name || "Taban Team"),
      CustomerName: String(customer?.displayName || customer?.name || "Customer"),
      InvoiceNumber: String((invoice as any).invoiceNumber || ""),
      InvoiceDate: invoiceDate ? invoiceDate.toLocaleDateString("en-GB") : "",
      DueDate: dueDate ? dueDate.toLocaleDateString("en-GB") : "",
      ExpectedPaymentDate: expectedPaymentDate ? expectedPaymentDate.toLocaleDateString("en-GB") : "",
      OverdueDays: dueDate ? String(Math.max(0, diffDays(new Date(), dueDate))) : "0",
      Balance: `${currency} ${balanceValue.toFixed(2)}`.trim(),
      Total: `${currency} ${Number((invoice as any).total || 0).toFixed(2)}`.trim(),
    };

    const subject = applyPlaceholders(subjectTemplate, placeholders) || defaultSubject;
    const renderedBody = applyPlaceholders(bodyTemplate, placeholders) || defaultBody;
    const html = hasHtmlTags(renderedBody) ? renderedBody : textToHtml(renderedBody);

    const splitEmails = (value: any): string[] =>
      String(value || "")
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);

    await sendEmail({
      to,
      subject,
      html,
      from: template.from || undefined,
      cc: splitEmails(template.cc),
      bcc: splitEmails(template.bcc),
      organizationId: req.user.organizationId,
    });

    res.json({ success: true, message: "Reminder email sent successfully" });
  } catch (error: any) {
    console.error("[INVOICE REMINDER] Error sending reminder:", error);
    res.status(500).json({
      success: false,
      message: "Error sending reminder email",
      error: error.message,
    });
  }
};

// Stop / enable automated reminders for an invoice
export const setInvoiceRemindersStopped = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { id } = req.params;
    const { stopped } = req.body || {};

    if (typeof stopped !== "boolean") {
      res.status(400).json({ success: false, message: "stopped must be a boolean" });
      return;
    }

    const invoice = await Invoice.findById(id);
    if (!invoice) {
      res.status(404).json({ success: false, message: "Invoice not found" });
      return;
    }

    if (invoice.organization.toString() !== req.user.organizationId.toString()) {
      res.status(403).json({ success: false, message: "Access denied" });
      return;
    }

    (invoice as any).remindersStopped = stopped;
    (invoice as any).remindersStoppedAt = stopped ? new Date() : undefined;

    await invoice.save();

    res.json({ success: true, message: "Invoice reminder status updated", data: invoice });
  } catch (error: any) {
    console.error("[INVOICE REMINDERS] Error updating reminder status:", error);
    res.status(500).json({ success: false, message: "Error updating reminder status", error: error.message });
  }
};

/**
 * Send customer statement email
 * POST /api/customers/:id/send-statement
 */
export const sendCustomerStatementEmail = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const { to, cc, bcc, subject, body, attachments } = req.body;

    if (!to) {
      res.status(400).json({ success: false, message: 'Recipient email is required' });
      return;
    }

    const customer = await Customer.findById(id);
    if (!customer) {
      res.status(404).json({ success: false, message: 'Customer not found' });
      return;
    }

    // Verify organization ownership
    if (customer.organization && customer.organization.toString() !== req.user.organizationId.toString()) {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }

    console.log(`[STATEMENT EMAIL] Sending statement to ${to} for customer ${customer.displayName}`);

    // Call email service with organizationId for dynamic sender resolution
    await sendEmail({
      to,
      cc,
      bcc,
      subject,
      html: body,
      organizationId: req.user.organizationId
    });

    res.json({ success: true, message: 'Statement email sent successfully' });
  } catch (error: any) {
    console.error('[STATEMENT EMAIL] Error sending email:', error);
    res.status(500).json({ success: false, message: 'Error sending email', error: error.message });
  }
};

// Email payment received (payment receipt)
export const sendPaymentReceivedEmail = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const { to, cc, bcc, subject, body, from, attachments, attachSystemPDF, attachPDF } = req.body;

    if (!to) {
      res.status(400).json({ success: false, message: 'Recipient email is required' });
      return;
    }

    const payment = await PaymentReceived.findById(id);
    if (!payment) {
      res.status(404).json({ success: false, message: 'Payment not found' });
      return;
    }

    // Verify organization ownership
    if (payment.organization.toString() !== req.user.organizationId.toString()) {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }

    console.log(`[PAYMENT EMAIL] Sending payment ${payment.paymentNumber || payment._id} to ${to}`);

    const organization = await Organization.findById(req.user.organizationId).select("settings name");
    const organizationSettings: any = organization?.settings || {};
    const pdfEnabledInSettings = organizationSettings?.pdfSettings?.attachPaymentReceipt === true;
    const encryptPdfEnabled = organizationSettings?.pdfSettings?.encryptPDF === true;
    const shouldAttachSystemPdf = typeof attachSystemPDF === "boolean"
      ? attachSystemPDF
      : (typeof attachPDF === "boolean" ? attachPDF : pdfEnabledInSettings);

    const normalizedAttachments = Array.isArray(attachments)
      ? attachments
          .filter((a: any) => a && a.filename && (a.path || a.content))
          .map((attachment: any) => {
            const normalized = { ...attachment };
            if (typeof normalized.content === "string") {
              const contentStr = String(normalized.content || "").trim();
              const isDataUri = /^data:.*;base64,/i.test(contentStr);
              const isExplicitBase64 = String(normalized.encoding || "").toLowerCase() === "base64";
              if (isDataUri || isExplicitBase64) {
                const base64Content = isDataUri ? contentStr.split(",")[1] || "" : contentStr;
                normalized.content = Buffer.from(base64Content, "base64");
                delete normalized.encoding;
              }
            }
            return normalized;
          })
      : [];

    if (shouldAttachSystemPdf) {
      const fileName = `${payment.paymentNumber || "payment-receipt"}${encryptPdfEnabled ? "-protected" : ""}.pdf`;
      const lines = [
        `${organization?.name || "Taban"} Payment Receipt`,
        `Payment Number: ${payment.paymentNumber || "-"}`,
        `Date: ${(payment as any).date ? new Date((payment as any).date).toLocaleDateString("en-GB") : "-"}`,
        `Amount: ${payment.currency || ""} ${Number((payment as any).amountReceived || (payment as any).amount || 0).toFixed(2)}`,
        `PDF Protection: ${encryptPdfEnabled ? "Enabled" : "Disabled"}`,
      ];
      normalizedAttachments.push({
        filename: fileName,
        content: buildSimplePdf(lines),
        contentType: "application/pdf",
      });
    }

    await sendEmail({
      to,
      cc,
      bcc,
      subject,
      html: body,
      from,
      attachments: normalizedAttachments,
      organizationId: req.user.organizationId
    });

    // mark payment as emailed
    payment.emailed = true;
    await payment.save();

    res.json({ success: true, message: 'Email sent successfully' });
  } catch (error: any) {
    console.error('[PAYMENT EMAIL] Error sending email:', error);
    res.status(500).json({ success: false, message: 'Error sending email', error: error.message });
  }
};

// Create refund
export const createRefund = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { paymentId, creditNoteId, amount, refundDate, paymentMethod, referenceNumber, fromAccount, description } = req.body;

    if ((!paymentId && !creditNoteId) || amount === undefined || amount === null || !refundDate) {
      res.status(400).json({ success: false, message: 'Payment ID or Credit Note ID, amount, and refund date are required' });
      return;
    }

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      res.status(400).json({ success: false, message: 'Refund amount must be a valid positive number' });
      return;
    }

    let customerId: any;
    let sourceRecord: any;
    let sourceType: 'payment' | 'credit_note' = paymentId ? 'payment' : 'credit_note';

    if (paymentId) {
      sourceRecord = await PaymentReceived.findById(paymentId);
      if (!sourceRecord) {
        res.status(404).json({ success: false, message: 'Payment not found' });
        return;
      }
      customerId = sourceRecord.customer;
    } else {
      sourceRecord = await CreditNote.findById(creditNoteId);
      if (!sourceRecord) {
        res.status(404).json({ success: false, message: 'Credit Note not found' });
        return;
      }
      customerId = sourceRecord.customer;
    }

    if (sourceRecord.organization.toString() !== req.user.organizationId.toString()) {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }

    if (sourceType === 'credit_note') {
      const availableCreditBalance = Number((sourceRecord as any).balance ?? (sourceRecord as any).total ?? 0);
      if (!Number.isFinite(availableCreditBalance) || parsedAmount > availableCreditBalance + 0.000001) {
        res.status(400).json({
          success: false,
          message: `Refund amount exceeds available credit balance (${availableCreditBalance.toFixed(2)}).`
        });
        return;
      }
    }

    const finalPaymentMethod = toPaymentMethodCode(
      paymentMethod,
      sourceType === 'payment'
        ? toPaymentMethodCode(sourceRecord.paymentMethod, 'cash')
        : 'cash'
    );

    let refundNumber = "";
    let isUnique = false;
    let count = await Refund.countDocuments({ organization: req.user.organizationId });

    while (!isUnique) {
      refundNumber = `REF-${String(count + 1).padStart(5, '0')}`;
      const existing = await Refund.findOne({ organization: req.user.organizationId, refundNumber });
      if (!existing) {
        isUnique = true;
      } else {
        count++;
      }
    }

    const payload: any = {
      organization: req.user.organizationId,
      refundNumber,
      customer: customerId,
      refundDate: new Date(refundDate),
      amount: parsedAmount,
      paymentMethod: finalPaymentMethod,
      referenceNumber,
      fromAccount: (fromAccount && mongoose.Types.ObjectId.isValid(fromAccount)) ? fromAccount : undefined,
      description,
    };

    if (paymentId) payload.payment = paymentId;
    if (creditNoteId) payload.creditNote = creditNoteId;

    const refund = await Refund.create(payload);

    // 1. Create Journal Entry
    const journalId = await createRefundJournalEntry(refund, req.user.organizationId.toString(), req.user.userId);
    if (journalId) {
      refund.journalEntryId = journalId;
      await refund.save();
    }

    // 2. Update Bank Account balance
    if (fromAccount && mongoose.Types.ObjectId.isValid(fromAccount)) {
      try {
        await BankAccount.findByIdAndUpdate(fromAccount, {
          $inc: { balance: -parsedAmount, bankBalance: -parsedAmount }
        });
      } catch (bankErr: any) {
        console.error('[REFUND] Failed to update bank account balance:', bankErr.message);
      }
    }

    // 3. Source specific updates
    if (sourceType === 'credit_note') {
      try {
        // Reduce credit note balance
        sourceRecord.balance = (sourceRecord.balance || 0) - parsedAmount;
        if (sourceRecord.balance <= 0) {
          sourceRecord.status = 'closed';
        }
        await sourceRecord.save();

        // Reduce customer unused credits
        await Customer.findByIdAndUpdate(customerId, {
          $inc: { unusedCredits: -parsedAmount }
        });
        console.log(`[REFUND] Updated credit note and customer unused credits for credit note ${creditNoteId}`);
      } catch (err: any) {
        console.error('[REFUND] Failed to update credit note/customer balances:', err.message);
      }
    }

    await refund.populate('customer', 'displayName email');
    if (paymentId) await refund.populate('payment', 'paymentNumber amount');
    if (creditNoteId) await refund.populate('creditNote', 'creditNoteNumber total');

    res.status(201).json({ success: true, data: refund });
  } catch (error: any) {
    console.error('[REFUND] Error creating refund:', error);
    res.status(500).json({ success: false, message: 'Error creating refund', error: error.message });
  }
};

export const getAllRefunds = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const refunds = await Refund.find({ organization: req.user.organizationId })
      .populate('customer', 'displayName email')
      .populate('payment', 'paymentNumber amount')
      .sort({ refundDate: -1 });

    res.json({ success: true, data: refunds });
  } catch (error: any) {
    console.error('[REFUND] Error fetching refunds:', error);
    res.status(500).json({ success: false, message: 'Error fetching refunds', error: error.message });
  }
};

export const getRefundById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const refund = await Refund.findById(id)
      .populate('customer', 'displayName email phone')
      .populate('payment', 'paymentNumber amount date')
      .populate('fromAccount', 'accountName accountNumber');

    if (!refund) {
      res.status(404).json({ success: false, message: 'Refund not found' });
      return;
    }

    if (refund.organization.toString() !== req.user.organizationId.toString()) {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }

    res.json({ success: true, data: refund });
  } catch (error: any) {
    console.error('[REFUND] Error fetching refund:', error);
    res.status(500).json({ success: false, message: 'Error fetching refund', error: error.message });
  }
};

export const getRefundsByPaymentId = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { paymentId } = req.params;
    const refunds = await Refund.find({
      organization: req.user.organizationId,
      payment: paymentId
    })
      .populate('customer', 'displayName email')
      .populate('fromAccount', 'accountName name accountCode')
      .sort({ refundDate: -1 });

    res.json({ success: true, data: refunds });
  } catch (error: any) {
    console.error('[REFUND] Error fetching refunds by payment:', error);
    res.status(500).json({ success: false, message: 'Error fetching refunds', error: error.message });
  }
};

export const getRefundsByCreditNoteId = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { creditNoteId } = req.params;
    const refunds = await Refund.find({
      organization: req.user.organizationId,
      creditNote: creditNoteId
    }).populate('fromAccount', 'name accountName').sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: refunds });
  } catch (error: any) {
    console.error('[REFUND] Error getting refunds by credit note:', error);
    res.status(500).json({ success: false, message: 'Error fetching refunds', error: error.message });
  }
};
