/**
 * PDF Template Model
 * Stores custom PDF designs for various document modules.
 */

import mongoose, { Document, Schema } from "mongoose";

export interface IPDFTemplate extends Document {
  organization: mongoose.Types.ObjectId;
  id: string; // Frontend/External ID
  name: string;
  moduleType: string;
  language?: string;
  status: "active" | "inactive";
  isDefault: boolean;
  family?: string;
  preview?: string;
  config: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const pdfTemplateSchema = new Schema<IPDFTemplate>(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    id: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    moduleType: {
      type: String,
      required: true,
      index: true,
    },
    language: {
      type: String,
      default: "English",
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    family: {
      type: String,
      default: "standard",
    },
    preview: {
      type: String,
      default: "standard",
    },
    config: {
      type: Schema.Types.Mixed,
      required: true,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

pdfTemplateSchema.index({ organization: 1, moduleType: 1 });
pdfTemplateSchema.index({ organization: 1, status: 1 });
pdfTemplateSchema.index({ organization: 1, isDefault: 1 });

const PDFTemplate = mongoose.model<IPDFTemplate>("PDFTemplate", pdfTemplateSchema);

export default PDFTemplate;
