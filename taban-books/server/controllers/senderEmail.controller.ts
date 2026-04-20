import { Request, Response } from "express";
import SenderEmail from "../models/SenderEmail.js";
import User from "../models/User.js";
import { sendEmail } from "../services/email.service.js";

/**
 * Get all sender emails for an organization
 * GET /api/settings/sender-emails
 */
export const getSenderEmails = async (req: Request, res: Response): Promise<void> => {
    try {
        const organizationId = (req as any).user?.organizationId;
        if (!organizationId) {
            res.status(401).json({ success: false, message: "Organization ID is required" });
            return;
        }

        let senders = await SenderEmail.find({ organization: organizationId });

        // If no senders found, automatically add the owner as a default sender
        if (senders.length === 0) {
            const ownerUser = await User.findOne({
                organization: organizationId,
                role: "owner",
                isActive: true
            });

            if (ownerUser) {
                const defaultSender = await SenderEmail.create({
                    organization: organizationId,
                    name: ownerUser.name,
                    email: ownerUser.email,
                    isPrimary: true,
                    isVerified: true
                });
                senders = [defaultSender];
            }
        }

        res.json({ success: true, data: senders });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Create a new sender email
 * POST /api/settings/sender-emails
 */
export const createSenderEmail = async (req: Request, res: Response): Promise<void> => {
    try {
        const organizationId = (req as any).user?.organizationId;
        const { name, email, isPrimary, smtpHost, smtpPort, smtpUser, smtpPassword, smtpSecure } = req.body;

        if (!name || !email) {
            res.status(400).json({ success: false, message: "Name and email are required" });
            return;
        }

        // If this is set as primary, unmark others
        if (isPrimary) {
            await SenderEmail.updateMany({ organization: organizationId }, { isPrimary: false });
        }

        const senderEmail = await SenderEmail.create({
            organization: organizationId,
            name,
            email,
            isPrimary: isPrimary || false,
            // New senders should be verified before being fully trusted.
            isVerified: Boolean(isPrimary),
            smtpHost,
            smtpPort,
            smtpUser,
            smtpPassword,
            smtpSecure
        });

        res.status(201).json({ success: true, data: senderEmail });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Update a sender email
 * PUT /api/settings/sender-emails/:id
 */
export const updateSenderEmail = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const organizationId = (req as any).user?.organizationId;
        const { name, email, isPrimary, isVerified, smtpHost, smtpPort, smtpUser, smtpPassword, smtpSecure } = req.body;

        const sender = await SenderEmail.findOne({ _id: id, organization: organizationId });

        if (!sender) {
            res.status(404).json({ success: false, message: "Sender email not found" });
            return;
        }

        // If this is being set as primary, unmark others
        if (isPrimary && !sender.isPrimary) {
            await SenderEmail.updateMany({ organization: organizationId }, { isPrimary: false });
        }

        const normalizedNextEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
        const normalizedCurrentEmail = String(sender.email || "").trim().toLowerCase();
        const emailChanged = Boolean(normalizedNextEmail) && normalizedNextEmail !== normalizedCurrentEmail;

        sender.name = name || sender.name;
        sender.email = email || sender.email;
        sender.isPrimary = isPrimary !== undefined ? isPrimary : sender.isPrimary;
        if (emailChanged) {
            sender.isVerified = false;
        } else if (isVerified !== undefined) {
            sender.isVerified = Boolean(isVerified);
        }

        // Update SMTP configuration if provided
        if (smtpHost !== undefined) sender.smtpHost = smtpHost;
        if (smtpPort !== undefined) sender.smtpPort = smtpPort;
        if (smtpUser !== undefined) sender.smtpUser = smtpUser;
        if (smtpPassword !== undefined) sender.smtpPassword = smtpPassword;
        if (smtpSecure !== undefined) sender.smtpSecure = smtpSecure;

        await sender.save();

        res.json({ success: true, data: sender });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Resend sender email verification
 * POST /api/settings/sender-emails/:id/resend-verification
 */
export const resendSenderVerification = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const organizationId = (req as any).user?.organizationId;

        if (!organizationId) {
            res.status(401).json({ success: false, message: "Organization ID is required" });
            return;
        }

        const sender = await SenderEmail.findOne({ _id: id, organization: organizationId });
        if (!sender) {
            res.status(404).json({ success: false, message: "Sender email not found" });
            return;
        }

        const message = `
          <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
            <h2 style="margin: 0 0 12px;">Sender email verified</h2>
            <p style="margin: 0 0 12px;">The sender email <strong>${sender.email}</strong> has been verified for your Taban Books organization.</p>
            <p style="margin: 0;">You can now use this address for outgoing mail.</p>
          </div>
        `;

        const mailResult = await sendEmail({
            to: sender.email,
            subject: "Your sender email has been verified",
            html: message,
            text: `The sender email ${sender.email} has been verified for your Taban Books organization.`,
            organizationId,
        });

        if (!mailResult.success) {
            res.status(500).json({
                success: false,
                message: mailResult.error || "Failed to send verification email",
            });
            return;
        }

        sender.isVerified = true;
        await sender.save();

        res.json({
            success: true,
            message: "Verification email sent successfully",
            data: sender,
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Delete a sender email
 * DELETE /api/settings/sender-emails/:id
 */
export const deleteSenderEmail = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const organizationId = (req as any).user?.organizationId;

        const sender = await SenderEmail.findOne({ _id: id, organization: organizationId });

        if (!sender) {
            res.status(404).json({ success: false, message: "Sender email not found" });
            return;
        }

        if (sender.isPrimary) {
            res.status(400).json({ success: false, message: "Cannot delete the primary sender email" });
            return;
        }

        await sender.deleteOne();

        res.json({ success: true, message: "Sender email deleted successfully" });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Get the primary sender email for an organization
 * GET /api/settings/sender-emails/primary
 */
export const getPrimarySender = async (req: Request, res: Response): Promise<void> => {
    try {
        const organizationId = (req as any).user?.organizationId;
        if (!organizationId) {
            res.status(401).json({ success: false, message: "Organization ID is required" });
            return;
        }

        const primarySender = await SenderEmail.findOne({ organization: organizationId, isPrimary: true });
        if (primarySender?.isVerified) {
            res.json({ success: true, data: primarySender });
            return;
        }

        const verifiedSender = await SenderEmail.findOne({ organization: organizationId, isVerified: true });
        if (verifiedSender) {
            res.json({ success: true, data: verifiedSender });
            return;
        }

        if (primarySender) {
            res.json({ success: true, data: primarySender });
            return;
        }

        const anySender = await SenderEmail.findOne({ organization: organizationId });
        if (anySender) {
            res.json({ success: true, data: anySender });
            return;
        }

        // Second Fallback: Auto-create owner as sender (like in getSenderEmails)
        const ownerUser = await User.findOne({
            organization: organizationId,
            role: "owner",
            isActive: true
        });

        if (ownerUser) {
            const defaultSender = await SenderEmail.create({
                organization: organizationId,
                name: ownerUser.name,
                email: ownerUser.email,
                isPrimary: true,
                isVerified: true
            });
            res.json({ success: true, data: defaultSender });
            return;
        }

        res.status(404).json({ success: false, message: "No sender emails found" });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};
