/**
 * Unit Model
 * Measurement Units for Items
 */

import mongoose, { Document, Schema } from "mongoose";

export interface IUnit extends Document {
  organization: mongoose.Types.ObjectId;
  name: string;
  code?: string;
  description?: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const unitSchema = new Schema<IUnit>(
  {
    organization: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    name: {
      type: String,
      required: [true, "Unit name is required"],
      trim: true,
    },
    code: {
      type: String,
      trim: true,
      uppercase: true,
    },
    description: {
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

// Indexes
unitSchema.index({ organization: 1, name: 1 }, { unique: true });
unitSchema.index({ organization: 1, code: 1 });
unitSchema.index({ organization: 1, isActive: 1 });

const Unit = mongoose.model<IUnit>("Unit", unitSchema);

export default Unit;
