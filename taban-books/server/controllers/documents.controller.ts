/**
 * Documents Controller
 * Handles File & Document Management
 */

import fs from "fs";
import path from "path";
import { Request, Response } from "express";
import Document from "../models/Document.js";
import { hashFile } from "../utils/fileHash.js";
import { ensureSyncState, touchSyncState } from "../utils/syncState.js";
import {
  applyResourceVersionHeaders,
  buildResourceVersion,
  requestMatchesResourceVersion,
} from "../utils/resourceVersion.js";

const DOCUMENT_SYNC_RESOURCE = "documents";

interface AuthRequest extends Request {
  user?: {
    userId: string;
    organizationId: string;
    role: string;
  };
}

const requireOrganization = (req: AuthRequest, res: Response) => {
  if (!req.user?.organizationId) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return null;
  }
  return req.user.organizationId;
};

const buildDocumentsQuery = (req: AuthRequest) => {
  const { relatedToType, relatedToId, type, module, folder, search } = req.query as Record<string, string>;
  const query: Record<string, unknown> = {
    organization: req.user?.organizationId,
  };

  if (type) {
    query.type = type;
  }

  if (module) {
    query.module = module;
  }

  if (folder) {
    query.folder = folder;
  }

  if (relatedToType) {
    query["relatedTo.type"] = relatedToType;
  }

  if (relatedToId) {
    query["relatedTo.id"] = relatedToId;
  }

  if (search) {
    query.name = { $regex: search, $options: "i" };
  }

  return query;
};

const serializeDocument = (document: any) => {
  const rawDocument = typeof document?.toObject === "function" ? document.toObject() : document;
  const id = String(rawDocument?._id || rawDocument?.id || "");
  const organizationId = String(rawDocument?.organization || "");
  const fileName = String(rawDocument?.fileName || "");

  return {
    ...rawDocument,
    id,
    _id: id,
    version_id: String(rawDocument?.version_id || ""),
    last_updated: rawDocument?.last_updated
      ? new Date(rawDocument.last_updated).toISOString()
      : new Date(rawDocument?.updatedAt || rawDocument?.createdAt || Date.now()).toISOString(),
    file_hash: rawDocument?.file_hash ? String(rawDocument.file_hash) : undefined,
    file_hash_algorithm: rawDocument?.file_hash_algorithm
      ? String(rawDocument.file_hash_algorithm)
      : "sha256",
    createdAt: rawDocument?.createdAt ? new Date(rawDocument.createdAt).toISOString() : undefined,
    updatedAt: rawDocument?.updatedAt ? new Date(rawDocument.updatedAt).toISOString() : undefined,
    download_url: id ? `/api/documents/${encodeURIComponent(id)}/download` : undefined,
    url:
      organizationId && fileName
        ? `/uploads/${encodeURIComponent(organizationId)}/${encodeURIComponent(fileName)}`
        : undefined,
  };
};

const buildSyncPayload = (
  documents: any[],
  syncState: { version_id?: string; last_updated?: Date | string } | null,
  versionState?: { version_id: string; last_updated: string },
) => {
  const items = documents.map((document) => serializeDocument(document));
  const manifest = items.map((document) => ({
    id: document.id,
    version_id: document.version_id,
    last_updated: document.last_updated,
    file_hash: document.file_hash,
    file_hash_algorithm: document.file_hash_algorithm || "sha256",
    file_size: document.fileSize,
    mime_type: document.mimeType,
    download_url: document.download_url,
  }));

  return {
    resource: DOCUMENT_SYNC_RESOURCE,
    version_id: String(versionState?.version_id || syncState?.version_id || ""),
    last_updated:
      versionState?.last_updated ||
      (syncState?.last_updated
        ? new Date(syncState.last_updated).toISOString()
        : new Date().toISOString()),
    items,
    manifest,
    pending_operations: 0,
  };
};

