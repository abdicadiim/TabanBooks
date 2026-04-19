/**
 * Refund Model
 * Customer Payment Refunds
 */

import mongoose, { Document, Schema } from "mongoose";

export interface IRefund extends Document {
    organization: mongoose.Types.ObjectId;
    refundNumber: string;
    payment?: mongoose.Types.ObjectId;
    creditNote?: mongoose.Types.ObjectId;
    customer: mongoose.Types.ObjectId;
    refundDate: Date;
    amount: number;
    paymentMethod: 'cash' | 'check' | 'card' | 'bank_remittance' | 'bank_transfer' | 'other';
    referenceNumber?: string;
    fromAccount?: mongoose.Types.ObjectId;
    description?: string;
    journalEntryId?: mongoose.Types.ObjectId;
    createdAt?: Date;
    updatedAt?: Date;
}

const refundSchema = new Schema<IRefund>(
    {
        organization: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
        },
        refundNumber: {
            type: String,
            required: true,
            unique: true,
        },
        payment: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "PaymentReceived",
            required: false,
        },
        creditNote: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "CreditNote",
            required: false,
        },
        customer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Customer",
            required: true,
        },
        refundDate: {
            type: Date,
            required: true,
            default: Date.now,
        },
        amount: {
            type: Number,
            required: true,
            min: 0,
        },
        paymentMethod: {
            type: String,
            enum: ["cash", "check", "card", "bank_remittance", "bank_transfer", "other"],
            required: true,
        },
        referenceNumber: String,
        fromAccount: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "BankAccount",
        },
        description: String,
        journalEntryId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "JournalEntry",
        },
    },
    {
        timestamps: true,
    }
);

refundSchema.index({ organization: 1, refundNumber: 1 });
refundSchema.index({ organization: 1, payment: 1 });
refundSchema.index({ organization: 1, creditNote: 1 });
refundSchema.index({ organization: 1, customer: 1 });
refundSchema.index({ organization: 1, refundDate: 1 });

const Refund = mongoose.model<IRefund>("Refund", refundSchema);

export default Refund;
