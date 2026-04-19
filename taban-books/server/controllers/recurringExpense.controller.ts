/**
 * Recurring Expense Controller
 * Handles Recurring Expenses
 */

import { Request, Response } from "express";
import RecurringExpense from "../models/RecurringExpense.js";
import Expense from "../models/Expense.js";
import ChartOfAccount from "../models/ChartOfAccount.js";
import BankAccount from "../models/BankAccount.js";
import _mongoose from "mongoose";

interface AuthRequest extends Request {
    user?: {
        userId: string;
        organizationId: string;
        role: string;
        email?: string;
    };
}

const buildRecurringExpenseIdFilter = (id: string) => {
    const orConditions: any[] = [{ recurring_expense_id: id }];
    if (_mongoose.Types.ObjectId.isValid(id)) {
        orConditions.unshift({ _id: id });
    }
    return orConditions.length === 1 ? orConditions[0] : { $or: orConditions };
};

/**
 * Create a Recurring Expense
 * POST /recurring-expenses
 */
export const createRecurringExpense = async (req: AuthRequest, res: Response): Promise<void> => {
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
            profile_name,
            repeat_every,
            start_date,
            account_id,
            account_name,
            amount,
            paid_through_account_id,
            paid_through_account_name,
            ...otherFields
        } = req.body;

        // Validate required fields
        if (!profile_name || !repeat_every || !start_date || (!account_id && !account_name) || amount === undefined || (!paid_through_account_id && !paid_through_account_name)) {
            res.status(400).json({
                code: 1,
                message: "Missing required fields: profile_name, repeat_every, start_date, account_id, amount, paid_through_account_id"
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
            account = await ChartOfAccount.findOne({
                accountName: { $regex: new RegExp(`^${account_name}$`, "i") },
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

        // Find or lookup paid through account
        let paidThroughAccount;
        if (paid_through_account_id) {
            // First try to find in BankAccount (if separated) or fallback to logic if they are in same collection or handled same way
            // Assuming paid_through_account is also a ChartOfAccount or BankAccount. 
            // Based on Expense controller, it seems to look up similar to regular account but usually is Bank/Cash/etc.
            // Let's assume ChartOfAccount for simplicity if BankAccount is just a type of Account, or check both.
            // But the previous code imported BankAccount model. Let's start with ChartOfAccount as generic.
            paidThroughAccount = await ChartOfAccount.findOne({
                _id: paid_through_account_id,
                organization: orgId
            });
            if (!paidThroughAccount) {
                // Try BankAccount model if exists and distinct
                paidThroughAccount = await BankAccount.findOne({
                    _id: paid_through_account_id,
                    organization: orgId
                });
            }
        } else if (paid_through_account_name) {
            paidThroughAccount = await ChartOfAccount.findOne({
                accountName: { $regex: new RegExp(`^${paid_through_account_name}$`, "i") },
                organization: orgId
            });
        }

        if (!paidThroughAccount) {
            res.status(400).json({
                code: 1,
                message: `Invalid paid through account: ${paid_through_account_name || paid_through_account_id} not found`
            });
            return;
        }

        // Create recurring expense
        const newRecurringExpense = new RecurringExpense({
            organization: orgId,
            profile_name,
            repeat_every,
            start_date,
            account_id: account._id,
            account_name: account.accountName,
            paid_through_account_id: paidThroughAccount._id,
            paid_through_account_name: paidThroughAccount.accountName || (paidThroughAccount as any).bankName || (paidThroughAccount as any).name,
            amount,
            ...otherFields
        });

        await newRecurringExpense.save();

        res.status(201).json({
            code: 0,
            message: "Recurring expense created successfully",
            recurring_expense: newRecurringExpense
        });

    } catch (error: any) {
        console.error("Error creating recurring expense:", error);
        res.status(500).json({
            code: 1,
            message: "Error creating recurring expense",
            error: error.message
        });
    }
};

/**
 * List Recurring Expenses
 * GET /recurring-expenses
 */
export const listRecurringExpenses = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.user || !req.user.organizationId) {
            res.status(401).json({
                code: 1,
                message: "Unauthorized - Organization ID required"
            });
            return;
        }

        const orgId = req.user.organizationId;
        const { page = "1", per_page = "200", sort_column = "created_time", sort_order = "desc", search_text, status } = req.query;

        const pageNum = parseInt(page as string);
        const perPage = parseInt(per_page as string);
        const skip = (pageNum - 1) * perPage;

        const query: any = { organization: orgId };

        if (status && status !== 'All') {
            query.status = (status as string).toLowerCase(); // active, stopped, expired
        }

        if (search_text) {
            query.$or = [
                { profile_name: { $regex: search_text, $options: "i" } },
                { account_name: { $regex: search_text, $options: "i" } },
                { vendor_name: { $regex: search_text, $options: "i" } }
            ];
        }

        const sort: any = {};
        sort[sort_column as string] = sort_order === "asc" ? 1 : -1;

        const recurringExpenses = await RecurringExpense.find(query)
            .sort(sort)
            .skip(skip)
            .limit(perPage)
            .lean();

        const total = await RecurringExpense.countDocuments(query);

        res.json({
            code: 0,
            message: "success",
            recurring_expenses: recurringExpenses.map(e => ({
                ...e,
                id: e._id, // Frontend often expects 'id'
                recurring_expense_id: e.recurring_expense_id || e._id
            })),
            page_context: {
                page: pageNum,
                per_page: perPage,
                total_pages: Math.ceil(total / perPage),
                total_items: total
            }
        });
    } catch (error: any) {
        console.error("Error listing recurring expenses:", error);
        res.status(500).json({
            code: 1,
            message: "Error fetching recurring expenses",
            error: error.message
        });
    }
};

