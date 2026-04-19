/**
 * Approval Rule Controller
 * Handles CRUD operations for custom approval rules
 */

import { Request, Response } from "express";
import ApprovalRule from "../models/ApprovalRule.js";

interface AuthRequest extends Request {
    user?: {
        userId: string;
        organizationId: string;
        role: string;
    };
}

/**
 * Get all approval rules
 * GET /api/settings/approval-rules
 */
export const getApprovalRules = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.user || !req.user.organizationId) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }

        const rules = await ApprovalRule.find({ organization: req.user.organizationId })
            .sort({ priority: 1, createdAt: -1 });

        res.json({
            success: true,
            data: rules,
        });
    } catch (error: any) {
        console.error('Error fetching approval rules:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch approval rules',
        });
    }
};

/**
 * Create a new approval rule
 * POST /api/settings/approval-rules
 */
export const createApprovalRule = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.user || !req.user.organizationId) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }

        const ruleData = {
            ...req.body,
            organization: req.user.organizationId
        };

        const rule = new ApprovalRule(ruleData);
        await rule.save();

        res.status(201).json({
            success: true,
            message: 'Approval rule created successfully',
            data: rule,
        });
    } catch (error: any) {
        console.error('Error creating approval rule:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to create approval rule',
        });
    }
};

/**
 * Get approval rule by ID
 * GET /api/settings/approval-rules/:id
 */
export const getApprovalRuleById = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.user || !req.user.organizationId) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }

        const rule = await ApprovalRule.findOne({
            _id: req.params.id,
            organization: req.user.organizationId
        });

        if (!rule) {
            res.status(404).json({ success: false, message: 'Approval rule not found' });
            return;
        }

        res.json({
            success: true,
            data: rule,
        });
    } catch (error: any) {
        console.error('Error fetching approval rule:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch approval rule',
        });
    }
};

/**
 * Update approval rule
 * PUT /api/settings/approval-rules/:id
 */
export const updateApprovalRule = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.user || !req.user.organizationId) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }

        const rule = await ApprovalRule.findOneAndUpdate(
            { _id: req.params.id, organization: req.user.organizationId },
            { ...req.body },
            { new: true, runValidators: true }
        );

        if (!rule) {
            res.status(404).json({ success: false, message: 'Approval rule not found' });
            return;
        }

        res.json({
            success: true,
            message: 'Approval rule updated successfully',
            data: rule,
        });
    } catch (error: any) {
        console.error('Error updating approval rule:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to update approval rule',
        });
    }
};

/**
 * Delete approval rule
 * DELETE /api/settings/approval-rules/:id
 */
export const deleteApprovalRule = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.user || !req.user.organizationId) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }

        const rule = await ApprovalRule.findOneAndDelete({
            _id: req.params.id,
            organization: req.user.organizationId
        });

        if (!rule) {
            res.status(404).json({ success: false, message: 'Approval rule not found' });
            return;
        }

        res.json({
            success: true,
            message: 'Approval rule deleted successfully',
        });
    } catch (error: any) {
        console.error('Error deleting approval rule:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to delete approval rule',
        });
    }
};
