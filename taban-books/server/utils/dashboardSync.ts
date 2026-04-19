import mongoose, { Schema } from "mongoose";
import { ensureSyncState, touchSyncState } from "./syncState.js";

export const DASHBOARD_HOME_RESOURCE = "dashboard-home-bootstrap";
export const DASHBOARD_HOME_SOURCE_RESOURCE = "dashboard-home-bootstrap-source";

const normalizeDate = (value?: Date | string | null) => {
  if (!value) return undefined;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

const normalizeOrganizationId = (value: unknown): string | null => {
  if (!value) return null;

  if (typeof value === "string") {
    return value;
  }

  if (value instanceof mongoose.Types.ObjectId) {
    return String(value);
  }

  if (typeof value === "object" && value !== null && "_id" in (value as any)) {
    return normalizeOrganizationId((value as any)._id);
  }

  if (typeof (value as any)?.toString === "function") {
    const stringValue = String((value as any).toString());
    return stringValue && stringValue !== "[object Object]" ? stringValue : null;
  }

  return null;
};

const scheduleDashboardHomeSourceTouch = (organizationId: string, lastUpdated?: Date | string | null) => {
  void touchSyncState({
    organizationId,
    resource: DASHBOARD_HOME_SOURCE_RESOURCE,
    lastUpdated: normalizeDate(lastUpdated),
  }).catch((error) => {
    console.error("[dashboard-sync] Failed to update home dashboard source state:", error);
  });
};

const resolveOrganizationIdFromQueryContext = async (context: any, result?: any) => {
  const directOrganizationId =
    normalizeOrganizationId(result?.organization) ||
    normalizeOrganizationId(context?.getQuery?.()?.organization);

  if (directOrganizationId) {
    return directOrganizationId;
  }

  const query = context?.getQuery?.();
  if (!query || !context?.model?.findOne) {
    return null;
  }

  const matchedDocument = await context.model.findOne(query).select("organization updatedAt").lean();
  return normalizeOrganizationId(matchedDocument?.organization);
};

export const ensureHomeDashboardSourceState = async (organizationId: string, lastUpdated?: Date) =>
  ensureSyncState({
    organizationId,
    resource: DASHBOARD_HOME_SOURCE_RESOURCE,
    lastUpdated,
  });

export function registerDashboardHomeInvalidationHooks(schema: Schema) {
  schema.post("save", function (doc: any) {
    const organizationId = normalizeOrganizationId(doc?.organization || this?.organization);
    if (!organizationId) return;
    scheduleDashboardHomeSourceTouch(organizationId, doc?.updatedAt || this?.updatedAt || new Date());
  });

  schema.post("insertMany", function (docs: any[]) {
    for (const doc of docs || []) {
      const organizationId = normalizeOrganizationId(doc?.organization);
      if (!organizationId) continue;
      scheduleDashboardHomeSourceTouch(organizationId, doc?.updatedAt || new Date());
    }
  });

  schema.post("findOneAndUpdate", async function (result: any) {
    const organizationId = await resolveOrganizationIdFromQueryContext(this, result);
    if (!organizationId) return;
    scheduleDashboardHomeSourceTouch(organizationId, result?.updatedAt || new Date());
  });

  schema.post("updateOne", async function () {
    const organizationId = await resolveOrganizationIdFromQueryContext(this);
    if (!organizationId) return;
    scheduleDashboardHomeSourceTouch(organizationId, new Date());
  });

  schema.post("updateMany", async function () {
    const organizationId = normalizeOrganizationId(this?.getQuery?.()?.organization);
    if (!organizationId) return;
    scheduleDashboardHomeSourceTouch(organizationId, new Date());
  });

  schema.post("findOneAndDelete", async function (result: any) {
    const organizationId = normalizeOrganizationId(result?.organization);
    if (!organizationId) return;
    scheduleDashboardHomeSourceTouch(organizationId, result?.updatedAt || new Date());
  });

  schema.post("deleteOne", { document: true, query: false }, function () {
    const organizationId = normalizeOrganizationId((this as any)?.organization);
    if (!organizationId) return;
    scheduleDashboardHomeSourceTouch(organizationId, (this as any)?.updatedAt || new Date());
  });

  schema.post("deleteOne", { document: false, query: true }, async function () {
    const organizationId = await resolveOrganizationIdFromQueryContext(this);
    if (!organizationId) return;
    scheduleDashboardHomeSourceTouch(organizationId, new Date());
  });

  schema.post("deleteMany", async function () {
    const organizationId = normalizeOrganizationId(this?.getQuery?.()?.organization);
    if (!organizationId) return;
    scheduleDashboardHomeSourceTouch(organizationId, new Date());
  });
}