export const getDocuments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const organizationId = requireOrganization(req, res);
    if (!organizationId) return;

    const query = buildDocumentsQuery(req);
    const documents = await Document.find(query).sort({ last_updated: -1, createdAt: -1 });
    res.json({ success: true, data: documents.map((document) => serializeDocument(document)) });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getDocumentsSync = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const organizationId = requireOrganization(req, res);
    if (!organizationId) return;

    const query = buildDocumentsQuery(req);
    const documents = await Document.find(query).sort({ last_updated: -1, createdAt: -1 });
    const latestDocumentUpdate = documents.reduce<Date | undefined>((latest, document) => {
      const candidate = document.last_updated || document.updatedAt || document.createdAt;
      if (!candidate) return latest;
      if (!latest || candidate > latest) {
        return candidate;
      }
      return latest;
    }, undefined);

    const syncState = await ensureSyncState({
      organizationId,
      resource: DOCUMENT_SYNC_RESOURCE,
      lastUpdated: latestDocumentUpdate || new Date(),
    });

    const versionState = buildResourceVersion(DOCUMENT_SYNC_RESOURCE, [
      {
        key: "documents",
        id: documents.map((document) => String(document._id || document.id || "")).join(","),
        updatedAt: syncState?.last_updated || latestDocumentUpdate || new Date(),
        count: documents.length,
        extra: documents
          .map((document) => `${String(document._id || document.id || "")}:${String(document.version_id || "")}`)
          .join("|"),
      },
    ]);

    applyResourceVersionHeaders(res, versionState);

    if (requestMatchesResourceVersion(req, versionState)) {
      res.status(304).end();
      return;
    }

    res.setHeader("Cache-Control", "private, no-cache");

    res.json({
      success: true,
      data: buildSyncPayload(documents, syncState, versionState),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getDocumentById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const organizationId = requireOrganization(req, res);
    if (!organizationId) return;

    const document = await Document.findOne({
      _id: req.params.id,
      organization: organizationId,
    });

    if (!document) {
      res.status(404).json({ success: false, message: "Document not found" });
      return;
    }

    res.json({ success: true, data: serializeDocument(document) });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const downloadDocument = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const organizationId = requireOrganization(req, res);
    if (!organizationId) return;

    const document = await Document.findOne({
      _id: req.params.id,
      organization: organizationId,
    });

    if (!document) {
      res.status(404).json({ success: false, message: "Document not found" });
      return;
    }

    const resolvedPath = path.resolve(document.filePath);
    if (!fs.existsSync(resolvedPath)) {
      res.status(404).json({ success: false, message: "Binary file not found" });
      return;
    }

    res.setHeader("Content-Type", document.mimeType || "application/octet-stream");
    res.setHeader("Content-Disposition", `inline; filename="${document.fileName}"`);
    res.setHeader("X-Document-Version", document.version_id);
    res.setHeader("X-Document-Last-Updated", document.last_updated.toISOString());
    res.setHeader("X-File-Hash-Algorithm", document.file_hash_algorithm || "sha256");
    if (document.file_hash) {
      res.setHeader("ETag", document.file_hash);
    }
    res.sendFile(resolvedPath);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createDocument = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const organizationId = requireOrganization(req, res);
    if (!organizationId) return;

    const file = (req as any).file;
    if (!file) {
      res.status(400).json({ success: false, message: "No file uploaded" });
      return;
    }

    const {
      name,
      module: moduleName,
      folder,
      type,
      relatedToType,
      relatedToId,
      tags,
      description,
    } = req.body as Record<string, any>;

    const storedFileName = file.filename || file.originalname;
    const fileHash = await hashFile(file.path);

    const document = new Document({
      organization: organizationId,
      name: name || file.originalname,
      module: moduleName || "Documents",
      fileName: storedFileName,
      filePath: file.path,
      fileSize: file.size,
      mimeType: file.mimetype,
      file_hash: fileHash,
      type: type || "other",
      relatedTo: relatedToType && relatedToId ? { type: relatedToType, id: relatedToId } : undefined,
      folder: folder || "root",
      associatedTo: undefined,
      uploadedBy: req.user?.userId,
      tags: tags ? (Array.isArray(tags) ? tags : String(tags).split(",").map((tag: string) => tag.trim())) : [],
      description: description || undefined,
    });

    await document.save();
    await touchSyncState({
      organizationId,
      resource: DOCUMENT_SYNC_RESOURCE,
      lastUpdated: document.last_updated,
    });

    res.status(201).json({ success: true, data: serializeDocument(document) });
  } catch (error: any) {
    console.error("[DOCUMENTS] Error creating document:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateDocument = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const organizationId = requireOrganization(req, res);
    if (!organizationId) return;

    const updates: Record<string, unknown> = {};
    const allowed = ["name", "module", "folder", "type", "tags", "description", "associatedTo"];
    for (const key of allowed) {
      if ((req.body as Record<string, unknown>)[key] !== undefined) {
        updates[key] = (req.body as Record<string, unknown>)[key];
      }
    }

    const { relatedToType, relatedToId } = req.body as Record<string, string>;
    if (relatedToType || relatedToId) {
      updates.relatedTo = {
        type: relatedToType,
        id: relatedToId,
      };
    }

    const document = await Document.findOneAndUpdate(
      { _id: req.params.id, organization: organizationId },
      { $set: updates },
      { new: true },
    );

    if (!document) {
      res.status(404).json({ success: false, message: "Document not found" });
      return;
    }

    await touchSyncState({
      organizationId,
      resource: DOCUMENT_SYNC_RESOURCE,
      lastUpdated: document.last_updated,
    });

    res.json({ success: true, data: serializeDocument(document) });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteDocument = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const organizationId = requireOrganization(req, res);
    if (!organizationId) return;

    const deleted = await Document.findOneAndDelete({
      _id: req.params.id,
      organization: organizationId,
    });

    if (!deleted) {
      res.status(404).json({ success: false, message: "Document not found" });
      return;
    }

    await touchSyncState({
      organizationId,
      resource: DOCUMENT_SYNC_RESOURCE,
    });

    res.json({ success: true, message: "Document deleted" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export default { getDocuments };
