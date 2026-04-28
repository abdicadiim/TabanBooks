/**
 * Tax Controller
 * Handles tax rate management
 */

import { Request, Response } from "express";
import Tax from "../models/Tax.js";
import Invoice from "../models/Invoice.js";
import Bill from "../models/Bill.js";
import Quote from "../models/Quote.js";
import PurchaseOrder from "../models/PurchaseOrder.js";
import SalesReceipt from "../models/SalesReceipt.js";
import VendorCredit from "../models/VendorCredit.js";
import { DebitNote } from "../models/DebitNote.js";
import RecurringInvoice from "../models/RecurringInvoice.js";
import RecurringBill from "../models/RecurringBill.js";
import RetainerInvoice from "../models/RetainerInvoice.js";
import CreditNote from "../models/CreditNote.js";
import Expense from "../models/Expense.js";
import RecurringExpense from "../models/RecurringExpense.js";
import BankTransaction from "../models/BankTransaction.js";
import BankRule from "../models/BankRule.js";
import Item from "../models/Item.js";
import Organization from "../models/Organization.js";
import {
  applyResourceVersionHeaders,
  buildResourceVersion,
  requestMatchesResourceVersion,
} from "../utils/resourceVersion.js";

const getTaxUsageCount = async (organizationId: string, taxIds: string[], taxRates: number[]) => {
  const rateValues = taxRates.filter((rate) => !Number.isNaN(rate));

  const counts = await Promise.all([
    CreditNote.countDocuments({
      organization: organizationId,
      "items.taxId": { $in: taxIds },
    }),
    Expense.countDocuments({
      organization: organizationId,
      $or: [
        { tax_id: { $in: taxIds } },
        { "line_items.tax_id": { $in: taxIds } },
        { "taxes.tax_id": { $in: taxIds } },
        { reverse_charge_tax_id: { $in: taxIds } },
      ],
    }),
    RecurringExpense.countDocuments({
      organization: organizationId,
      $or: [
        { tax_id: { $in: taxIds } },
        { "line_items.tax_id": { $in: taxIds } },
        { "taxes.tax_id": { $in: taxIds } },
        { reverse_charge_tax_id: { $in: taxIds } },
      ],
    }),
    BankTransaction.countDocuments({
      organization: organizationId,
      $or: [{ taxId: { $in: taxIds } }, { "lineItems.taxId": { $in: taxIds } }],
    }),
    BankRule.countDocuments({
      organization: organizationId,
      taxId: { $in: taxIds },
    }),
    Item.countDocuments({
      organization: organizationId,
      "taxInfo.taxId": { $in: taxIds },
    }),
    Invoice.countDocuments({
      organization: organizationId,
      "items.taxRate": { $in: rateValues },
    }),
    Bill.countDocuments({
      organization: organizationId,
      "items.taxRate": { $in: rateValues },
    }),
    Quote.countDocuments({
      organization: organizationId,
      "items.taxRate": { $in: rateValues },
    }),
    PurchaseOrder.countDocuments({
      organization: organizationId,
      "items.taxRate": { $in: rateValues },
    }),
    SalesReceipt.countDocuments({
      organization: organizationId,
      "items.taxRate": { $in: rateValues },
    }),
    VendorCredit.countDocuments({
      organization: organizationId,
      "items.taxRate": { $in: rateValues },
    }),
    DebitNote.countDocuments({
      organization: organizationId,
      "items.taxRate": { $in: rateValues },
    }),
    RecurringInvoice.countDocuments({
      organization: organizationId,
      "items.taxRate": { $in: rateValues },
    }),
    RecurringBill.countDocuments({
      organization: organizationId,
      "items.taxRate": { $in: rateValues },
    }),
    RetainerInvoice.countDocuments({
      organization: organizationId,
      "items.taxRate": { $in: rateValues },
    }),
  ]);

  return counts.reduce((sum, count) => sum + count, 0);
};

