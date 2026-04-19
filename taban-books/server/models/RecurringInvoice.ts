/**
 * Recurring Invoice Model
 * Template for automatically generating invoices on a schedule
 */

import mongoose, { Document, Schema } from "mongoose";

interface IRecurringInvoiceItem {
    item?: mongoose.Types.ObjectId;
    name?: string;
    description?: string;
    quantity: number;
    unitPrice: number;
    taxRate?: number;
    taxAmount?: number;
    total: number;
}

export interface IRecurringInvoice extends Document {
    organization: mongoose.Types.ObjectId;
    profileName: string;
    customer: mongoose.Types.ObjectId;
    orderNumber?: string;
    paymentTerms?: string;
    accountsReceivable?: string;
    salesperson?: string;
    salespersonId?: mongoose.Types.ObjectId;
    projectIds?: mongoose.Types.ObjectId[];
    associatedProjects?: mongoose.Types.ObjectId[];

    // Recurrence settings
    frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
    startDate: Date;
    endDate?: Date;
    nextInvoiceDate: Date;

    // Invoice template data
    items: IRecurringInvoiceItem[];
    subtotal?: number;
    tax?: number;
    discount?: number;
    shippingCharges?: number;
    shippingChargeTax?: string;
    adjustment?: number;
    total: number;
    currency?: string;

    // Additional fields
    notes?: string;
    terms?: string;
    attachedFiles?: Array<{
        name?: string;
        url?: string;
        size?: number;
        mimeType?: string;
        documentId?: string;
        fileName?: string;
        filePath?: string;
        uploadedAt?: Date;
    }>;

    // Status
    status: 'active' | 'paused' | 'stopped' | 'expired';

    // Tracking
    lastInvoiceDate?: Date;
    invoicesGenerated?: number;

    createdAt?: Date;
    updatedAt?: Date;

    // Methods
    calculateNextInvoiceDate(): Date;
}

const recurringInvoiceItemSchema = new Schema<IRecurringInvoiceItem>({
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

const recurringInvoiceSchema = new Schema<IRecurringInvoice>(
    {
        organization: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
        },
        profileName: {
            type: String,
            required: true,
        },
        customer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Customer",
            required: true,
        },
        orderNumber: {
            type: String,
            default: "",
            trim: true,
        },
        paymentTerms: {
            type: String,
            default: "",
            trim: true,
        },
        accountsReceivable: {
            type: String,
            default: "",
            trim: true,
        },
        salesperson: {
            type: String,
            default: "",
            trim: true,
        },
        salespersonId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Salesperson",
        },
        projectIds: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Project",
            }
        ],
        associatedProjects: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Project",
            }
        ],
        frequency: {
            type: String,
            enum: ['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'],
            required: true,
        },
        startDate: {
            type: Date,
            required: true,
        },
        endDate: {
            type: Date,
        },
        nextInvoiceDate: {
            type: Date,
            required: true,
        },
        items: [recurringInvoiceItemSchema],
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
        shippingCharges: {
            type: Number,
            default: 0,
        },
        shippingChargeTax: {
            type: String,
            default: "",
            trim: true,
        },
        adjustment: {
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
        notes: String,
        terms: String,
        attachedFiles: [{
            name: String,
            url: String,
            size: Number,
            mimeType: String,
            documentId: String,
            fileName: String,
            filePath: String,
            uploadedAt: { type: Date, default: Date.now }
        }],
        status: {
            type: String,
            enum: ['active', 'paused', 'stopped', 'expired'],
            default: 'active',
        },
        lastInvoiceDate: Date,
        invoicesGenerated: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
);

recurringInvoiceSchema.index({ organization: 1, status: 1 });
recurringInvoiceSchema.index({ organization: 1, customer: 1 });
recurringInvoiceSchema.index({ nextInvoiceDate: 1, status: 1 });

// Method to calculate next invoice date based on frequency
recurringInvoiceSchema.methods.calculateNextInvoiceDate = function(): Date {
    const currentDate = this.lastInvoiceDate || this.nextInvoiceDate || this.startDate;
    const nextDate = new Date(currentDate);
    
    switch (this.frequency) {
        case 'daily':
            nextDate.setDate(nextDate.getDate() + 1);
            break;
        case 'weekly':
            nextDate.setDate(nextDate.getDate() + 7);
            break;
        case 'biweekly':
            nextDate.setDate(nextDate.getDate() + 14);
            break;
        case 'monthly':
            nextDate.setMonth(nextDate.getMonth() + 1);
            break;
        case 'quarterly':
            nextDate.setMonth(nextDate.getMonth() + 3);
            break;
        case 'yearly':
            nextDate.setFullYear(nextDate.getFullYear() + 1);
            break;
        default:
            nextDate.setMonth(nextDate.getMonth() + 1);
    }
    
    return nextDate;
};

// Pre-save middleware to handle date updates
recurringInvoiceSchema.pre('save', function(next) {
    if (this.isModified('lastInvoiceDate') && this.lastInvoiceDate) {
        this.nextInvoiceDate = this.calculateNextInvoiceDate();
        this.invoicesGenerated = (this.invoicesGenerated || 0) + 1;
    }
    next();
});

const RecurringInvoice = mongoose.model<IRecurringInvoice>("RecurringInvoice", recurringInvoiceSchema);

export default RecurringInvoice;