/**
 * Get Recurring Expense By ID
 * GET /recurring-expenses/:id
 */
export const getRecurringExpense = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.user || !req.user.organizationId) {
            res.status(401).json({
                code: 1,
                message: "Unauthorized"
            });
            return;
        }

        const { id } = req.params;
        const idFilter = buildRecurringExpenseIdFilter(id);
        const expense = await RecurringExpense.findOne({ organization: req.user.organizationId, ...idFilter });

        if (!expense) {
            res.status(404).json({ code: 1, message: "Recurring expense not found" });
            return;
        }

        res.json({
            code: 0,
            message: "success",
            recurring_expense: expense
        });

    } catch (error: any) {
        res.status(500).json({ code: 1, message: error.message });
    }
};

/**
 * Update Recurring Expense
 * PUT /recurring-expenses/:id
 */
export const updateRecurringExpense = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.user || !req.user.organizationId) {
            res.status(401).json({ code: 1, message: "Unauthorized" });
            return;
        }

        const { id } = req.params;
        const updates = req.body;
        const idFilter = buildRecurringExpenseIdFilter(id);
        const expense = await RecurringExpense.findOne({ organization: req.user.organizationId, ...idFilter });
        if (!expense) {
            res.status(404).json({ code: 1, message: "Recurring expense not found" });
            return;
        }

        Object.assign(expense, updates);
        await expense.save();

        res.json({
            code: 0,
            message: "Recurring expense updated successfully",
            recurring_expense: expense
        });

    } catch (error: any) {
        res.status(500).json({ code: 1, message: error.message });
    }
};

/**
 * Delete Recurring Expense
 * DELETE /recurring-expenses/:id
 */
export const deleteRecurringExpense = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.user || !req.user.organizationId) {
            res.status(401).json({ code: 1, message: "Unauthorized" });
            return;
        }

        const { id } = req.params;
        const idFilter = buildRecurringExpenseIdFilter(id);
        const result = await RecurringExpense.deleteOne({ organization: req.user.organizationId, ...idFilter });

        if (result.deletedCount === 0) {
            res.status(404).json({ code: 1, message: "Recurring expense not found" });
            return;
        }

        res.json({
            code: 0,
            message: "Recurring expense deleted successfully"
        });

    } catch (error: any) {
        res.status(500).json({ code: 1, message: error.message });
    }
};

