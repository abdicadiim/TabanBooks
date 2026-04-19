/**
 * Debit Note Model
 * For recording additional charges to customers after invoice
 */

import mongoose, { Document, Schema } from "mongoose";

interface IDebitNoteItem {
    item?: mongoose.Types.ObjectId;
    name?: string;
    description?: string;
    quantity: number;
    unitPrice: number;
    taxRate?: number;
    taxAmount?: number;
    total: number;
}

export interface IDebitNote extends Document {
    organization: mongoose.Types.ObjectId;
    debitNoteNumber: string;
    customer: mongoose.Types.ObjectId;
    invoice?: mongoose.Types.ObjectId; // Reference to original invoice
    date: Date;

    // Reason for debit note
    reason?: string;

    items: IDebitNoteItem[];
    subtotal?: number;
    tax?: number;
    discount?: number;
    total: number;
    currency?: string;

    // Status
    status: 'draft' | 'sent' | 'paid' | 'partially_paid' | 'overdue' | 'void';

    // Additional fields
    notes?: string;
    terms?: string;

    createdAt?: Date;
    updatedAt?: Date;
}

const debitNoteItemSchema = new Schema<IDebitNoteItem>({
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

const debitNoteSchema = new Schema<IDebitNote>(
    {
        organization: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
        },
        debitNoteNumber: {
            type: String,
            required: true,
            unique: true,
        },
        customer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Customer",
            required: true,
        },
        invoice: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Invoice",
        },
        date: {
            type: Date,
            required: true,
            default: Date.now,
        },
        reason: String,
        items: [debitNoteItemSchema],
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
            enum: ['draft', 'sent', 'paid', 'partially_paid', 'overdue', 'void'],
            default: 'draft',
        },
        notes: String,
        terms: String,
    },
    {
        timestamps: true,
    }
);

debitNoteSchema.index({ organization: 1, debitNoteNumber: 1 });
debitNoteSchema.index({ organization: 1, customer: 1 });
debitNoteSchema.index({ organization: 1, invoice: 1 });
debitNoteSchema.index({ organization: 1, status: 1 });

const DebitNote = mongoose.model<IDebitNote>("DebitNote", debitNoteSchema);

export default DebitNote;
