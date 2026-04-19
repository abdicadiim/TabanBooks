/**
 * Recurring Bill Controller
 * Handles Recurring Bills
 */

import { Request, Response } from "express";
import RecurringBill from "../models/RecurringBill.js";
import Bill from "../models/Bill.js";
import Vendor from "../models/Vendor.js";
import mongoose from "mongoose";

interface AuthRequest extends Request {
    user?: {
        userId: string;
        organizationId: string;
        role: string;
        email?: string;
    };
}

/**
 * Create a Recurring Bill
 * POST /recurring-bills
 */
export const createRecurringBill = async (req: AuthRequest, res: Response): Promise<void> => {
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
            vendor,
            vendor_name,
            amount, // some payloads might send amount or total
            total,
            items,
            ...otherFields
        } = req.body;

        // Validate required fields
        if (!profile_name || !repeat_every || !start_date || (!vendor && !vendor_name) || (total === undefined && amount === undefined)) {
            res.status(400).json({
                code: 1,
                message: "Missing required fields: profile_name, repeat_every, start_date, vendor, total/amount"
            });
            return;
        }

        let vendorId = vendor;
        let vendorName = vendor_name;

        // Find vendor if only name provided or vice versa
        if (vendorId) {
            const v = await Vendor.findOne({ _id: vendorId, organization: orgId });
            if (v) vendorName = v.displayName || v.companyName;
        } else if (vendorName) {
            const v = await Vendor.findOne({
                $or: [{ displayName: vendorName }, { companyName: vendorName }],
                organization: orgId
            });
            if (v) {
                vendorId = v._id;
            } else {
                // Option: create vendor? For now error.
                res.status(400).json({ code: 1, message: "Vendor not found" });
                return;
            }
        }

        const finalTotal = total !== undefined ? total : amount;

        const newRecurringBill = new RecurringBill({
            organization: orgId,
            profile_name,
            repeat_every,
            start_date,
            vendor: vendorId,
            vendor_name: vendorName,
            total: finalTotal,
            items: items || [],
            ...otherFields
        });

        await newRecurringBill.save();

        res.status(201).json({
            code: 0,
            message: "Recurring bill created successfully",
            recurring_bill: newRecurringBill
        });

    } catch (error: any) {
        console.error("Error creating recurring bill:", error);
        res.status(500).json({
            code: 1,
            message: "Error creating recurring bill",
            error: error.message
        });
    }
};

/**
 * List Recurring Bills
 * GET /recurring-bills
 */
export const listRecurringBills = async (req: AuthRequest, res: Response): Promise<void> => {
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
            query.status = (status as string).toLowerCase();
        }

        if (search_text) {
            query.$or = [
                { profile_name: { $regex: search_text, $options: "i" } },
                { vendor_name: { $regex: search_text, $options: "i" } }
            ];
        }

        const sort: any = {};
        // Map created_time to createdAt if needed, but schema has createdAt
        const sortField = sort_column === "created_time" ? "createdAt" : sort_column;
        sort[sortField as string] = sort_order === "asc" ? 1 : -1;

        const recurringBills = await RecurringBill.find(query)
            .sort(sort)
            .skip(skip)
            .limit(perPage)
            .lean();

        const total = await RecurringBill.countDocuments(query);

        res.json({
            code: 0,
            message: "success",
            recurring_bills: recurringBills.map(b => ({
                ...b,
                id: b._id,
                recurring_bill_id: b.recurring_bill_id || b._id
            })),
            page_context: {
                page: pageNum,
                per_page: perPage,
                total_pages: Math.ceil(total / perPage),
                total_items: total
            }
        });
    } catch (error: any) {
        console.error("Error listing recurring bills:", error);
        res.status(500).json({
            code: 1,
            message: "Error fetching recurring bills",
            error: error.message
        });
    }
};

/**
 * Get Recurring Bill By ID
 * GET /recurring-bills/:id
 */
export const getRecurringBill = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.user || !req.user.organizationId) {
            res.status(401).json({ code: 1, message: "Unauthorized" });
            return;
        }

        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            res.status(400).json({ code: 1, message: "Invalid recurring bill ID format" });
            return;
        }

        const bill = await RecurringBill.findOne({ _id: id, organization: req.user.organizationId });

        if (!bill) {
            res.status(404).json({ code: 1, message: "Recurring bill not found" });
            return;
        }

        res.json({
            code: 0,
            message: "success",
            recurring_bill: bill
        });
    } catch (error: any) {
        res.status(500).json({ code: 1, message: error.message });
    }
};

/**
 * Update Recurring Bill
 * PUT /recurring-bills/:id
 */
