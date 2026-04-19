/**
 * Tax Model
 * Tax Rates & Rules
 */

import mongoose, { Document, Schema } from "mongoose";

export interface ITax extends Document {
  organization: mongoose.Types.ObjectId;
  name: string;
  taxId?: string;
  rate: number;
  type: "sales" | "purchase" | "both";
  isActive: boolean;
  isDefault?: boolean;
  description?: string;
  isCompound?: boolean;
  accountToTrackSales?: string;
  accountToTrackPurchases?: string;
  isValueAddedTax?: boolean;
  isDigitalServiceTax?: boolean;
  digitalServiceCountry?: string;
  trackTaxByCountryScheme?: boolean;
  groupTaxes?: mongoose.Types.ObjectId[];
}

const taxSchema = new Schema<ITax>(
  {
    organization: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    name: {
      type: String,
      required: [true, "Tax name is required"],
      trim: true,
    },
    taxId: {
      type: String,
      trim: true,
    },
    rate: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    type: {
      type: String,
      enum: ["sales", "purchase", "both"],
      default: "both",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    description: String,
    isCompound: {
      type: Boolean,
      default: false,
    },
    accountToTrackSales: String,
    accountToTrackPurchases: String,
    isValueAddedTax: {
      type: Boolean,
      default: false,
    },
    isDigitalServiceTax: {
      type: Boolean,
      default: false,
    },
    digitalServiceCountry: {
      type: String,
      trim: true,
    },
    trackTaxByCountryScheme: {
      type: Boolean,
      default: false,
    },
    groupTaxes: [
      {
        type: Schema.Types.ObjectId,
        ref: "Tax",
      },
    ],
  },
  {
    timestamps: true,
  }
);

taxSchema.index({ organization: 1, name: 1 });
taxSchema.index({ organization: 1, isActive: 1 });
taxSchema.index({ organization: 1, isDefault: 1 });

const Tax = mongoose.model<ITax>("Tax", taxSchema);

export default Tax;

