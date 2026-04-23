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
    customerName?: string;
    date: Date;
    invoiceDate?: Date;
    reference?: string;
    orderNumber?: string;
    location?: string;
    projectId?: mongoose.Types.ObjectId | null;
    projectName?: string;
    locationName?: string;
    selectedLocation?: string;
    reportingTags?: Array<Record<string, any>>;

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
    status: 'draft' | 'sent' | 'paid' | 'partially_paid' | 'partially_used' | 'fully_used' | 'expired';
    amountUsed?: number;
    amountRemaining?: number;
    amountPaid?: number;
    paidAmount?: number;
    balance?: number;
    balanceDue?: number;
    paymentsReceived?: Array<Record<string, any>>;

    // Additional fields
    notes?: string;
    terms?: string;
    depositToAccount?: string;

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
        customerName: {
            type: String,
            default: "",
        },
        invoiceDate: {
            type: Date,
        },
        reference: {
            type: String,
            default: "",
        },
        orderNumber: {
            type: String,
            default: "",
        },
        location: {
            type: String,
            default: "",
        },
        projectId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Project",
        },
        projectName: {
            type: String,
            default: "",
        },
        locationName: {
            type: String,
            default: "",
        },
        selectedLocation: {
            type: String,
            default: "",
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
            enum: ['draft', 'sent', 'paid', 'partially_paid', 'partially_used', 'fully_used', 'expired'],
            default: 'draft',
        },
        amountUsed: {
            type: Number,
            default: 0,
        },
        amountRemaining: Number,
        amountPaid: {
            type: Number,
            default: 0,
        },
        paidAmount: {
            type: Number,
            default: 0,
        },
        balance: {
            type: Number,
            default: 0,
        },
        balanceDue: {
            type: Number,
            default: 0,
        },
        paymentsReceived: {
            type: [mongoose.Schema.Types.Mixed],
            default: [],
        },
        notes: String,
        terms: String,
        reportingTags: {
            type: [mongoose.Schema.Types.Mixed],
            default: [],
        depositToAccount: {
            type: String,
            default: '',
        },
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
