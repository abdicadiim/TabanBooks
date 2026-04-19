/**
 * Currency Adjustment Model
 */

import mongoose, { Document, Schema } from "mongoose";

export interface ICurrencyAdjustment extends Document {
    organization: mongoose.Types.ObjectId;
    currency: string;
    date: string;
    previousExchangeRate?: number;
    exchangeRate: number;
    baseCurrency?: string;
    affectedAccounts?: Array<{
        accountId: string;
        accountName: string;
        balanceFCY: number;
        balanceBCY: number;
        revaluedBalanceBCY: number;
        gainOrLossBCY: number;
        selected?: boolean;
    }>;
    gainOrLoss: number;
    notes: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
}

const currencyAdjustmentSchema = new Schema<ICurrencyAdjustment>(
    {
        organization: {
            type: Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
        },
        currency: {
            type: String,
            required: true,
        },
        date: {
            type: String,
            required: true,
        },
        exchangeRate: {
            type: Number,
            required: true,
        },
        previousExchangeRate: {
            type: Number,
            default: 1,
        },
        baseCurrency: {
            type: String,
            default: "USD",
            uppercase: true,
        },
        affectedAccounts: [
            {
                accountId: { type: String, required: true },
                accountName: { type: String, required: true },
                balanceFCY: { type: Number, default: 0 },
                balanceBCY: { type: Number, default: 0 },
                revaluedBalanceBCY: { type: Number, default: 0 },
                gainOrLossBCY: { type: Number, default: 0 },
                selected: { type: Boolean, default: true },
            }
        ],
        gainOrLoss: {
            type: Number,
            default: 0,
        },
        notes: {
            type: String,
            required: true,
            trim: true,
        },
        status: {
            type: String,
            enum: ["adjusted", "draft", "void"],
            default: "adjusted",
        },
    },
    {
        timestamps: true,
    }
);

currencyAdjustmentSchema.index({ organization: 1, date: -1 });
currencyAdjustmentSchema.index({ organization: 1, currency: 1 });

const CurrencyAdjustment = mongoose.model<ICurrencyAdjustment>(
    "CurrencyAdjustment",
    currencyAdjustmentSchema
);

export default CurrencyAdjustment;
