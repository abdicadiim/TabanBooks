import { Request, Response } from "express";
import mongoose from "mongoose";
import Organization from "../models/Organization.js";

interface AuthRequest extends Request {
  user?: {
    userId: string;
    organizationId: string;
    role: string;
  };
}

const DEFAULT_PREFERENCES = {
  emailInsightsEnabled: false,
  signature: "",
};

const DEFAULT_EMAIL_RELAY = {
  servers: [] as any[],
};

const getOrganization = async (organizationId?: string) => {
  if (!organizationId) return null;
  return Organization.findById(organizationId);
};

const getEmailRelaySettings = (organization: any) => {
  const relay = organization?.settings?.emailRelay || {};
  const servers = Array.isArray(relay.servers) ? relay.servers : [];
  return {
    ...DEFAULT_EMAIL_RELAY,
    ...relay,
    servers,
  };
};

const getEmailPreferences = (organization: any) => {
  const prefs = organization?.settings?.emailNotificationPreferences || {};
  return {
    ...DEFAULT_PREFERENCES,
    ...prefs,
  };
};

const sanitizeRelayServer = (server: any) => {
  if (!server) return server;
  const clone = { ...server };
  if (clone.password !== undefined) {
    clone.password = "";
  }
  return clone;
};

const sanitizeRelaySettings = (relaySettings: any) => {
  return {
    ...relaySettings,
    servers: Array.isArray(relaySettings?.servers)
      ? relaySettings.servers.map((server: any) => sanitizeRelayServer(server))
      : [],
  };
};

const toPositiveInt = (value: any, fallback: number): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.floor(parsed));
};

const normalizeSecureConnection = (value: any): "SSL" | "TLS" | "Never" => {
  if (value === "SSL" || value === "TLS" || value === "Never") return value;
  return "TLS";
};

const normalizeDeliveryPreference = (value: any): "domain" | "email" => {
  if (value === "email") return "email";
  return "domain";
};

