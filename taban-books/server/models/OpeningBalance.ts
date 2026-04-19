import mongoose, { Document, Schema } from "mongoose";

export interface IOpeningBalance extends Document {
    organization: mongoose.Types.ObjectId;
    migrationDate: Date;
    accounts: {
        account: mongoose.Types.ObjectId | string; // Reference to ChartOfAccount or name if not found
        debit: number;
        credit: number;
    }[];
    createdAt?: Date;
    updatedAt?: Date;
}

const openingBalanceSchema = new Schema<IOpeningBalance>(
    {
        organization: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
            unique: true, // Only one opening balance per organization
        },
        migrationDate: {
            type: Date,
            required: true,
        },
        accounts: [
            {
                account: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "ChartOfAccount",
                    required: true,
                },
                debit: {
                    type: Number,
                    default: 0,
                },
                credit: {
                    type: Number,
                    default: 0,
                },
            },
        ],
    },
    {
        timestamps: true,
    }
);

const OpeningBalance = mongoose.model<IOpeningBalance>("OpeningBalance", openingBalanceSchema);

export default OpeningBalance;