export const updateRecurringBill = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.user || !req.user.organizationId) {
            res.status(401).json({ code: 1, message: "Unauthorized" });
            return;
        }

        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            res.status(400).json({ code: 1, message: "Invalid recurring bill ID format" });
            return;
        }

        const updates = req.body;

        const bill = await RecurringBill.findOne({ _id: id, organization: req.user.organizationId });
        if (!bill) {
            res.status(404).json({ code: 1, message: "Recurring bill not found" });
            return;
        }

        Object.assign(bill, updates);
        await bill.save();

        res.json({
            code: 0,
            message: "Recurring bill updated successfully",
            recurring_bill: bill
        });
    } catch (error: any) {
        res.status(500).json({ code: 1, message: error.message });
    }
};

/**
 * Delete Recurring Bill
 * DELETE /recurring-bills/:id
 */
export const deleteRecurringBill = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.user || !req.user.organizationId) {
            res.status(401).json({ code: 1, message: "Unauthorized" });
            return;
        }

        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            res.status(400).json({ code: 1, message: "Invalid recurring bill ID format" });
            return;
        }

        const result = await RecurringBill.deleteOne({ _id: id, organization: req.user.organizationId });

        if (result.deletedCount === 0) {
            res.status(404).json({ code: 1, message: "Recurring bill not found" });
            return;
        }

        res.json({
            code: 0,
            message: "Recurring bill deleted successfully"
        });
    } catch (error: any) {
        res.status(500).json({ code: 1, message: error.message });
    }
};

/**
 * Stop/Resume Recurring Bill
 * POST /recurring-bills/:id/status
 * Body: { status: 'active' | 'stopped' }
 */
export const updateRecurringBillStatus = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.user || !req.user.organizationId) {
            res.status(401).json({ code: 1, message: "Unauthorized" });
            return;
        }

        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            res.status(400).json({ code: 1, message: "Invalid recurring bill ID format" });
            return;
        }

        const { status } = req.body;

        if (!['active', 'stopped'].includes(status)) {
            res.status(400).json({ code: 1, message: "Invalid status. Use 'active' or 'stopped'" });
            return;
        }

        const bill = await RecurringBill.findOneAndUpdate(
            { _id: id, organization: req.user.organizationId },
            { status: status },
            { new: true }
        );

        if (!bill) {
            res.status(404).json({ code: 1, message: "Recurring bill not found" });
            return;
        }

        res.json({
            code: 0,
            message: `Recurring bill ${status === 'active' ? 'resumed' : 'stopped'} successfully`,
            recurring_bill: bill
        });
    } catch (error: any) {
        res.status(500).json({ code: 1, message: error.message });
    }
};

/**
 * Generate Bill from Recurring Profile
 * POST /recurring-bills/:id/generate-bill
 */
export const generateBillFromRecurring = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.user || !req.user.organizationId) {
            res.status(401).json({ code: 1, message: "Unauthorized" });
            return;
        }

        const { id } = req.params;
        const recurringBill = await RecurringBill.findOne({ _id: id, organization: req.user.organizationId });

        if (!recurringBill) {
            res.status(404).json({ code: 1, message: "Recurring bill not found" });
            return;
        }

        // Create actual bill from template
        const billData = {
            organization: req.user.organizationId,
            billNumber: `BILL-${Date.now()}`,
            vendor: recurringBill.vendor,
            date: new Date(),
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default 30 days
            items: recurringBill.items,
            subtotal: recurringBill.subtotal,
            tax: recurringBill.tax,
            discount: recurringBill.discount,
            total: recurringBill.total,
            currency: recurringBill.currency || 'USD',
            accountsPayable: recurringBill.accounts_payable,
            notes: recurringBill.notes,
            status: 'open',
            isRecurring: true
        };

        const newBill = new Bill(billData);
        await newBill.save();

        // Update recurring bill dates
        recurringBill.last_created_date = new Date();

        // Calculate next date (simplified frequency mapping)
        const nextDate = new Date(recurringBill.next_bill_date || recurringBill.start_date);
        const freq = (recurringBill.repeat_every || '').toLowerCase();

        if (freq.includes('week')) {
            const weeks = parseInt(freq) || 1;
            nextDate.setDate(nextDate.getDate() + (weeks * 7));
        } else if (freq.includes('month')) {
            const months = parseInt(freq) || 1;
            nextDate.setMonth(nextDate.getMonth() + months);
        } else if (freq.includes('year')) {
            const years = parseInt(freq) || 1;
            nextDate.setFullYear(nextDate.getFullYear() + years);
        } else {
            nextDate.setMonth(nextDate.getMonth() + 1);
        }

        recurringBill.next_bill_date = nextDate;
        await recurringBill.save();

        res.json({
            code: 0,
            success: true,
            message: "Bill generated successfully",
            data: newBill
        });

    } catch (error: any) {
        console.error("Error generating bill from recurring:", error);
        res.status(500).json({ code: 1, message: error.message });
    }
};
