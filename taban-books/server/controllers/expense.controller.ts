/**
 * Expense Controller
 * Handles Expenses based on OpenAPI spec
 */

import { Request, Response } from "express";
import Expense from "../models/Expense.js";
import ChartOfAccount from "../models/ChartOfAccount.js";
import BankAccount from "../models/BankAccount.js";
import Customer from "../models/Customer.js";
import Vendor from "../models/Vendor.js";
import Project from "../models/Project.js";
import Tax from "../models/Tax.js";
import Currency from "../models/Currency.js";
import JournalEntry from "../models/JournalEntry.js";
import _mongoose from "mongoose";
import { generateExpenseNumber, generateJournalEntryNumber } from "../utils/numberSeries.js";
import { resolveOrganizationBankAccount, syncLinkedBankTransaction } from "../utils/bankTransactionSync.js";

interface AuthRequest extends Request {
  user?: {
    userId: string;
    organizationId: string;
    role: string;
    email?: string;
  };
}

const normalizeText = (value: any): string => String(value ?? "").trim();
const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

interface ExpenseQuery {
  page?: string;
  per_page?: string;
  description?: string;
  reference_number?: string;
  date?: string;
  status?: string;
  amount?: string;
  account_name?: string;
  customer_name?: string;
  vendor_name?: string;
  customer_id?: string;
  vendor_id?: string;
  recurring_expense_id?: string;
  paid_through_account_id?: string;
  search_text?: string;
  sort_column?: string;
  filter_by?: string;
}

const syncExpenseBankHistory = async (
  organizationId: string,
  expense: any,
  shouldSync = true,
) => {
  await syncLinkedBankTransaction({
    organizationId,
    transactionKey: `expense:${expense._id}`,
    source: "expense",
    accountCandidates: [expense.paid_through_account_id, expense.paid_through_account_name],
    amount: shouldSync ? expense.amount : 0,
    date: expense.date,
    referenceNumber: expense.reference_number || expense.expense_id,
    description: expense.description,
    transactionType: "expense",
    debitOrCredit: "debit",
    shouldSync,
    vendorId: expense.vendor_id,
    vendorName: expense.vendor_name,
    fallbackDescription: `Expense ${expense.reference_number || expense.expense_id || expense._id}`,
  });
};

/**
 * Create an Expense
 * POST /expenses
 */
