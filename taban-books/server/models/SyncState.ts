import mongoose, { Document as MongooseDocument, Schema } from "mongoose";

export interface ISyncState extends MongooseDocument {
  organization: mongoose.Types.ObjectId;
  resource: string;
  version_id: string;
  last_updated: Date;
  payload?: string;
  payload_refreshed_at?: Date;
  payload_size_bytes?: number;
}

const syncStateSchema = new Schema<ISyncState>(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    resource: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    version_id: {
      type: String,
      required: true,
    },
    last_updated: {
      type: Date,
      required: true,
      default: () => new Date(),
    },
    payload: {
      type: String,
      default: "",
    },
    payload_refreshed_at: {
      type: Date,
      default: null,
    },
    payload_size_bytes: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

syncStateSchema.index({ organization: 1, resource: 1 }, { unique: true });

const SyncState = mongoose.model<ISyncState>("SyncState", syncStateSchema);

export default SyncState;
