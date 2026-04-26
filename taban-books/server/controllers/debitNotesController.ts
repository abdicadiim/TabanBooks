import express from "express";
import mongoose from "mongoose";
import { DebitNote } from "../models/DebitNote.js";
import { sendEmail } from "../services/email.service.js";

const asString = (v: unknown) => (typeof v === "string" ? v : "");
const asNumber = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const asDate = (v: unknown) => (v ? new Date(String(v)) : null);
const normalizeEmail = (value: unknown) => {
  const raw = String(typeof value === "string" ? value : "").trim();
  if (!raw) return "";
  const angle = raw.match(/<([^>]+)>/);
  const candidate = angle?.[1] ? angle[1] : raw;
  const first = candidate.split(/[;,]/)[0]?.trim() || "";
  const match = first.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return String(match?.[0] || first).trim().toLowerCase();
};

const requireOrgId = (req: express.Request, res: express.Response) => {
  const orgId = req.user?.organizationId;
  if (!orgId) {
    res.status(401).json({ success: false, message: "Unauthenticated", data: null });
    return null;
  }
  if (!mongoose.isValidObjectId(orgId)) {
    res.status(400).json({ success: false, message: "Invalid organization", data: null });
    return null;
  }
  return orgId;
};

const normalizeRow = (row: any) => (row ? { ...row, id: String(row._id) } : row);

export const listDebitNotes: express.RequestHandler = async (req, res) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const q = asString(req.query.search ?? req.query.q).trim();
  const status = asString(req.query.status).trim();
  const customerId = asString(req.query.customerId).trim();
  const invoiceId = asString(req.query.invoiceId).trim();
  const limit = Math.max(0, Number(req.query.limit || 0));
  const page = Math.max(1, Number(req.query.page || 1));

  const filter: any = { organizationId: orgId };
  if (status) filter.status = new RegExp(`^${status}$`, "i");
  if (customerId) filter.customerId = customerId;
  if (invoiceId) filter.invoiceId = invoiceId;
  if (q) {
    const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ debitNoteNumber: re }, { customerName: re }, { invoiceNumber: re }];
  }

  const total = await DebitNote.countDocuments(filter);
  let query = DebitNote.find(filter).sort({ date: -1, createdAt: -1 });
  if (limit > 0) query = query.skip((page - 1) * limit).limit(limit);
  const rows = await query.lean();

  return res.json({
    success: true,
    data: rows.map(normalizeRow),
    pagination: {
      total,
      page,
      limit: limit || total,
      pages: limit > 0 ? Math.max(1, Math.ceil(total / limit)) : 1,
    },
  });
};

export const getDebitNoteById: express.RequestHandler = async (req, res) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const id = String(req.params.id || "").trim();
  const row = await DebitNote.findOne({ _id: id, organizationId: orgId }).lean();
  if (!row) return res.status(404).json({ success: false, message: "Debit note not found", data: null });
  return res.json({ success: true, data: normalizeRow(row) });
};

export const createDebitNote: express.RequestHandler = async (req, res) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  try {
    const payload = {
      ...req.body,
      organizationId: orgId,
      debitNoteNumber: String(req.body?.debitNoteNumber || "").trim(),
      customerId: String(req.body?.customerId || req.body?.customer || "").trim(),
      customerName: String(req.body?.customerName || "").trim(),
      invoiceId: String(req.body?.invoiceId || req.body?.invoice || "").trim(),
      invoiceNumber: String(req.body?.invoiceNumber || "").trim(),
      date: asDate(req.body?.debitNoteDate || req.body?.date) || new Date(),
      total: asNumber(req.body?.total),
      balance: asNumber(req.body?.balance ?? req.body?.total),
      status: String(req.body?.status || "open"),
    };

    const created = await DebitNote.create(payload);
    return res.status(201).json({ success: true, data: normalizeRow(created.toObject()) });
  } catch (error: any) {
    const msg = String(error?.message || "");
    if (msg.toLowerCase().includes("duplicate") || msg.toLowerCase().includes("exists")) {
      return res.status(409).json({ success: false, message: "Debit note number already exists", data: null });
    }
    return res.status(500).json({ success: false, message: msg || "Failed to create debit note", data: null });
  }
};

