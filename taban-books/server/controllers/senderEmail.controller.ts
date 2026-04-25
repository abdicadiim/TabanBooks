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
 * Helper to send verification email to a sender
 */
const sendSenderVerificationEmailHelper = async (sender: any, organizationId: string) => {
    const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5175";
    const verificationLink = `${FRONTEND_URL}/accept-invitation?email=${encodeURIComponent(sender.email)}&name=${encodeURIComponent(sender.name)}&type=sender&senderId=${sender._id}`;

    const message = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b; background-color: #f8fafc; padding: 40px 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <div style="background-color: #156372; padding: 32px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">Verify Sender Email</h1>
          </div>
          <div style="padding: 40px;">
            <p style="font-size: 16px; margin: 0 0 24px;">Hello <strong>${sender.name}</strong>,</p>
            <p style="font-size: 16px; margin: 0 0 24px;">You have been added as a sender for <strong>all system communication</strong> on Taban Books. Once verified and set as primary, this email will be used for all invoices, receipts, and official documents sent from the system.</p>
            
            <div style="text-align: center; margin: 40px 0;">
              <a href="${verificationLink}" style="background-color: #156372; color: #ffffff; padding: 16px 32px; border-radius: 8px; font-weight: 600; text-decoration: none; display: inline-block; box-shadow: 0 4px 12px rgba(21, 99, 114, 0.2);">Verify & Activate for All System Emails</a>
            </div>

            <p style="font-size: 14px; color: #64748b; line-height: 1.5; margin: 0;">By completing this verification, you authorize this address to be the primary source for all automated financial and administrative notices.</p>
          </div>
          <div style="background-color: #f1f5f9; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="font-size: 12px; color: #94a3b8; margin: 0;">&copy; 2026 Taban Books. All rights reserved.</p>
          </div>
        </div>
      </div>
    `;

    return await sendEmail({
        to: sender.email,
        subject: "Action Required: Verify your sender email for Taban Books",
        html: message,
        text: `Please verify your sender email by following this link: ${verificationLink}`,
        organizationId,
    });
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
            isVerified: false, // New senders MUST verify via OTP link
            smtpHost,
            smtpPort,
            smtpUser,
            smtpPassword,
            smtpSecure
        });

        // Send the verification email immediately
        await sendSenderVerificationEmailHelper(senderEmail, organizationId);

        res.status(201).json({ success: true, message: "Sender created and verification email sent.", data: senderEmail });
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

        const mailResult = await sendSenderVerificationEmailHelper(sender, organizationId);

        if (!mailResult.success) {
            res.status(500).json({
                success: false,
                message: mailResult.error || "Failed to send verification email",
            });
            return;
        }

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
        if (primarySender) {
            res.json({ success: true, data: primarySender });
            return;
        }

        const verifiedSender = await SenderEmail.findOne({ organization: organizationId, isVerified: true });
        if (verifiedSender) {
            res.json({ success: true, data: verifiedSender });
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