const isSalesTaxDisabled = async (organizationId: string): Promise<boolean> => {
  const organization = await Organization.findById(organizationId).lean();
  return !!organization?.settings?.taxComplianceSettings?.salesTaxDisabled;
};

/**
 * Get all taxes
 * GET /api/settings/taxes
 */
export const getTaxes = async (req: Request, res: Response): Promise<void> => {
  try {
    const organizationId = (req as any).user?.organizationId;
    if (!organizationId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { type, status, forTransactions } = req.query;
    const query: any = {
      organization: organizationId,
    };

    // Transaction forms should always receive active taxes only.
    if (forTransactions === "true") {
      query.isActive = true;
    }

    if (type === "sales") {
      query.$or = [
        { type: "sales" },
        { type: "both" },
        { type: { $exists: false } },
        { type: null },
      ];
    } else if (type === "purchase") {
      query.$or = [
        { type: "purchase" },
        { type: "both" },
        { type: { $exists: false } },
        { type: null },
      ];
    } else if (type) {
      query.type = type;
    }

    if (status === "active") {
      query.isActive = true;
    } else if (status === "inactive") {
      query.isActive = false;
    }

    if (forTransactions === "true") {
      const salesTaxDisabled = await isSalesTaxDisabled(organizationId);
      if (salesTaxDisabled) {
        const versionState = buildResourceVersion("settings-taxes", [
          {
            key: "taxes",
            id: organizationId,
            updatedAt: null,
            count: 0,
            extra: JSON.stringify({ type: type ?? "", status: status ?? "", forTransactions: "true" }),
          },
          {
            key: "org-tax-flags",
            id: organizationId,
            updatedAt: null,
            extra: "salesTaxDisabled:true",
          },
        ]);
        applyResourceVersionHeaders(res, versionState);
        if (requestMatchesResourceVersion(req, versionState)) {
          res.status(304).end();
          return;
        }
        res.json({
          success: true,
          data: [],
          version_id: versionState.version_id,
          last_updated: versionState.last_updated,
        });
        return;
      }
    }

    const [latestTax, taxCount] = await Promise.all([
      Tax.findOne(query).sort({ updatedAt: -1 }).select("updatedAt").lean(),
      Tax.countDocuments(query),
    ]);

    const versionState = buildResourceVersion("settings-taxes", [
      {
        key: "taxes",
        id: organizationId,
        updatedAt: (latestTax as any)?.updatedAt,
        count: taxCount,
        extra: JSON.stringify({ type: type ?? "", status: status ?? "", forTransactions: forTransactions ?? "" }),
      },
    ]);
    applyResourceVersionHeaders(res, versionState);

    if (requestMatchesResourceVersion(req, versionState)) {
      res.status(304).end();
      return;
    }

    const taxes = await Tax.find(query).sort({ name: 1 });

    res.json({
      success: true,
      data: taxes,
      version_id: versionState.version_id,
      last_updated: versionState.last_updated,
    });
  } catch (error: any) {
    console.error("Error fetching taxes:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch taxes",
    });
  }
};

/**
 * Get single tax
 * GET /api/settings/taxes/:id
 */
export const getTax = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const tax = await Tax.findOne({
      _id: id,
      organization: (req as any).user.organizationId,
    });

    if (!tax) {
      res.status(404).json({
        success: false,
        message: "Tax not found",
      });
      return;
    }

    res.json({
      success: true,
      data: tax,
    });
  } catch (error: any) {
    console.error("Error fetching tax:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch tax",
    });
  }
};

/**
 * Get associated records for a tax
 * GET /api/settings/taxes/:id/associated-records
 */
