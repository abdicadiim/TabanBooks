import { Request, Response } from "express";
import PaymentTerm from "../models/PaymentTerm.js";

interface AuthRequest extends Request {
    user?: {
        userId: string;
        organizationId: string;
        role: string;
    };
}

export const getAll = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }
        const paymentTerms = await PaymentTerm.find({ organization: req.user.organizationId }).sort({ name: 1 });
        res.json({ success: true, data: paymentTerms });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const create = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }
        const { name, days, isDefault } = req.body;

        if (isDefault) {
            // Unset previous default
            await PaymentTerm.updateMany(
                { organization: req.user.organizationId, isDefault: true },
                { isDefault: false }
            );
        }

        const paymentTerm = await PaymentTerm.create({
            organization: req.user.organizationId,
            name,
            days,
            isDefault
        });
        res.status(201).json({ success: true, data: paymentTerm });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const update = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }
        const { id } = req.params;
        const { name, days, isDefault } = req.body;

        if (isDefault) {
            await PaymentTerm.updateMany(
                { organization: req.user.organizationId, isDefault: true, _id: { $ne: id } },
                { isDefault: false }
            );
        }

        const paymentTerm = await PaymentTerm.findOneAndUpdate(
            { _id: id, organization: req.user.organizationId },
            { name, days, isDefault },
            { new: true, runValidators: true }
        );

        if (!paymentTerm) {
            res.status(404).json({ success: false, message: "Payment term not found" });
            return;
        }

        res.json({ success: true, data: paymentTerm });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const deleteTerm = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }
        const { id } = req.params;
        const paymentTerm = await PaymentTerm.findOneAndDelete({ _id: id, organization: req.user.organizationId });

        if (!paymentTerm) {
            res.status(404).json({ success: false, message: "Payment term not found" });
            return;
        }

        res.json({ success: true, message: "Payment term deleted" });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};