/**
 * Stop/Resume Recurring Expense
 * POST /recurring-expenses/:id/status
 * Body: { status: 'active' | 'stopped' }
 */
export const updateRecurringExpenseStatus = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.user || !req.user.organizationId) {
            res.status(401).json({ code: 1, message: "Unauthorized" });
            return;
        }

        const { id } = req.params;
        const { status } = req.body;

        if (!['active', 'stopped'].includes(status)) {
            res.status(400).json({ code: 1, message: "Invalid status. Use 'active' or 'stopped'" });
            return;
        }

        const idFilter = buildRecurringExpenseIdFilter(id);
        const expense = await RecurringExpense.findOneAndUpdate(
            { organization: req.user.organizationId, ...idFilter },
            { status: status },
            { new: true }
        );

        if (!expense) {
            res.status(404).json({ code: 1, message: "Recurring expense not found" });
            return;
        }

        res.json({
            code: 0,
            message: `Recurring expense ${status === 'active' ? 'resumed' : 'stopped'} successfully`,
            recurring_expense: expense
        });

    } catch (error: any) {
        res.status(500).json({ code: 1, message: error.message });
    }
};

/**
 * Generate Expense from Recurring Profile
 * POST /recurring-expenses/:id/generate-expense
 */
export const generateExpenseFromRecurring = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.user || !req.user.organizationId) {
            res.status(401).json({ code: 1, message: "Unauthorized" });
            return;
        }

        const { id } = req.params;
        const idFilter = buildRecurringExpenseIdFilter(id);
        const recurringExpense = await RecurringExpense.findOne({ organization: req.user.organizationId, ...idFilter });

        if (!recurringExpense) {
            res.status(404).json({ code: 1, message: "Recurring expense not found" });
            return;
        }

        // Create actual expense from template
        const expenseData = {
            organization: req.user.organizationId,
            date: new Date(),
            account_id: recurringExpense.account_id,
            amount: recurringExpense.amount,
            paid_through_account_id: recurringExpense.paid_through_account_id,
            vendor_id: recurringExpense.vendor_id,
            customer_id: recurringExpense.customer_id,
            project_id: recurringExpense.project_id,
            currency_code: recurringExpense.currency_code || 'USD',
            description: recurringExpense.description,
            is_billable: recurringExpense.is_billable,
            is_personal: recurringExpense.is_personal,
            recurring_expense_id: recurringExpense._id,
            status: recurringExpense.is_billable ? 'billable' : 'non-billable'
        };

        const newExpense = new Expense(expenseData);
        await newExpense.save();

        // Update recurring expense dates
        recurringExpense.last_created_date = new Date();

        // Calculate next date
        const nextDate = new Date(recurringExpense.next_expense_date || recurringExpense.start_date);
        switch (recurringExpense.repeat_every) {
            case 'Week': nextDate.setDate(nextDate.getDate() + 7); break;
            case '2 Weeks': nextDate.setDate(nextDate.getDate() + 14); break;
            case 'Month': nextDate.setMonth(nextDate.getMonth() + 1); break;
            case '2 Months': nextDate.setMonth(nextDate.getMonth() + 2); break;
            case '3 Months': nextDate.setMonth(nextDate.getMonth() + 3); break;
            case '6 Months': nextDate.setMonth(nextDate.getMonth() + 6); break;
            case 'Year': nextDate.setFullYear(nextDate.getFullYear() + 1); break;
            case '2 Years': nextDate.setFullYear(nextDate.getFullYear() + 2); break;
            case '3 Years': nextDate.setFullYear(nextDate.getFullYear() + 3); break;
            default: nextDate.setMonth(nextDate.getMonth() + 1);
        }
        recurringExpense.next_expense_date = nextDate;

        await recurringExpense.save();

        res.json({
            code: 0,
            success: true,
            message: "Expense generated successfully",
            data: newExpense
        });

    } catch (error: any) {
        console.error("Error generating expense from recurring:", error);
        res.status(500).json({ code: 1, message: error.message });
    }
};