export const getTaxAssociatedRecords = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const organizationId = (req as any).user.organizationId;

    const tax = await Tax.findOne({
      _id: id,
      organization: organizationId,
    }).lean();

    if (!tax) {
      res.status(404).json({
        success: false,
        message: "Tax not found",
      });
      return;
    }

    const associatedTaxIds = [
      String(tax._id),
      ...((tax.groupTaxes || []).map((taxId: any) => String(taxId))),
    ];

    const associatedTaxIdSet = Array.from(new Set(associatedTaxIds));
    const rateValues = [Number(tax.rate)].filter((rate) => !Number.isNaN(rate));

    const countPromises = [
      CreditNote.countDocuments({
        organization: organizationId,
        "items.taxId": { $in: associatedTaxIdSet },
      }),
      Expense.countDocuments({
        organization: organizationId,
        $or: [
          { tax_id: { $in: associatedTaxIdSet } },
          { "line_items.tax_id": { $in: associatedTaxIdSet } },
          { "taxes.tax_id": { $in: associatedTaxIdSet } },
          { reverse_charge_tax_id: { $in: associatedTaxIdSet } },
        ],
      }),
      RecurringExpense.countDocuments({
        organization: organizationId,
        $or: [
          { tax_id: { $in: associatedTaxIdSet } },
          { "line_items.tax_id": { $in: associatedTaxIdSet } },
          { "taxes.tax_id": { $in: associatedTaxIdSet } },
          { reverse_charge_tax_id: { $in: associatedTaxIdSet } },
        ],
      }),
      BankTransaction.countDocuments({
        organization: organizationId,
        $or: [
          { taxId: { $in: associatedTaxIdSet } },
          { "lineItems.taxId": { $in: associatedTaxIdSet } },
        ],
      }),
      BankRule.countDocuments({
        organization: organizationId,
        taxId: { $in: associatedTaxIdSet },
      }),
      Item.countDocuments({
        organization: organizationId,
        "taxInfo.taxId": { $in: associatedTaxIdSet },
      }),
      Invoice.countDocuments({
        organization: organizationId,
        "items.taxRate": { $in: rateValues },
      }),
      Bill.countDocuments({
        organization: organizationId,
        "items.taxRate": { $in: rateValues },
      }),
      Quote.countDocuments({
        organization: organizationId,
        "items.taxRate": { $in: rateValues },
      }),
      PurchaseOrder.countDocuments({
        organization: organizationId,
        "items.taxRate": { $in: rateValues },
      }),
      SalesReceipt.countDocuments({
        organization: organizationId,
        "items.taxRate": { $in: rateValues },
      }),
      VendorCredit.countDocuments({
        organization: organizationId,
        "items.taxRate": { $in: rateValues },
      }),
      DebitNote.countDocuments({
        organization: organizationId,
        "items.taxRate": { $in: rateValues },
      }),
      RecurringInvoice.countDocuments({
        organization: organizationId,
        "items.taxRate": { $in: rateValues },
      }),
      RecurringBill.countDocuments({
        organization: organizationId,
        "items.taxRate": { $in: rateValues },
      }),
      RetainerInvoice.countDocuments({
        organization: organizationId,
        "items.taxRate": { $in: rateValues },
      }),
    ];

    const [
      creditNotesByTaxId,
      expensesByTaxId,
      recurringExpensesByTaxId,
      bankTransactionsByTaxId,
      bankRulesByTaxId,
      itemsByTaxId,
      invoicesByRate,
      billsByRate,
      quotesByRate,
      purchaseOrdersByRate,
      salesReceiptsByRate,
      vendorCreditsByRate,
      debitNotesByRate,
      recurringInvoicesByRate,
      recurringBillsByRate,
      retainerInvoicesByRate,
    ] = await Promise.all(countPromises);

    const exactMatches = [
      { module: "Credit Notes", count: creditNotesByTaxId },
      { module: "Expenses", count: expensesByTaxId },
      { module: "Recurring Expenses", count: recurringExpensesByTaxId },
      { module: "Bank Transactions", count: bankTransactionsByTaxId },
      { module: "Bank Rules", count: bankRulesByTaxId },
      { module: "Items", count: itemsByTaxId },
    ];

    const rateMatches = [
      { module: "Invoices", count: invoicesByRate },
      { module: "Bills", count: billsByRate },
      { module: "Quotes", count: quotesByRate },
      { module: "Purchase Orders", count: purchaseOrdersByRate },
      { module: "Sales Receipts", count: salesReceiptsByRate },
      { module: "Vendor Credits", count: vendorCreditsByRate },
      { module: "Debit Notes", count: debitNotesByRate },
      { module: "Recurring Invoices", count: recurringInvoicesByRate },
      { module: "Recurring Bills", count: recurringBillsByRate },
      { module: "Retainer Invoices", count: retainerInvoicesByRate },
    ];

    res.json({
      success: true,
      data: {
        tax: {
          id: String(tax._id),
          name: tax.name,
          rate: tax.rate,
          isGroup: Array.isArray(tax.groupTaxes) && tax.groupTaxes.length > 0,
          associatedTaxIds: associatedTaxIdSet,
        },
        exactMatches,
        rateMatches,
        exactTotal: exactMatches.reduce((sum, entry) => sum + entry.count, 0),
        rateTotal: rateMatches.reduce((sum, entry) => sum + entry.count, 0),
      },
    });
  } catch (error: any) {
    console.error("Error fetching associated tax records:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch associated records",
    });
  }
};

