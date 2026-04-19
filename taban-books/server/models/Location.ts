/**
 * Location Model
 * Organization Locations/Branches
 */

import mongoose, { Document, Schema } from "mongoose";

export interface ILocation extends Document {
  organization: mongoose.Types.ObjectId;
  name: string;
  type: "Business" | "Warehouse" | "General";
  isDefault: boolean;
  defaultTransactionSeries: string;
  address: {
    attention: string;
    street: string;
    street1: string;
    street2: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    phone: string;
    fax: string;
  };
  contactPerson: {
    name: string;
    email: string;
    phone: string;
  };
  notes: string;
  parentLocation?: mongoose.Types.ObjectId;
  logo: string;
  isActive: boolean;
}

const locationSchema = new Schema<ILocation>(
  {
    organization: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    name: {
      type: String,
      required: [true, "Location name is required"],
      trim: true,
    },
    type: {
      type: String,
      enum: ["Business", "Warehouse", "General"],
      default: "Business",
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    // Transaction number series
    defaultTransactionSeries: {
      type: String,
      default: "Default Transaction Series",
      trim: true,
    },
    // Address details
    address: {
      attention: { type: String, default: "" },
      street: { type: String, default: "" },
      street1: { type: String, default: "" },
      street2: { type: String, default: "" },
      city: { type: String, default: "" },
      state: { type: String, default: "" },
      zipCode: { type: String, default: "" },
      country: { type: String, default: "" },
      phone: { type: String, default: "" },
      fax: { type: String, default: "" },
    },
    // Additional details
    contactPerson: {
      name: { type: String, default: "" },
      email: { type: String, default: "" },
      phone: { type: String, default: "" },
    },
    notes: {
      type: String,
      default: "",
    },
    // Parent location for child locations
    parentLocation: {
      type: Schema.Types.ObjectId,
      ref: "Location",
      default: null,
    },
    // Logo for location (base64 string)
    logo: {
      type: String,
      default: "",
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
locationSchema.index({ organization: 1 });
locationSchema.index({ organization: 1, name: 1 }, { unique: true });
locationSchema.index({ organization: 1, isDefault: 1 });

// Ensure only one default location per organization
locationSchema.pre("save", async function (next) {
  try {
    if (this.isDefault && this.isModified("isDefault")) {
      // Use the constructor to access the model
      await (this.constructor as any).updateMany(
        {
          organization: this.organization,
          _id: { $ne: this._id },
        },
        { $set: { isDefault: false } }
      );
    }
    next();
  } catch (error: any) {
    next(error);
  }
});

const Location = mongoose.model<ILocation>("Location", locationSchema);

export default Location;

