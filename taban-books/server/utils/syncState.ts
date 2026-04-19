import { randomUUID } from "crypto";
import SyncState from "../models/SyncState.js";

type SyncStateInput = {
  organizationId: string;
  resource: string;
  lastUpdated?: Date;
};

export const touchSyncState = async ({ organizationId, resource, lastUpdated }: SyncStateInput) =>
  SyncState.findOneAndUpdate(
    {
      organization: organizationId,
      resource,
    },
    {
      $set: {
        version_id: randomUUID(),
        last_updated: lastUpdated || new Date(),
      },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    },
  ).lean();

export const ensureSyncState = async ({ organizationId, resource, lastUpdated }: SyncStateInput) => {
  const existingState = await SyncState.findOne({
    organization: organizationId,
    resource,
  }).lean();

  if (existingState) {
    return existingState;
  }

  return touchSyncState({
    organizationId,
    resource,
    lastUpdated,
  });
};