export const createExpense = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.organizationId) {
      res.status(401).json({
        code: 1,
        message: "Unauthorized - Organization ID required"
      });
      return;
    }

    const orgId = req.user.organizationId;
    const {
      date,
      account_id,
      account_name,
      amount,
      paid_through_account_id,
      paid_through_account_name,
      ...otherFields
    } = req.body;

    // Validate required fields
    if (!date || (!account_id && !account_name) || amount === undefined || (!paid_through_account_id && !paid_through_account_name)) {
      res.status(400).json({
        code: 1,
        message: "Missing required fields: Invalid date, account_id, amount, paid_through_account_id"
      });
      return;
    }

    // Find or lookup account by ID or name
    let account;
    if (account_id) {
      account = await ChartOfAccount.findOne({
        _id: account_id,
        organization: orgId
      });
    } else if (account_name) {
      const normalizedAccountName = normalizeText(account_name);
      const exactAccountNameRegex = new RegExp(`^${escapeRegex(normalizedAccountName)}$`, "i");
      account = await ChartOfAccount.findOne({
        accountName: exactAccountNameRegex,
        organization: orgId
      });
    }

    if (!account) {
      res.status(400).json({
        code: 1,
        message: `Invalid account: ${account_name || account_id} not found`
      });
      return;
    }

    // Find or lookup paid through account by ID or name
    let paidThroughAccount = await resolveOrganizationBankAccount(orgId, [
      paid_through_account_id,
      paid_through_account_name,
    ]);

    if (!paidThroughAccount && paid_through_account_id) {
      paidThroughAccount = await BankAccount.findOne({
        _id: paid_through_account_id,
        organization: orgId
      });

      // If not found in BankAccount, try ChartOfAccount
      if (!paidThroughAccount) {
        paidThroughAccount = await ChartOfAccount.findOne({
          _id: paid_through_account_id,
          organization: orgId
        });
      }
    } else if (!paidThroughAccount && paid_through_account_name) {
      const normalizedPaidThroughName = normalizeText(paid_through_account_name);
      const exactPaidThroughNameRegex = new RegExp(`^${escapeRegex(normalizedPaidThroughName)}$`, "i");
      paidThroughAccount = await BankAccount.findOne({
        accountName: exactPaidThroughNameRegex,
        organization: orgId
      });

      // If not found in BankAccount, try ChartOfAccount
      if (!paidThroughAccount) {
        paidThroughAccount = await ChartOfAccount.findOne({
          accountName: exactPaidThroughNameRegex,
          organization: orgId
        });
      }
    }

    if (!paidThroughAccount) {
      res.status(400).json({
        code: 1,
        message: `Invalid paid through account: ${paid_through_account_name || paid_through_account_id} not found`
      });
      return;
    }

    // Build expense data
    const expenseData: any = {
      organization: orgId,
      date: new Date(date),
      account_id: account._id,
      amount: parseFloat(amount),
      paid_through_account_id: paidThroughAccount._id,
      account_name: account.accountName,
      paid_through_account_name: paidThroughAccount.accountName,
      ...otherFields
    };

    // Populate customer name if provided
    if (otherFields.customer_id) {
      const customer = await Customer.findOne({
        _id: otherFields.customer_id,
        organization: orgId
      });
      if (customer) {
        expenseData.customer_name = customer.displayName || customer.name;
      }
    }

    // Populate vendor name if provided
    if (otherFields.vendor_id) {
      const vendor = await Vendor.findOne({
        _id: otherFields.vendor_id,
        organization: orgId
      });
      if (vendor) {
        expenseData.vendor_name = vendor.displayName || vendor.name;
      }
    }

    // Populate project name if provided
    if (otherFields.project_id) {
      const project = await Project.findOne({
        _id: otherFields.project_id,
        organization: orgId
      });
      if (project) {
        expenseData.project_name = project.name;
      }
    }

    // Populate tax information if provided
    if (otherFields.tax_id) {
      const tax = await Tax.findOne({
        _id: otherFields.tax_id,
        organization: orgId
      });
      if (tax) {
        expenseData.tax_name = tax.name;
        expenseData.tax_percentage = tax.rate;
        if (!expenseData.tax_amount && expenseData.amount) {
          expenseData.tax_amount = expenseData.is_inclusive_tax
            ? (expenseData.amount * tax.rate) / (100 + tax.rate)
            : (expenseData.amount * tax.rate) / 100;
        }
      }
    }

    // Populate currency code if provided
    if (otherFields.currency_id) {
      const currency = await Currency.findOne({
        _id: otherFields.currency_id,
        organization: orgId
      });
      if (currency) {
        expenseData.currency_code = currency.code;
      }
    }

    // Set default status
    if (!expenseData.status) {
      expenseData.status = expenseData.is_billable ? "unbilled" : "non-billable";
    }

    // Generate expense number if not provided
    if (!expenseData.reference_number) {
      expenseData.reference_number = await generateExpenseNumber(orgId);
    }

    const expense = await Expense.create(expenseData);

    // Create Journal Entry
    try {
      const { createJournalEntryForExpense } = await import("../utils/expenseAccounting.js");
      const journalEntry = await createJournalEntryForExpense(expense, orgId);

      // Link Journal Entry to Expense
      expense.journalEntryId = journalEntry._id as any;
      await expense.save();

    } catch (jeError: any) {
      console.error("Failed to create journal entry for expense:", jeError);
      // We log but don't fail the request, as the expense itself was created
    }

    await syncExpenseBankHistory(orgId, expense);

    res.status(200).json({
      code: 0,
      message: "The expense has been recorded.",
      expense: expense.toObject()
    });
  } catch (error: any) {
    console.error("Error in createExpense:", error);
    res.status(500).json({
      code: 1,
      message: `Error creating expense: ${error instanceof Error ? error.message : String(error)}`,
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * List Expenses
 * GET /expenses
 */
export const listExpenses = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.organizationId) {
      res.status(401).json({
        code: 1,
        message: "Unauthorized - Organization ID required"
      });
      return;
    }

    const orgId = req.user.organizationId;
    const {
      page = "1",
      per_page = "200",
      description,
      reference_number,
      date,
      status,
      amount,
      account_name,
      customer_name,
      vendor_name,
      customer_id,
      vendor_id,
      recurring_expense_id,
      paid_through_account_id,
      search_text,
      sort_column = "date",
      filter_by
    } = req.query as ExpenseQuery;

    // Build query
    const query: any = { organization: orgId };

    // Status filter
    if (filter_by) {
      const statusMap: any = {
        "Status.All": {},
        "Status.Billable": { is_billable: true },
        "Status.Nonbillable": { is_billable: false },
        "Status.Reimbursed": { status: "reimbursed" },
        "Status.Invoiced": { status: "invoiced" },
        "Status.Unbilled": { status: "unbilled" }
      };
      if (statusMap[filter_by]) {
        Object.assign(query, statusMap[filter_by]);
      }
    }

    if (status) {
      query.status = status;
    }

    // Description filter - handle variants (description, description_startswith, description_contains)
    if (description) {
      query.description = { $regex: description, $options: "i" };
    }
    if (req.query.description_startswith) {
      query.description = { $regex: `^${req.query.description_startswith}`, $options: "i" };
    }
    if (req.query.description_contains) {
      query.description = { $regex: req.query.description_contains, $options: "i" };
    }

    // Reference number filter - handle variants
    if (reference_number) {
      query.reference_number = { $regex: reference_number, $options: "i" };
    }
    if (req.query.reference_number_startswith) {
      query.reference_number = { $regex: `^${req.query.reference_number_startswith}`, $options: "i" };
    }
    if (req.query.reference_number_contains) {
      query.reference_number = { $regex: req.query.reference_number_contains, $options: "i" };
    }

    // Date filter - handle variants (date, date_start, date_end, date_before, date_after)
    if (req.query.date_start || req.query.date_end || req.query.date_before || req.query.date_after) {
      query.date = {};
      if (req.query.date_start) {
        query.date.$gte = new Date(req.query.date_start as string);
      }
      if (req.query.date_end) {
        query.date.$lte = new Date(req.query.date_end as string);
      }
      if (req.query.date_before) {
        query.date.$lt = new Date(req.query.date_before as string);
      }
      if (req.query.date_after) {
        query.date.$gt = new Date(req.query.date_after as string);
      }
    } else if (date) {
      query.date = new Date(date);
    }

    // Amount filter - handle variants
    if (req.query.amount_less_than || req.query.amount_less_equals || req.query.amount_greater_than) {
      query.amount = {};
      if (req.query.amount_less_than) {
        query.amount.$lt = parseFloat(req.query.amount_less_than as string);
      }
      if (req.query.amount_less_equals) {
        query.amount.$lte = parseFloat(req.query.amount_less_equals as string);
      }
      if (req.query.amount_greater_than) {
        query.amount.$gt = parseFloat(req.query.amount_greater_than as string);
      }
    } else if (amount) {
      const amountValue = parseFloat(amount);
      query.amount = amountValue;
    }

    // Amount filter
    if (amount) {
      const amountValue = parseFloat(amount);
      query.amount = amountValue;
    }

    // Account name filter - handle variants
    if (account_name || req.query.account_name_startswith || req.query.account_name_contains) {
      let accountRegex = account_name;
      if (req.query.account_name_startswith) {
        accountRegex = req.query.account_name_startswith as string;
      } else if (req.query.account_name_contains) {
        accountRegex = req.query.account_name_contains as string;
      }
      if (accountRegex) {
        const regexPattern = req.query.account_name_startswith
          ? `^${accountRegex}`
          : accountRegex;
        const accounts = await ChartOfAccount.find({
          organization: orgId,
          accountName: { $regex: regexPattern, $options: "i" }
        }).select("_id");
        if (accounts.length > 0) {
          query.account_id = { $in: accounts.map(a => a._id) };
        } else {
          // No matching accounts, return empty result
          query.account_id = { $in: [] };
        }
      }
    }

    // Customer filter - handle variants
    if (customer_id) {
      query.customer_id = customer_id;
    } else if (customer_name || req.query.customer_name_startswith || req.query.customer_name_contains) {
      let customerRegex = customer_name;
      if (req.query.customer_name_startswith) {
        customerRegex = req.query.customer_name_startswith as string;
      } else if (req.query.customer_name_contains) {
        customerRegex = req.query.customer_name_contains as string;
      }
      if (customerRegex) {
        const regexPattern = req.query.customer_name_startswith
          ? `^${customerRegex}`
          : customerRegex;
        const customers = await Customer.find({
          organization: orgId,
          $or: [
            { displayName: { $regex: regexPattern, $options: "i" } },
            { name: { $regex: regexPattern, $options: "i" } }
          ]
        }).select("_id");
        if (customers.length > 0) {
          query.customer_id = { $in: customers.map(c => c._id) };
        } else {
          query.customer_id = { $in: [] };
        }
      }
    }

    // Vendor filter - handle variants
    if (vendor_id) {
      query.vendor_id = vendor_id;
    } else if (vendor_name || req.query.vendor_name_startswith || req.query.vendor_name_contains) {
      let vendorRegex = vendor_name;
      if (req.query.vendor_name_startswith) {
        vendorRegex = req.query.vendor_name_startswith as string;
      } else if (req.query.vendor_name_contains) {
        vendorRegex = req.query.vendor_name_contains as string;
      }
      if (vendorRegex) {
        const regexPattern = req.query.vendor_name_startswith
          ? `^${vendorRegex}`
          : vendorRegex;
        const vendors = await Vendor.find({
          organization: orgId,
          $or: [
            { displayName: { $regex: regexPattern, $options: "i" } },
            { name: { $regex: regexPattern, $options: "i" } }
          ]
        }).select("_id");
        if (vendors.length > 0) {
          query.vendor_id = { $in: vendors.map(v => v._id) };
        } else {
          query.vendor_id = { $in: [] };
        }
      }
    }

    if (recurring_expense_id) {
      query.recurring_expense_id = recurring_expense_id;
    }

    if (paid_through_account_id) {
      query.paid_through_account_id = paid_through_account_id;
    }

    // Search text
    if (search_text) {
      const searchRegex = { $regex: search_text, $options: "i" };
      const accounts = await ChartOfAccount.find({
        organization: orgId,
        accountName: searchRegex
      }).select("_id");
      const customers = await Customer.find({
        organization: orgId,
        $or: [
          { displayName: searchRegex },
          { name: searchRegex }
        ]
      }).select("_id");
      const vendors = await Vendor.find({
        organization: orgId,
        $or: [
          { displayName: searchRegex },
          { name: searchRegex }
        ]
      }).select("_id");

      query.$or = [
        { description: searchRegex },
        { account_id: { $in: accounts.map(a => a._id) } },
        { customer_id: { $in: customers.map(c => c._id) } },
        { vendor_id: { $in: vendors.map(v => v._id) } }
      ];
    }

    // Sort
    const validSortColumns = ["date", "account_name", "total", "bcy_total", "reference_number", "customer_name", "created_time"];
    const sortBy = validSortColumns.includes(sort_column) ? sort_column : "date";
    const sort: any = {};

    if (sortBy === "created_time") {
      sort.createdAt = -1;
    } else if (sortBy === "account_name") {
      sort.account_name = 1;
    } else {
      sort[sortBy] = -1;
    }

    // Pagination
    const pageNum = Math.max(1, parseInt(page));
    const perPage = Math.max(1, Math.min(200, parseInt(per_page)));
    const skip = (pageNum - 1) * perPage;

    const expenses = await Expense.find(query)
      .sort(sort)
      .skip(skip)
      .limit(perPage)
      .lean();

    // const _total = await Expense.countDocuments(query);

    res.json({
      code: 0,
      message: "success",
      expenses: expenses.map(e => ({
        expense_id: e._id.toString(),
        date: e.date,
        account_name: e.account_name,
        description: e.description,
        currency_id: e.currency_id,
        currency_code: e.currency_code,
        bcy_total: e.bcy_total || e.total,
        bcy_total_without_tax: e.bcy_total_without_tax || e.total_without_tax,
        total: e.total,
        total_without_tax: e.total_without_tax,
        is_billable: e.is_billable,
        reference_number: e.reference_number,
        customer_id: e.customer_id,
        customer_name: e.customer_name,
        status: e.status,
        location_id: e.location_id,
        location_name: e.location_name,
        created_time: e.created_time || e.createdAt,
        last_modified_time: e.last_modified_time || e.updatedAt,
        expense_receipt_name: e.expense_receipt_name,
        mileage_rate: e.mileage_rate,
        mileage_unit: e.mileage_unit,
        expense_type: e.expense_type,
        start_reading: e.start_reading,
        end_reading: e.end_reading,
        vendor_name: e.vendor_name,
        vendor_id: e.vendor_id,
        paid_through_account_name: e.paid_through_account_name,
        paid_through_account_id: e.paid_through_account_id
      })),
      page_context: [{
        sort_column: sortBy,
        filter_by: filter_by || "Status.All",
        search_text: search_text || "",
        applied_filter: filter_by || "Status.All",
        page: pageNum.toString(),
        per_page: perPage.toString()
      }]
    });
  } catch (error: any) {
    console.error("Error in listExpenses:", error);
    res.status(500).json({
      code: 1,
      message: "Error fetching expenses",
      error: error.message
    });
  }
};

