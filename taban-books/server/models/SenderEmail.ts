/**
 * SenderEmail Model
 * Stores validated sender email addresses for an organization
 */

import mongoose, { Document, Schema } from "mongoose";

export interface ISenderEmail extends Document {
    organization: mongoose.Types.ObjectId;
    name: string;
    email: string;
    isPrimary: boolean;
    isVerified: boolean;
    // SMTP Configuration
    smtpHost?: string;
    smtpPort?: number;
    smtpUser?: string;
    smtpPassword?: string;
    smtpSecure?: boolean; // true for 465, false for other ports
    createdAt: Date;
    updatedAt: Date;
}

const senderEmailSchema = new Schema<ISenderEmail>(
    {
        organization: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
        },
        name: {
            type: String,
            required: [true, "Name is required"],
            trim: true,
        },
        email: {
            type: String,
            required: [true, "Email is required"],
            trim: true,
            lowercase: true,
        },
        isPrimary: {
            type: Boolean,
            default: false,
        },
        isVerified: {
            type: Boolean,
            default: true, // Auto-verify for now as per system simplification
        },
        // SMTP Configuration
        smtpHost: {
            type: String,
            trim: true,
        },
        smtpPort: {
            type: Number,
        },
        smtpUser: {
            type: String,
            trim: true,
        },
        smtpPassword: {
            type: String,
        },
        smtpSecure: {
            type: Boolean,
            default: false, // false for port 587, true for port 465
        },
    },
    {
        timestamps: true,
    }
);

// Index for faster queries per organization
senderEmailSchema.index({ organization: 1 });
senderEmailSchema.index({ organization: 1, email: 1 }, { unique: true });

const SenderEmail = mongoose.model<ISenderEmail>("SenderEmail", senderEmailSchema);

export default SenderEmail;
