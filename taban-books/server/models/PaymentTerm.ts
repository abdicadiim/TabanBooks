import mongoose, { Document, Schema } from "mongoose";

export interface IPaymentTerm extends Document {
    organization: mongoose.Types.ObjectId;
    name: string;
    days: number;
    isDefault: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const paymentTermSchema = new Schema<IPaymentTerm>(
    {
        organization: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        days: {
            type: Number,
            required: true,
            min: 0,
        },
        isDefault: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

paymentTermSchema.index({ organization: 1, name: 1 }, { unique: true });

const PaymentTerm = mongoose.model<IPaymentTerm>("PaymentTerm", paymentTermSchema);

export default PaymentTerm;
