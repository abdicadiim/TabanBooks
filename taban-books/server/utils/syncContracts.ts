import Joi from "joi";

export type SyncVersionCheckQuery = {
  last_updated?: string;
  version_id?: string;
};

export type SyncManifestEntry = {
  id: string;
  version_id: string;
  last_updated: string;
  file_hash?: string;
  file_hash_algorithm?: string;
  file_size?: number;
  mime_type?: string;
  download_url?: string;
};

export type SyncEnvelope<TItem> = {
  resource: string;
  version_id: string;
  last_updated: string;
  items: TItem[];
  manifest?: SyncManifestEntry[];
  pending_operations?: number;
};

export const syncVersionCheckQuerySchema = Joi.object<SyncVersionCheckQuery>({
  last_updated: Joi.string().isoDate().optional(),
  version_id: Joi.string().min(8).optional(),
}).unknown(false);

export const syncManifestEntrySchema = Joi.object<SyncManifestEntry>({
  id: Joi.string().required(),
  version_id: Joi.string().min(8).required(),
  last_updated: Joi.string().isoDate().required(),
  file_hash: Joi.string().allow("").optional(),
  file_hash_algorithm: Joi.string().allow("").optional(),
  file_size: Joi.number().integer().min(0).optional(),
  mime_type: Joi.string().allow("").optional(),
  download_url: Joi.string().allow("").optional(),
}).unknown(true);

export const syncEnvelopeSchema = Joi.object({
  resource: Joi.string().required(),
  version_id: Joi.string().min(8).required(),
  last_updated: Joi.string().isoDate().required(),
  items: Joi.array().required(),
  manifest: Joi.array().items(syncManifestEntrySchema).optional(),
  pending_operations: Joi.number().integer().min(0).optional(),
}).unknown(true);

