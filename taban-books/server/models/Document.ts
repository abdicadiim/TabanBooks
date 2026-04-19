/**
 * Document Model
 * Documents & Files
 */

import mongoose, { Document as MongooseDocument, Schema } from "mongoose";
import { randomUUID } from "crypto";

export interface IDocument extends MongooseDocument {
  organization: mongoose.Types.ObjectId;
  name: string;
  module?: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  file_hash?: string;
  file_hash_algorithm?: string;
  version_id: string;
  last_updated: Date;
  type?: 'invoice' | 'bill' | 'quote' | 'receipt' | 'expense' | 'payment' | 'contract' | 'other';
  relatedTo?: {
    type?: 'invoice' | 'bill' | 'quote' | 'customer' | 'vendor' | 'project' | 'expense' | 'payment';
    id?: mongoose.Types.ObjectId;
  };
  folder?: string;
  associatedTo?: string;
  uploadedBy: mongoose.Types.ObjectId;
  tags?: string[];
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const documentSchema = new Schema<IDocument>(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    name: {
      type: String,
      required: [true, "Document name is required"],
      trim: true,
    },
    module: {
      type: String,
      default: "Documents",
      trim: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    filePath: {
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
    file_hash: {
      type: String,
      trim: true,
    },
    file_hash_algorithm: {
      type: String,
      default: "sha256",
      trim: true,
    },
    version_id: {
      type: String,
      required: true,
      default: () => randomUUID(),
    },
    last_updated: {
      type: Date,
      required: true,
      default: () => new Date(),
    },
    type: {
      type: String,
      enum: [
        "invoice",
        "bill",
        "quote",
        "receipt",
        "expense",
        "payment",
        "contract",
        "other",
      ],
      default: "other",
    },
    relatedTo: {
      type: {
        type: String,
        enum: [
          "invoice",
          "bill",
          "quote",
          "customer",
          "vendor",
          "project",
          "expense",
          "payment",
        ],
      },
      id: mongoose.Schema.Types.ObjectId,
    },
    folder: {
      type: String,
      default: "root",
    },
    associatedTo: {
      type: String,
      trim: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    tags: [String],
    description: String,
  },
  {
    timestamps: true,
  }
);

documentSchema.pre("save", function syncVersionMetadata(next) {
  this.version_id = randomUUID();
  this.last_updated = new Date();
  next();
});

documentSchema.pre("findOneAndUpdate", function syncUpdatedVersion(next) {
  const update = this.getUpdate() || {};
  const versionFields = {
    version_id: randomUUID(),
    last_updated: new Date(),
  };

  if ("$set" in update && update.$set && typeof update.$set === "object") {
    Object.assign(update.$set, versionFields);
  } else {
    Object.assign(update, versionFields);
  }

  this.setUpdate(update);
  next();
});

documentSchema.index({ organization: 1, name: 1 });
documentSchema.index({ organization: 1, type: 1 });
documentSchema.index({ organization: 1, folder: 1 });
documentSchema.index({ organization: 1, last_updated: -1 });
documentSchema.index({ "relatedTo.type": 1, "relatedTo.id": 1 });

const Document = mongoose.model<IDocument>("Document", documentSchema);

export default Document;
