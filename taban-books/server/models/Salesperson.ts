/**
 * Salesperson Model
 * Sales Team Members
 */

import mongoose, { Document, Schema } from "mongoose";

export interface ISalesperson extends Document {
  organization: mongoose.Types.ObjectId;
  name: string;
  email: string;
  phone?: string;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const salespersonSchema = new Schema<ISalesperson>(
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
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      trim: true,
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

salespersonSchema.index({ organization: 1, email: 1 }, { unique: true });
salespersonSchema.index({ organization: 1, name: 1 });

const Salesperson = mongoose.model<ISalesperson>("Salesperson", salespersonSchema);

export default Salesperson;