export const updateDebitNote: express.RequestHandler = async (req, res) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const id = String(req.params.id || "").trim();
  const update: any = { ...req.body };
  if (req.body?.debitNoteDate || req.body?.date) {
    update.date = asDate(req.body?.debitNoteDate || req.body?.date) || update.date;
  }

  const updated = await DebitNote.findOneAndUpdate(
    { _id: id, organizationId: orgId },
    { $set: update },
    { new: true }
  ).lean();
  if (!updated) return res.status(404).json({ success: false, message: "Debit note not found", data: null });
  return res.json({ success: true, data: normalizeRow(updated) });
};

export const deleteDebitNote: express.RequestHandler = async (req, res) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const id = String(req.params.id || "").trim();
  await DebitNote.findOneAndDelete({ _id: id, organizationId: orgId }).lean();
  return res.json({ success: true, data: { id } });
};

export const getNextDebitNoteNumber: express.RequestHandler = async (req, res) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const prefix = asString(req.query.prefix || "DN-");
  const last = await DebitNote.findOne({ organizationId: orgId, debitNoteNumber: new RegExp(`^${prefix}`) })
    .sort({ debitNoteNumber: -1 })
    .lean();

  let nextNo = 1;
  if (last) {
    const digits = String((last as any).debitNoteNumber || "").match(/\d+$/);
    if (digits) nextNo = parseInt(digits[0], 10) + 1;
  }

  const nextNumber = `${prefix}${String(nextNo).padStart(6, "0")}`;
  return res.json({ success: true, data: { nextNumber, debitNoteNumber: nextNumber } });
};

export const sendDebitNoteEmail: express.RequestHandler = async (req, res) => {
  try {
    const orgId = requireOrgId(req, res);
    if (!orgId) return;

    const id = String(req.params.id || "").trim();
    if (!id) return res.status(400).json({ success: false, message: "Invalid debit note id", data: null });

    const note: any = await DebitNote.findOne({ _id: id, organizationId: orgId }).lean();
    if (!note) return res.status(404).json({ success: false, message: "Debit note not found", data: null });

    const to = normalizeEmail(req.body?.to);
    if (!to || !to.includes("@")) {
      return res.status(400).json({ success: false, message: "Recipient email is required", data: null });
    }

    const subject = String(req.body?.subject || `Debit Note ${note.debitNoteNumber || ""}`).trim();
    const htmlBody = String(req.body?.body || "").trim();
    const textBody = htmlBody ? htmlBody.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() : subject;

    const rawAttachments = Array.isArray(req.body?.attachments) ? req.body.attachments : [];
    const attachments = rawAttachments
      .map((att: any, index: number) => {
        const filename = String(att?.filename || att?.name || `attachment-${index + 1}`).trim() || `attachment-${index + 1}`;
        const contentType = String(att?.contentType || att?.type || "application/octet-stream").trim();
        const raw = String(att?.content || att?.contentBase64 || "").trim();
        if (!raw) return null;
        const cleaned = raw.includes(",") ? raw.split(",").pop() || raw : raw;
        return {
          filename,
          contentType,
          content: Buffer.from(cleaned, "base64"),
          disposition: "attachment" as const
        };
      })
      .filter(Boolean);
    await sendEmail({
      organizationId: orgId,
      to,
      subject,
      html: htmlBody,
      text: textBody,
      from: String(req.body?.from || "").trim() || undefined,
      attachments: attachments as any,
    });

    await DebitNote.updateOne({ _id: id, organizationId: orgId }, { $set: { status: "Sent" } });
    return res.json({ success: true, data: { id, status: "Sent" } });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: String(error?.message || "SMTP send failed"),
      data: null,
    });
  }
};
