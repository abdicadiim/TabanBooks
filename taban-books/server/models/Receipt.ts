import mongoose, { Document, Schema } from "mongoose";

export interface IReceipt extends Document {
    organization: mongoose.Types.ObjectId;
    name: string;
    fileName: string;
    dataUrl: string;
    fileSize: number;
    mimeType: string;
    amount?: number;
    currency?: string;
    date?: Date;
    vendor?: string;
    status: 'PENDING' | 'PROCESSED' | 'CONVERTED';
    uploadedBy: mongoose.Types.ObjectId;
    createdAt?: Date;
    updatedAt?: Date;
}

const receiptSchema = new Schema<IReceipt>(
    {
        organization: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
        },
        name: {
            type: String,
            required: [true, "Receipt name is required"],
            trim: true,
        },
        fileName: {
            type: String,
            required: true,
        },
        dataUrl: {
            type: String,
            required: true,
        },
        fileSize: {
            type: Number,
            required: true,
        },
        mimeType: {
            type: String,
            required: true,
        },
        amount: {
            type: Number,
            default: 0,
        },
        currency: {
            type: String,
            default: "USD",
        },
        date: {
            type: Date,
            default: Date.now,
        },
        vendor: {
            type: String,
            default: "Unknown Vendor",
        },
        status: {
            type: String,
            enum: ["PENDING", "PROCESSED", "CONVERTED"],
            default: "PROCESSED",
        },
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

receiptSchema.index({ organization: 1, createdAt: -1 });

const Receipt = mongoose.model<IReceipt>("Receipt", receiptSchema);

export default Receipt;