/**
 * Get an Expense
 * GET /expenses/:expense_id
 */
export const getExpense = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.organizationId) {
      res.status(401).json({
        code: 1,
        message: "Unauthorized - Organization ID required"
      });
      return;
    }

    const { expense_id } = req.params;
    const orgId = req.user.organizationId;

    const expense = await Expense.findOne({
      $or: [{ _id: expense_id }, { expense_id }],
      organization: orgId
    })
      .populate("account_id", "accountName accountCode")
      .populate("paid_through_account_id", "accountName")
      .populate("customer_id", "displayName name")
      .populate("vendor_id", "displayName name")
      .populate("project_id", "name")
      .populate("tax_id", "name rate")
      .lean();

    if (!expense) {
      res.status(404).json({
        code: 1,
        message: "Expense not found"
      });
      return;
    }

    res.json({
      code: 0,
      message: "success",
      expense: expense
    });
  } catch (error: any) {
    console.error("Error in getExpense:", error);
    res.status(500).json({
      code: 1,
      message: "Error fetching expense",
      error: error.message
    });
  }
};

/**
 * Update an Expense
 * PUT /expenses/:expense_id
 */
export const updateExpense = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.organizationId) {
      res.status(401).json({
        code: 1,
        message: "Unauthorized - Organization ID required"
      });
      return;
    }

    const { expense_id } = req.params;
    const orgId = req.user.organizationId;
    const updateData: any = { ...req.body };

    // Find existing expense
    const existingExpense = await Expense.findOne({
      $or: [{ _id: expense_id }, { expense_id }],
      organization: orgId
    });

    if (!existingExpense) {
      res.status(404).json({
        code: 1,
        message: "Expense not found"
      });
      return;
    }

    // Update populated fields if IDs changed
    if (updateData.account_id) {
      const account = await ChartOfAccount.findOne({
        _id: updateData.account_id,
        organization: orgId
      });
      if (account) {
        updateData.account_name = account.accountName;
      }
    }

    if (updateData.paid_through_account_id || updateData.paid_through_account_name) {
      const resolvedPaidThroughAccount = await resolveOrganizationBankAccount(orgId, [
        updateData.paid_through_account_id,
        updateData.paid_through_account_name,
      ]);

      if (resolvedPaidThroughAccount) {
        updateData.paid_through_account_id = resolvedPaidThroughAccount._id;
        updateData.paid_through_account_name = resolvedPaidThroughAccount.accountName;
      } else if (updateData.paid_through_account_id) {
        const paidThroughAccount = await BankAccount.findOne({
          _id: updateData.paid_through_account_id,
          organization: orgId
        });
        if (paidThroughAccount) {
          updateData.paid_through_account_name = paidThroughAccount.accountName;
        }
      }
    }

    if (updateData.customer_id) {
      const customer = await Customer.findOne({
        _id: updateData.customer_id,
        organization: orgId
      });
      if (customer) {
        updateData.customer_name = customer.displayName || customer.name;
      }
    }

    if (updateData.vendor_id) {
      const vendor = await Vendor.findOne({
        _id: updateData.vendor_id,
        organization: orgId
      });
      if (vendor) {
        updateData.vendor_name = vendor.displayName || vendor.name;
      }
    }

    if (updateData.project_id) {
      const project = await Project.findOne({
        _id: updateData.project_id,
        organization: orgId
      });
      if (project) {
        updateData.project_name = project.name;
      }
    }

    if (updateData.tax_id) {
      const tax = await Tax.findOne({
        _id: updateData.tax_id,
        organization: orgId
      });
      if (tax) {
        updateData.tax_name = tax.name;
        updateData.tax_percentage = tax.rate;
        if (updateData.amount) {
          updateData.tax_amount = updateData.is_inclusive_tax
            ? (updateData.amount * tax.rate) / (100 + tax.rate)
            : (updateData.amount * tax.rate) / 100;
        }
      }
    }

    if (updateData.currency_id) {
      const currency = await Currency.findOne({
        _id: updateData.currency_id,
        organization: orgId
      });
      if (currency) {
        updateData.currency_code = currency.code;
      }
    }

    // Update date if provided
    if (updateData.date) {
      updateData.date = new Date(updateData.date);
    }

    if (typeof updateData.is_billable === "boolean" && !updateData.status) {
      updateData.status = updateData.is_billable ? "unbilled" : "non-billable";
    }

    updateData.last_modified_time = new Date();

    const expense = await Expense.findOneAndUpdate(
      {
        $or: [{ _id: expense_id }, { expense_id }],
        organization: orgId
      },
      updateData,
      { new: true, runValidators: true }
    ).lean();

    if (!expense) {
      res.status(404).json({
        code: 1,
        message: "Expense not found"
      });
      return;
    }

    await syncExpenseBankHistory(orgId, expense);

    res.json({
      code: 0,
      message: "Expense information has been updated.",
      expense: expense
    });
  } catch (error: any) {
    console.error("Error in updateExpense:", error);
    res.status(500).json({
      code: 1,
      message: "Error updating expense",
      error: error.message
    });
  }
};

