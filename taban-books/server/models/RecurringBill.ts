/**
 * Recurring Bill Model
 */

import mongoose, { Document, Schema } from "mongoose";

interface IRecurringBillItem {
    item?: mongoose.Types.ObjectId;
    name?: string; // itemDetails
    description?: string;
    quantity: number;
    unitPrice: number; // rate
    taxRate?: number;
    taxAmount?: number;
    total: number; // amount
    account?: string;
}

export interface IRecurringBill extends Document {
    organization: mongoose.Types.ObjectId;
    recurring_bill_id?: string;

    // Profile settings
    profile_name: string;
    repeat_every: string;
    start_date: Date;
    end_date?: Date;
    never_expire: boolean;
    status: 'active' | 'stopped' | 'expired';
    last_created_date?: Date;
    next_bill_date?: Date;

    // Bill fields
    vendor: mongoose.Types.ObjectId;
    vendor_name?: string; // For display
    items: IRecurringBillItem[];
    subtotal?: number;
    tax?: number;
    discount?: number;
    total: number;
    currency?: string;
    paymentTerms?: string;
    notes?: string;
    accounts_payable?: string;

    createdAt?: Date;
    updatedAt?: Date;
}

const recurringBillItemSchema = new Schema<IRecurringBillItem>({
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
    account: String,
}, { _id: false });

const recurringBillSchema = new Schema<IRecurringBill>(
    {
        organization: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
        },
        recurring_bill_id: String,

        profile_name: { type: String, required: true },
        repeat_every: { type: String, required: true },
        start_date: { type: Date, required: true },
        end_date: Date,
        never_expire: { type: Boolean, default: true },
        status: {
            type: String,
            enum: ['active', 'stopped', 'expired'],
            default: 'active'
        },
        last_created_date: Date,
        next_bill_date: Date,

        vendor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Vendor",
            required: true,
        },
        vendor_name: String,
        items: [recurringBillItemSchema],
        subtotal: { type: Number, default: 0 },
        tax: { type: Number, default: 0 },
        discount: { type: Number, default: 0 },
        total: { type: Number, required: true },
        currency: { type: String, default: "USD" },
        paymentTerms: String,
        notes: String,
        accounts_payable: String,
    },
    {
        timestamps: true,
    }
);

recurringBillSchema.index({ organization: 1, start_date: 1 });
recurringBillSchema.index({ organization: 1, next_bill_date: 1 });
recurringBillSchema.index({ organization: 1, status: 1 });
recurringBillSchema.index({ organization: 1, vendor: 1 });

const RecurringBill = mongoose.model<IRecurringBill>("RecurringBill", recurringBillSchema);

export default RecurringBill;
