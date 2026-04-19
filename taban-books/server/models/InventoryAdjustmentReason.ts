
import mongoose, { Document, Schema } from "mongoose";

export interface IInventoryAdjustmentReason extends Document {
    organization: mongoose.Types.ObjectId;
    name: string;
}

const inventoryAdjustmentReasonSchema = new Schema<IInventoryAdjustmentReason>(
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
    },
    {
        timestamps: true,
    }
);

inventoryAdjustmentReasonSchema.index({ organization: 1, name: 1 }, { unique: true });

const InventoryAdjustmentReason = (mongoose.models.InventoryAdjustmentReason as mongoose.Model<IInventoryAdjustmentReason>) || mongoose.model<IInventoryAdjustmentReason>("InventoryAdjustmentReason", inventoryAdjustmentReasonSchema);

export default InventoryAdjustmentReason;
