import { Request, Response } from "express";
import PaymentMode from "../models/PaymentMode.js";
import {
    CANONICAL_PAYMENT_MODE_LABELS,
    DEFAULT_PAYMENT_MODES,
    getRecognizedPaymentModeLabel,
    isCanonicalPaymentModeLabel,
} from "../utils/paymentModes.js";

const paymentModeOrder = new Map(
    DEFAULT_PAYMENT_MODES.map((mode, index) => [mode.name.toLowerCase(), index])
);

const sortPaymentModes = <T extends { name: string }>(modes: T[]) =>
    [...modes].sort((left, right) => {
        const leftIndex = paymentModeOrder.get(left.name.toLowerCase());
        const rightIndex = paymentModeOrder.get(right.name.toLowerCase());

        if (leftIndex !== undefined && rightIndex !== undefined) {
            return leftIndex - rightIndex;
        }

        if (leftIndex !== undefined) {
            return -1;
        }

        if (rightIndex !== undefined) {
            return 1;
        }

        return left.name.localeCompare(right.name);
    });

const ensureDefaultPaymentModes = async (organizationId: string) => {
    const existingModes = await PaymentMode.find({ organization: organizationId }).sort({ createdAt: 1 });

    for (const mode of existingModes) {
        const canonicalName = getRecognizedPaymentModeLabel(mode.name);

        if (!canonicalName || mode.name.trim().toLowerCase() === canonicalName.toLowerCase()) {
            continue;
        }

        const canonicalMatch = existingModes.find(
            (candidate) =>
                String(candidate._id) !== String(mode._id) &&
                candidate.name.trim().toLowerCase() === canonicalName.toLowerCase()
        );

        if (canonicalMatch) {
            if (mode.isDefault && !canonicalMatch.isDefault) {
                await PaymentMode.findByIdAndUpdate(canonicalMatch._id, {
                    isDefault: true,
                    isActive: true,
                });
            }

            await PaymentMode.findByIdAndUpdate(mode._id, {
                isDefault: false,
                isActive: false,
            });
            continue;
        }

        await PaymentMode.findByIdAndUpdate(mode._id, {
            name: canonicalName,
            isActive: true,
        });
    }

    const refreshedModes = await PaymentMode.find({ organization: organizationId });
    const existingNames = new Set(
        refreshedModes.map((mode) => mode.name.trim().toLowerCase())
    );
    const hasDefaultMode = refreshedModes.some(
        (mode) => mode.isDefault && isCanonicalPaymentModeLabel(mode.name)
    );

    for (const mode of DEFAULT_PAYMENT_MODES) {
        if (existingNames.has(mode.name.toLowerCase())) {
            continue;
        }

        await PaymentMode.findOneAndUpdate(
            { organization: organizationId, name: mode.name },
            {
                $setOnInsert: {
                    organization: organizationId,
                    name: mode.name,
                    isDefault: hasDefaultMode ? false : mode.isDefault,
                    isActive: true,
                },
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
    }

    let allModes = await PaymentMode.find({ organization: organizationId });
    const defaultModes = allModes.filter(
        (mode) => mode.isDefault && isCanonicalPaymentModeLabel(mode.name)
    );

    if (defaultModes.length === 0) {
        await PaymentMode.updateMany(
            { organization: organizationId, name: { $in: [...CANONICAL_PAYMENT_MODE_LABELS] } },
            { isDefault: false }
        );
        await PaymentMode.findOneAndUpdate(
            { organization: organizationId, name: "Cash" },
            { isDefault: true, isActive: true }
        );
        allModes = await PaymentMode.find({ organization: organizationId });
    } else if (defaultModes.length > 1) {
        const [keeper, ...duplicates] = sortPaymentModes(defaultModes);
        await PaymentMode.updateMany(
            { _id: { $in: duplicates.map((mode) => mode._id) } },
            { isDefault: false }
        );
        await PaymentMode.findByIdAndUpdate(keeper._id, { isDefault: true, isActive: true });
        allModes = await PaymentMode.find({ organization: organizationId });
    }

    return sortPaymentModes(allModes);
};

export const getPaymentModes = async (req: any, res: Response): Promise<void> => {
    try {
        const modes = await ensureDefaultPaymentModes(req.user.organizationId);
        res.json({ success: true, data: modes });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const createPaymentMode = async (req: any, res: Response): Promise<void> => {
    try {
        const rawName = String(req.body.name || "").trim();
        const name = getRecognizedPaymentModeLabel(rawName) || rawName;
        const { isDefault } = req.body;

        if (!name) {
            res.status(400).json({ success: false, message: "Payment mode name is required" });
            return;
        }

        if (isDefault) {
            // Unset previous default
            await PaymentMode.updateMany(
                { organization: req.user.organizationId },
                { isDefault: false }
            );
        }

        const mode = await PaymentMode.create({
            organization: req.user.organizationId,
            name,
            isDefault: !!isDefault
        });

        res.status(201).json({ success: true, data: mode });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const updatePaymentMode = async (req: any, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const rawName = String(req.body.name || "").trim();
        const name = getRecognizedPaymentModeLabel(rawName) || rawName;
        const { isDefault, isActive } = req.body;

        if (!name) {
            res.status(400).json({ success: false, message: "Payment mode name is required" });
            return;
        }

        if (isDefault) {
            await PaymentMode.updateMany(
                { organization: req.user.organizationId, _id: { $ne: id } },
                { isDefault: false }
            );
        }

        const mode = await PaymentMode.findOneAndUpdate(
            { _id: id, organization: req.user.organizationId },
            { name, isDefault, isActive },
            { new: true }
        );

        if (!mode) {
            res.status(404).json({ success: false, message: "Payment mode not found" });
            return;
        }

        res.json({ success: true, data: mode });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const deletePaymentMode = async (req: any, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const mode = await PaymentMode.findOneAndDelete({ _id: id, organization: req.user.organizationId });

        if (!mode) {
            res.status(404).json({ success: false, message: "Payment mode not found" });
            return;
        }

        res.json({ success: true, message: "Payment mode deleted" });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const seedDefaultPaymentModes = async (req: any, res: Response): Promise<void> => {
    try {
        const existingCount = await PaymentMode.countDocuments({ organization: req.user.organizationId });
        const modes = await ensureDefaultPaymentModes(req.user.organizationId);
        const message = existingCount > 0
            ? "Payment modes already existed. Missing defaults were added if needed."
            : "Default payment modes created successfully.";

        res.json({ success: true, message, data: modes });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};