/**

/**
 * Create tax
 * POST /api/settings/taxes
 */
export const createTax = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      name,
      taxId,
      rate,
      type,
      description,
      isDefault,
      groupTaxes,
      accountToTrackSales,
      accountToTrackPurchases,
      isValueAddedTax,
      isCompound,
      isDigitalServiceTax,
      digitalServiceCountry,
      trackTaxByCountryScheme,
    } = req.body;

    if (!name || rate === undefined) {
      res.status(400).json({
        success: false,
        message: "Tax name and rate are required",
      });
      return;
    }

    if (rate < 0 || rate > 100) {
      res.status(400).json({
        success: false,
        message: "Tax rate must be between 0 and 100",
      });
      return;
    }

    const organizationId = (req as any).user.organizationId;
    const salesTaxDisabled = await isSalesTaxDisabled(organizationId);
    if (salesTaxDisabled) {
      res.status(400).json({
        success: false,
        message: "Sales tax is disabled for this organization.",
      });
      return;
    }

    // If this tax should be default, unset existing default for this organization
    if (isDefault) {
      await Tax.updateMany(
        { organization: organizationId, isDefault: true },
        { $set: { isDefault: false } }
      );
    }

    const normalizedGroupTaxes = Array.isArray(groupTaxes)
      ? groupTaxes.filter(Boolean)
      : [];

    const tax = await Tax.create({
      organization: organizationId,
      name,
      taxId,
      rate: parseFloat(rate),
      type: type || "both",
      description,
      isDefault: !!isDefault,
      isCompound: !!isCompound,
      accountToTrackSales,
      accountToTrackPurchases,
      isValueAddedTax: !!isValueAddedTax,
      isDigitalServiceTax: !!isDigitalServiceTax,
      digitalServiceCountry: digitalServiceCountry || undefined,
      trackTaxByCountryScheme: !!trackTaxByCountryScheme,
      groupTaxes: normalizedGroupTaxes,
    });

    res.status(201).json({
      success: true,
      message: "Tax created successfully",
      data: tax,
    });
  } catch (error: any) {
    console.error("Error creating tax:", error);
    if (error.code === 11000) {
      res.status(400).json({
        success: false,
        message: "Tax with this name already exists",
      });
      return;
    }
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create tax",
    });
  }
};

/**
 * Create taxes in bulk
 * POST /api/settings/taxes/bulk
 */
