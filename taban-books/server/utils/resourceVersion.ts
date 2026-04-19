import { createHash } from "crypto";
import type { Request, Response } from "express";

type ResourceVersionComponent = {
  key: string;
  id?: string | number | null;
  updatedAt?: Date | string | null;
  count?: number | null;
  extra?: string | number | boolean | null;
};

export type ResourceVersion = {
  resource: string;
  version_id: string;
  last_updated: string;
};

function normalizeDate(value?: Date | string | null) {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function normalizeEtag(value?: string | null) {
  return String(value || "")
    .trim()
    .replace(/^W\//, "")
    .replace(/^"(.*)"$/, "$1");
}

export function buildResourceVersion(resource: string, components: ResourceVersionComponent[]): ResourceVersion {
  const normalizedComponents = [...components]
    .map((component) => ({
      key: component.key,
      id: component.id == null ? "" : String(component.id),
      updatedAt: normalizeDate(component.updatedAt)?.toISOString() || "",
      count: Number(component.count || 0),
      extra: component.extra == null ? "" : String(component.extra),
    }))
    .sort((left, right) => left.key.localeCompare(right.key));

  const version_id = createHash("sha1")
    .update(
      JSON.stringify({
        resource,
        components: normalizedComponents,
      }),
    )
    .digest("hex");

  const latestUpdate = normalizedComponents.reduce<Date | null>((latest, component) => {
    const candidate = normalizeDate(component.updatedAt);
    if (!candidate) return latest;
    if (!latest || candidate > latest) {
      return candidate;
    }
    return latest;
  }, null);

  return {
    resource,
    version_id,
    last_updated: (latestUpdate || new Date()).toISOString(),
  };
}

export function applyResourceVersionHeaders(res: Response, version: ResourceVersion) {
  res.setHeader("Cache-Control", "private, no-cache");
  res.setHeader("ETag", `"${version.version_id}"`);
  res.setHeader("Last-Modified", new Date(version.last_updated).toUTCString());
  res.setHeader("X-Resource-Name", version.resource);
  res.setHeader("X-Resource-Version", version.version_id);
  res.setHeader("X-Resource-Last-Updated", version.last_updated);
}

export function requestMatchesResourceVersion(req: Request, version: ResourceVersion) {
  const clientVersionId = normalizeEtag(req.get("If-None-Match") || String(req.query.version_id || ""));
  if (clientVersionId && clientVersionId === version.version_id) {
    return true;
  }

  const clientLastUpdated = req.get("If-Modified-Since") || String(req.query.last_updated || "");
  if (!clientLastUpdated) {
    return false;
  }

  const clientTimestamp = normalizeDate(clientLastUpdated);
  const serverTimestamp = normalizeDate(version.last_updated);

  if (!clientTimestamp || !serverTimestamp) {
    return false;
  }

  return clientTimestamp.getTime() >= serverTimestamp.getTime();
}
