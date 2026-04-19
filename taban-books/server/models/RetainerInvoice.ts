/**
 * Retainer Invoice Model
 * For advance payments/retainers from customers
 */

import mongoose, { Document, Schema } from "mongoose";

interface IRetainerInvoiceItem {
    item?: mongoose.Types.ObjectId;
    name?: string;
    description?: string;
    quantity: number;
    unitPrice: number;
    taxRate?: number;
    taxAmount?: number;
    total: number;
}

export interface IRetainerInvoice extends Document {
    organization: mongoose.Types.ObjectId;
    retainerInvoiceNumber: string;
    customer: mongoose.Types.ObjectId;
    date: Date;

    // Retainer specific fields
    retainerType: 'advance' | 'deposit' | 'prepayment';
    validUntil?: Date;

    items: IRetainerInvoiceItem[];
    subtotal?: number;
    tax?: number;
    discount?: number;
    total: number;
    currency?: string;

    // Status and tracking
    status: 'draft' | 'sent' | 'paid' | 'partially_used' | 'fully_used' | 'expired';
    amountUsed?: number;
    amountRemaining?: number;

    // Additional fields
    notes?: string;
    terms?: string;

    createdAt?: Date;
    updatedAt?: Date;
}

const retainerInvoiceItemSchema = new Schema<IRetainerInvoiceItem>({
    item: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Item",
    },
    name: String,
    description: String,
    quantity: {
        type: Number,
        required: true,
        min: 0,
    },
    unitPrice: {
        type: Number,
        required: true,
        min: 0,
    },
    taxRate: {
        type: Number,
        default: 0,
    },
    taxAmount: {
        type: Number,
        default: 0,
    },
    total: {
        type: Number,
        required: true,
    },
});

const retainerInvoiceSchema = new Schema<IRetainerInvoice>(
    {
        organization: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
        },
        retainerInvoiceNumber: {
            type: String,
            required: true,
            unique: true,
        },
        customer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Customer",
            required: true,
        },
        date: {
            type: Date,
            required: true,
            default: Date.now,
        },
        retainerType: {
            type: String,
            enum: ['advance', 'deposit', 'prepayment'],
            default: 'advance',
        },
        validUntil: Date,
        items: [retainerInvoiceItemSchema],
        subtotal: {
            type: Number,
            default: 0,
        },
        tax: {
            type: Number,
            default: 0,
        },
        discount: {
            type: Number,
            default: 0,
        },
        total: {
            type: Number,
            required: true,
        },
        currency: {
            type: String,
            default: "USD",
            uppercase: true,
        },
        status: {
            type: String,
            enum: ['draft', 'sent', 'paid', 'partially_used', 'fully_used', 'expired'],
            default: 'draft',
        },
        amountUsed: {
            type: Number,
            default: 0,
        },
        amountRemaining: Number,
        notes: String,
        terms: String,
    },
    {
        timestamps: true,
    }
);

retainerInvoiceSchema.index({ organization: 1, retainerInvoiceNumber: 1 });
retainerInvoiceSchema.index({ organization: 1, customer: 1 });
retainerInvoiceSchema.index({ organization: 1, status: 1 });

const RetainerInvoice = mongoose.model<IRetainerInvoice>("RetainerInvoice", retainerInvoiceSchema);

export default RetainerInvoice;
