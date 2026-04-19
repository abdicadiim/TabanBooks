/**
 * Branding Model
 * Organization Branding Settings
 */

import mongoose, { Document, Schema } from "mongoose";

export interface IBranding extends Document {
  organization: mongoose.Types.ObjectId;
  appearance: "dark" | "light";
  accentColor: string;
  sidebarDarkFrom: string;
  sidebarDarkTo: string;
  sidebarLightFrom: string;
  sidebarLightTo: string;
  keepZohoBranding: boolean;
  isActive: boolean;
}

const brandingSchema = new Schema<IBranding>(
  {
    organization: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      unique: true, // One branding per organization
    },
    // Appearance Settings
    appearance: {
      type: String,
      enum: ["dark", "light"],
      default: "dark",
    },
    // Accent Color
    accentColor: {
      type: String,
      default: "#3b82f6", // Blue
      trim: true,
    },
    // Sidebar Colors (for dark mode) - using solid New button color
    sidebarDarkFrom: {
      type: String,
      default: "#0f4e5a", // Dark Pine Teal
      trim: true,
    },
    sidebarDarkTo: {
      type: String,
      default: "#0f4e5a", // Solid (no gradient)
      trim: true,
    },
    // Sidebar Colors (for light mode) - using light grey (expense form background)
    sidebarLightFrom: {
      type: String,
      default: "#f9fafb", // bg-gray-50 (expense form background)
      trim: true,
    },
    sidebarLightTo: {
      type: String,
      default: "#f3f4f6", // bg-gray-100 (slightly darker)
      trim: true,
    },
    // Keep Taban Books Branding
    keepZohoBranding: {
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

// Indexes
// organization index is already handled by unique: true in schema definition

const Branding = mongoose.model<IBranding>("Branding", brandingSchema);

export default Branding;