export const createTaxesBulk = async (req: Request, res: Response): Promise<void> => {
  try {
    const { taxes } = req.body;

    if (!Array.isArray(taxes) || taxes.length === 0) {
      res.status(400).json({
        success: false,
        message: "Taxes array is required",
      });
      return;
    }

    const organizationId = (req as any).user.organizationId;
    const salesTaxDisabled = await isSalesTaxDisabled(organizationId);
    if (salesTaxDisabled) {
      res.status(400).json({
        success: false,
        message: "Sales tax is disabled for this organization.",
      });
      return;
    }

    const taxesToCreate = taxes.map((tax: any) => ({
      organization: organizationId,
      name: tax.name,
      taxId: tax.taxId,
      rate: parseFloat(tax.rate),
      type: tax.type || "both",
      description: tax.description,
      isDefault: !!tax.isDefault,
      isCompound: !!tax.isCompound,
      accountToTrackSales: tax.accountToTrackSales,
      accountToTrackPurchases: tax.accountToTrackPurchases,
      isValueAddedTax: !!tax.isValueAddedTax,
      isDigitalServiceTax: !!tax.isDigitalServiceTax,
      digitalServiceCountry: tax.digitalServiceCountry || undefined,
      trackTaxByCountryScheme: !!tax.trackTaxByCountryScheme,
    }));

    const createdTaxes = await Tax.insertMany(taxesToCreate);

    res.status(201).json({
      success: true,
      message: `${createdTaxes.length} taxes created successfully`,
      data: createdTaxes,
    });
  } catch (error: any) {
    console.error("Error creating taxes in bulk:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create taxes",
    });
  }
};

/**
 * Update tax
 * PUT /api/settings/taxes/:id
 */
export const updateTax = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      name,
      taxId,
      rate,
      type,
      description,
      isActive,
      isDefault,
      groupTaxes,
      isCompound,
      accountToTrackSales,
      accountToTrackPurchases,
      isValueAddedTax,
      isDigitalServiceTax,
      digitalServiceCountry,
      trackTaxByCountryScheme,
    } = req.body;

    const tax = await Tax.findOne({
      _id: id,
      organization: (req as any).user.organizationId,
    });

    if (!tax) {
      res.status(404).json({
        success: false,
        message: "Tax not found",
      });
      return;
    }

    if (name) tax.name = name;
    if (!tax.isActive && isActive === true) {
      const salesTaxDisabled = await isSalesTaxDisabled((req as any).user.organizationId);
      if (salesTaxDisabled) {
        res.status(400).json({
          success: false,
          message: "Sales tax is disabled for this organization.",
        });
        return;
      }
    }
    if (taxId !== undefined) tax.taxId = taxId;
    if (rate !== undefined) {
      if (rate < 0 || rate > 100) {
        res.status(400).json({
          success: false,
          message: "Tax rate must be between 0 and 100",
        });
        return;
      }
      tax.rate = parseFloat(rate);
    }
    if (type) tax.type = type;
    if (description !== undefined) tax.description = description;
    if (isActive !== undefined) tax.isActive = isActive;
    if (isCompound !== undefined) (tax as any).isCompound = !!isCompound;
    if (accountToTrackSales !== undefined) (tax as any).accountToTrackSales = accountToTrackSales;
    if (accountToTrackPurchases !== undefined) (tax as any).accountToTrackPurchases = accountToTrackPurchases;
    if (isValueAddedTax !== undefined) (tax as any).isValueAddedTax = !!isValueAddedTax;
    if (isDigitalServiceTax !== undefined) (tax as any).isDigitalServiceTax = !!isDigitalServiceTax;
    if (digitalServiceCountry !== undefined) (tax as any).digitalServiceCountry = digitalServiceCountry || undefined;
    if (trackTaxByCountryScheme !== undefined) (tax as any).trackTaxByCountryScheme = !!trackTaxByCountryScheme;
    if (groupTaxes !== undefined) {
      tax.groupTaxes = Array.isArray(groupTaxes) ? groupTaxes.filter(Boolean) : [];
    }

    // Handle default tax logic: only one default per organization
    if (isDefault !== undefined) {
      if (isDefault) {
        await Tax.updateMany(
          {
            organization: (req as any).user.organizationId,
            _id: { $ne: id },
            isDefault: true,
          },
          { $set: { isDefault: false } }
        );
        tax.isDefault = true;
      } else {
        tax.isDefault = false;
      }
    }

    await tax.save();

    res.json({
      success: true,
      message: "Tax updated successfully",
      data: tax,
    });
  } catch (error: any) {
    console.error("Error updating tax:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update tax",
    });
  }
};

