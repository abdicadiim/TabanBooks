import { Response } from "express";
import OpeningBalance from "../models/OpeningBalance.js";
import ChartOfAccount from "../models/ChartOfAccount.js";

/**
 * Get opening balances for the organization
 */
export const getOpeningBalances = async (req: any, res: Response) => {
    try {
        const organizationId = req.user?.organizationId;
        if (!organizationId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }

        const openingBalance = await OpeningBalance.findOne({ organization: organizationId })
            .populate('accounts.account');

        return res.status(200).json({
            success: true,
            data: openingBalance || null
        });
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Save or update opening balances
 */
export const saveOpeningBalances = async (req: any, res: Response) => {
    try {
        const organizationId = req.user?.organizationId;
        if (!organizationId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }

        const { migrationDate, accounts } = req.body;

        let openingBalance = await OpeningBalance.findOne({ organization: organizationId });

        if (openingBalance) {
            openingBalance.migrationDate = migrationDate;
            openingBalance.accounts = accounts;
            await openingBalance.save();
        } else {
            openingBalance = await OpeningBalance.create({
                organization: organizationId,
                migrationDate,
                accounts
            });
        }

        // Optionally update ChartOfAccount balances
        if (accounts && Array.isArray(accounts)) {
            for (const acc of accounts) {
                if (acc.account) {
                    const balance = (acc.debit || 0) - (acc.credit || 0);
                    await ChartOfAccount.findByIdAndUpdate(acc.account, { balance });
                }
            }
        }

        return res.status(200).json({
            success: true,
            message: "Opening balances saved successfully",
            data: openingBalance
        });
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