const buildRelayServerRecord = (payload: any, existing?: any) => {
  const now = new Date().toISOString();
  const authenticationRequired = Boolean(payload.authenticationRequired);
  const record = {
    id: existing?.id || new mongoose.Types.ObjectId().toString(),
    serverName: String(payload.serverName ?? existing?.serverName ?? "").trim(),
    port: toPositiveInt(payload.port ?? existing?.port, 587),
    dailyMailLimit: toPositiveInt(payload.dailyMailLimit ?? existing?.dailyMailLimit, 100),
    useSecureConnection: normalizeSecureConnection(
      payload.useSecureConnection ?? existing?.useSecureConnection
    ),
    mailDeliveryPreference: normalizeDeliveryPreference(
      payload.mailDeliveryPreference ?? existing?.mailDeliveryPreference
    ),
    domainInServer: String(payload.domainInServer ?? existing?.domainInServer ?? "")
      .trim()
      .toLowerCase(),
    authenticationRequired,
    username: authenticationRequired
      ? String(payload.username ?? existing?.username ?? "").trim()
      : "",
    password: authenticationRequired
      ? String(payload.password ?? existing?.password ?? "")
      : "",
    isEnabled:
      payload.isEnabled !== undefined ? Boolean(payload.isEnabled) : Boolean(existing?.isEnabled),
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  if (!record.serverName) {
    return { error: "Server Name is required" };
  }
  if (!record.domainInServer) {
    return { error: "Domain in this Server is required" };
  }
  if (record.authenticationRequired && (!record.username || !record.password)) {
    return { error: "Username and password are required when authentication is enabled" };
  }

  return { data: record };
};

/**
 * GET /api/settings/email-notification-preferences
 */
export const getEmailNotificationPreferences = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const organization = await getOrganization(req.user.organizationId);
    if (!organization) {
      res.status(404).json({ success: false, message: "Organization not found" });
      return;
    }

    res.json({
      success: true,
      data: getEmailPreferences(organization),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/settings/email-notification-preferences
 */
export const updateEmailNotificationPreferences = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const organization = await getOrganization(req.user.organizationId);
    if (!organization) {
      res.status(404).json({ success: false, message: "Organization not found" });
      return;
    }

    const existing = getEmailPreferences(organization);
    const nextPreferences = {
      ...existing,
      ...(req.body || {}),
      emailInsightsEnabled:
        req.body?.emailInsightsEnabled !== undefined
          ? Boolean(req.body.emailInsightsEnabled)
          : existing.emailInsightsEnabled,
      signature:
        req.body?.signature !== undefined
          ? String(req.body.signature ?? "")
          : existing.signature,
    };

    if (!organization.settings) {
      (organization as any).settings = {};
    }
    (organization as any).settings.emailNotificationPreferences = nextPreferences;
    await organization.save();

    res.json({
      success: true,
      message: "Email notification preferences updated successfully",
      data: nextPreferences,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/settings/email-relay
 */
export const getEmailRelayServers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const organization = await getOrganization(req.user.organizationId);
    if (!organization) {
      res.status(404).json({ success: false, message: "Organization not found" });
      return;
    }

    const relaySettings = getEmailRelaySettings(organization);
    res.json({
      success: true,
      data: sanitizeRelaySettings(relaySettings),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/settings/email-relay
 */
export const createEmailRelayServer = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const organization = await getOrganization(req.user.organizationId);
    if (!organization) {
      res.status(404).json({ success: false, message: "Organization not found" });
      return;
    }

    const relaySettings = getEmailRelaySettings(organization);
    const built = buildRelayServerRecord(req.body || {});
    if (built.error) {
      res.status(400).json({ success: false, message: built.error });
      return;
    }

    relaySettings.servers.push(built.data);
    if (!organization.settings) {
      (organization as any).settings = {};
    }
    (organization as any).settings.emailRelay = relaySettings;
    await organization.save();

    res.status(201).json({
      success: true,
      message: "Email relay server created successfully",
      data: sanitizeRelayServer(built.data),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/settings/email-relay/:id
 */
export const updateEmailRelayServer = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const organization = await getOrganization(req.user.organizationId);
    if (!organization) {
      res.status(404).json({ success: false, message: "Organization not found" });
      return;
    }

    const relaySettings = getEmailRelaySettings(organization);
    const index = relaySettings.servers.findIndex((server: any) => server.id === req.params.id);
    if (index < 0) {
      res.status(404).json({ success: false, message: "Relay server not found" });
      return;
    }

    const currentServer = relaySettings.servers[index];
    const built = buildRelayServerRecord(req.body || {}, currentServer);
    if (built.error) {
      res.status(400).json({ success: false, message: built.error });
      return;
    }

    relaySettings.servers[index] = built.data;

    if (!organization.settings) {
      (organization as any).settings = {};
    }
    (organization as any).settings.emailRelay = relaySettings;
    await organization.save();

    res.json({
      success: true,
      message: "Email relay server updated successfully",
      data: sanitizeRelayServer(built.data),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PATCH /api/settings/email-relay/:id/toggle
 */
export const toggleEmailRelayServer = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const organization = await getOrganization(req.user.organizationId);
    if (!organization) {
      res.status(404).json({ success: false, message: "Organization not found" });
      return;
    }

    const relaySettings = getEmailRelaySettings(organization);
    const server = relaySettings.servers.find((entry: any) => entry.id === req.params.id);
    if (!server) {
      res.status(404).json({ success: false, message: "Relay server not found" });
      return;
    }

    const nextEnabled =
      req.body?.enabled !== undefined ? Boolean(req.body.enabled) : !Boolean(server.isEnabled);
    server.isEnabled = nextEnabled;
    server.updatedAt = new Date().toISOString();

    if (!organization.settings) {
      (organization as any).settings = {};
    }
    (organization as any).settings.emailRelay = relaySettings;
    await organization.save();

    res.json({
      success: true,
      message: "Email relay server status updated successfully",
      data: sanitizeRelayServer(server),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * DELETE /api/settings/email-relay/:id
 */
export const deleteEmailRelayServer = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const organization = await getOrganization(req.user.organizationId);
    if (!organization) {
      res.status(404).json({ success: false, message: "Organization not found" });
      return;
    }

    const relaySettings = getEmailRelaySettings(organization);
    const initialCount = relaySettings.servers.length;
    relaySettings.servers = relaySettings.servers.filter(
      (server: any) => server.id !== req.params.id
    );

    if (relaySettings.servers.length === initialCount) {
      res.status(404).json({ success: false, message: "Relay server not found" });
      return;
    }

    if (!organization.settings) {
      (organization as any).settings = {};
    }
    (organization as any).settings.emailRelay = relaySettings;
    await organization.save();

    res.json({
      success: true,
      message: "Email relay server deleted successfully",
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