/**
 * Delete tax
 * DELETE /api/settings/taxes/:id
 */
export const deleteTax = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const organizationId = (req as any).user.organizationId;
    
    const tax = await Tax.findOne({
      _id: id,
      organization: organizationId,
    });

    if (!tax) {
      res.status(404).json({
        success: false,
        message: "Tax not found",
      });
      return;
    }

    // 1. Check if this tax is part of any tax group
    const groupsContainingTax = await Tax.countDocuments({
      organization: organizationId,
      groupTaxes: id
    });

    if (groupsContainingTax > 0) {
      res.status(400).json({
        success: false,
        message: "Cannot delete this tax because it is a member of one or more tax groups. Remove it from the groups first.",
      });
      return;
    }

    // 2. Check for transaction usage
    const usageCount = await getTaxUsageCount(organizationId, [id], [tax.rate]);
    
    if (usageCount > 0) {
      // If used, we can only soft-delete (deactivate)
      tax.isActive = false;
      tax.isDefault = false;
      await tax.save();

      res.json({
        success: true,
        message: "Tax was deactivated because it has associated records. It will no longer appear in transaction forms.",
        isSoftDeleted: true
      });
    } else {
      // If never used, we can hard-delete
      await Tax.deleteOne({ _id: id });
      
      res.json({
        success: true,
        message: "Tax deleted successfully",
        isSoftDeleted: false
      });
    }
  } catch (error: any) {
    console.error("Error deleting tax:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete tax",
    });
  }
};

/**
 * Disable sales tax for organization
 * POST /api/settings/taxes/disable-sales-tax
 */
export const disableSalesTax = async (req: Request, res: Response): Promise<void> => {
  try {
    const organizationId = (req as any).user.organizationId;

    const organization = await Organization.findById(organizationId);
    if (!organization) {
      res.status(404).json({
        success: false,
        message: "Organization not found",
      });
      return;
    }

    const activeTaxes = await Tax.find({
      organization: organizationId,
      isActive: true,
    }).lean();

    const taxIds = activeTaxes.map((tax: any) => String(tax._id));
    const taxRates = activeTaxes.map((tax: any) => Number(tax.rate));

    if (taxIds.length > 0) {
      const usageCount = await getTaxUsageCount(organizationId, taxIds, taxRates);
      if (usageCount > 0) {
        res.status(400).json({
          success: false,
          message:
            "Cannot disable sales tax because one or more taxes are associated with existing transactions.",
        });
        return;
      }
    }

    (organization as any).settings = (organization as any).settings || {};
    (organization as any).settings.taxComplianceSettings =
      (organization as any).settings.taxComplianceSettings || {};
    (organization as any).settings.taxComplianceSettings.salesTaxDisabled = true;
    await organization.save();

    await Tax.updateMany(
      { organization: organizationId, isActive: true },
      { $set: { isActive: false, isDefault: false } }
    );

    res.json({
      success: true,
      message: "Sales tax disabled successfully",
      data: {
        salesTaxDisabled: true,
      },
    });
  } catch (error: any) {
    console.error("Error disabling sales tax:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to disable sales tax",
    });
  }
};

export default {
  getTaxes,
  getTax,
  getTaxAssociatedRecords,
  createTax,
  createTaxesBulk,
  updateTax,
  deleteTax,
  disableSalesTax,
};