/**
 * Delete an Expense
 * DELETE /expenses/:expense_id
 */
export const deleteExpense = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.organizationId) {
      res.status(401).json({
        code: 1,
        message: "Unauthorized - Organization ID required"
      });
      return;
    }

    const { expense_id } = req.params;
    const orgId = req.user.organizationId;

    const expense = await Expense.findOneAndDelete({
      $or: [{ _id: expense_id }, { expense_id }],
      organization: orgId
    });

    if (!expense) {
      res.status(404).json({
        code: 1,
        message: "Expense not found"
      });
      return;
    }

    await syncExpenseBankHistory(orgId, expense, false);

    res.json({
      code: 0,
      message: "The expense has been deleted."
    });
  } catch (error: any) {
    console.error("Error in deleteExpense:", error);
    res.status(500).json({
      code: 1,
      message: "Error deleting expense",
      error: error.message
    });
  }
};

/**
 * List expense comments/history
 * GET /expenses/:expense_id/comments
 */
export const listExpenseComments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.organizationId) {
      res.status(401).json({
        code: 1,
        message: "Unauthorized - Organization ID required"
      });
      return;
    }

    const { expense_id } = req.params;
    const orgId = req.user.organizationId;

    const expense = await Expense.findOne({
      $or: [{ _id: expense_id }, { expense_id }],
      organization: orgId
    });

    if (!expense) {
      res.status(404).json({
        code: 1,
        message: "Expense not found"
      });
      return;
    }

    const comments = Array.isArray((expense as any).comments)
      ? (expense as any).comments
      : [];

    res.json({
      code: 0,
      message: "success",
      comments
    });
  } catch (error: any) {
    console.error("Error in listExpenseComments:", error);
    res.status(500).json({
      code: 1,
      message: "Error fetching expense comments",
      error: error.message
    });
  }
};
