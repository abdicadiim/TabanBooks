import mongoose, { Document, Schema } from "mongoose";

export interface IPaymentMode extends Document {
    organization: mongoose.Types.ObjectId;
    name: string;
    isDefault: boolean;
    isActive: boolean;
}

const paymentModeSchema = new Schema<IPaymentMode>(
    {
        organization: {
            type: Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        isDefault: {
            type: Boolean,
            default: false,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

// Compound index for uniqueness per organization
paymentModeSchema.index({ organization: 1, name: 1 }, { unique: true });

const PaymentMode = mongoose.model<IPaymentMode>("PaymentMode", paymentModeSchema);

export default PaymentMode;
