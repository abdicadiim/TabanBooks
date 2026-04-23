import mongoose from "mongoose";
import { Request, Response } from "express";
import type { AuthRequest } from "../middleware/auth.middleware.js";
import SalesOrder from "../models/SalesOrder.js";
import Customer from "../models/Customer.js";
import Salesperson from "../models/Salesperson.js";

const SALES_ORDER_PREFIX = "SO-";
const SALES_ORDER_DIGITS = 5;

const toObjectId = (value: any): mongoose.Types.ObjectId | null => {
  const normalized = String(value || "").trim();
  if (!normalized || !mongoose.Types.ObjectId.isValid(normalized)) return null;
  return new mongoose.Types.ObjectId(normalized);
};

const toNumber = (value: any, fallback = 0): number => {
  const parsed = Number(String(value ?? "").replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseDisplayDate = (value: any): Date | undefined => {
  if (!value) return undefined;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

  const text = String(value).trim();
  if (!text) return undefined;

  const ddmmyyyy = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (ddmmyyyy) {
    const [, dd, mm, yyyy] = ddmmyyyy;
    const parsed = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

const buildOrderNumber = async (organizationId: mongoose.Types.ObjectId, preferred?: string): Promise<string> => {
  const trimmedPreferred = String(preferred || "").trim();
  const match = trimmedPreferred.match(/^([A-Za-z-]*?)(\d+)$/);
  const prefix = match?.[1] || SALES_ORDER_PREFIX;
  const existing = await SalesOrder.find({
    organization: organizationId,
    orderNumber: new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\d+$`, "i"),
  })
    .select("orderNumber")
    .lean();

  let highest = 0;
  for (const row of existing) {
    const value = String((row as any)?.orderNumber || "");
    const current = value.match(new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\d+)$`, "i"));
    if (!current) continue;
    highest = Math.max(highest, parseInt(current[1], 10) || 0);
  }

  return `${prefix}${String(highest + 1).padStart(SALES_ORDER_DIGITS, "0")}`;
};

const resolveCustomer = async (organizationId: mongoose.Types.ObjectId, payload: any) => {
  const customerId = toObjectId(payload.customerId || payload.customer);
  if (customerId) {
    const byId = await Customer.findOne({ _id: customerId, organization: organizationId }).select("name displayName email companyName").lean();
    if (byId) return byId;
  }

  const customerName = String(payload.customerName || payload.customerDisplayName || "").trim();
  if (!customerName) return null;

  return Customer.findOne({
    organization: organizationId,
    $or: [
      { name: new RegExp(`^${customerName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
      { displayName: new RegExp(`^${customerName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
      { companyName: new RegExp(`^${customerName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
    ],
  })
    .select("name displayName email companyName")
    .lean();
};

const resolveSalesperson = async (organizationId: mongoose.Types.ObjectId, payload: any) => {
  const salespersonId = toObjectId(payload.salespersonId || payload.salesperson);
  if (salespersonId) {
    const byId = await Salesperson.findOne({ _id: salespersonId, organization: organizationId }).select("name email").lean();
    if (byId) return byId;
  }

  const salespersonName = String(payload.salespersonName || payload.salespersonLabel || payload.salesperson || "").trim();
  if (!salespersonName) return null;

  return Salesperson.findOne({
    organization: organizationId,
    name: new RegExp(`^${salespersonName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
  })
    .select("name email")
    .lean();
};

const mapCustomerName = (customer: any, fallback = ""): string => {
  if (!customer) return String(fallback || "").trim();
  return String(customer.name || customer.displayName || customer.companyName || fallback || "").trim();
};

export const getNextSalesOrderNumber = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ success: false, message: "Organization not found" });
      return;
    }

    const nextNumber = await buildOrderNumber(new mongoose.Types.ObjectId(req.user.organizationId), req.query.prefix as string | undefined);
    res.json({ success: true, data: { nextNumber } });
  } catch (error: any) {
    console.error("[SALES ORDERS] Error generating next number:", error);
    res.status(500).json({ success: false, message: "Failed to generate sales order number", error: error.message });
  }
};

export const getAllSalesOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ success: false, message: "Organization not found" });
      return;
    }

    const query: any = { organization: req.user.organizationId };
    if (req.query.status) query.status = req.query.status;
    if (req.query.customerId) query.customer = req.query.customerId;

    const salesOrders = await SalesOrder.find(query)
      .sort({ createdAt: -1 })
      .populate("customer", "name displayName email companyName")
      .populate("salesperson", "name email")
      .lean();

    res.json({ success: true, data: salesOrders });
  } catch (error: any) {
    console.error("[SALES ORDERS] Error fetching sales orders:", error);
    res.status(500).json({ success: false, message: "Failed to fetch sales orders", error: error.message });
  }
};

export const getSalesOrderById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ success: false, message: "Organization not found" });
      return;
    }

    const salesOrder = await SalesOrder.findOne({
      _id: req.params.id,
      organization: req.user.organizationId,
    })
      .populate("customer", "name displayName email companyName")
      .populate("salesperson", "name email")
      .lean();

    if (!salesOrder) {
      res.status(404).json({ success: false, message: "Sales order not found" });
      return;
    }

    res.json({ success: true, data: salesOrder });
  } catch (error: any) {
    console.error("[SALES ORDERS] Error fetching sales order:", error);
    res.status(500).json({ success: false, message: "Failed to fetch sales order", error: error.message });
  }
};

export const createSalesOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ success: false, message: "Organization not found" });
      return;
    }

    const organizationId = new mongoose.Types.ObjectId(req.user.organizationId);
    const customer = await resolveCustomer(organizationId, req.body);
    if (!customer) {
      res.status(400).json({ success: false, message: "A valid customer is required" });
      return;
    }

    const salesperson = await resolveSalesperson(organizationId, req.body);
    const orderNumber = await buildOrderNumber(organizationId, req.body.orderNumber || req.body.salesOrderNumber);

    const items = Array.isArray(req.body.items)
      ? req.body.items.map((item: any) => ({
          item: toObjectId(item.item) || undefined,
          name: String(item.name || item.itemName || item.description || "").trim(),
          description: String(item.description || "").trim(),
          quantity: toNumber(item.quantity, 0),
          rate: toNumber(item.rate ?? item.unitPrice, 0),
          amount: toNumber(item.amount, 0),
        }))
      : [];

    const subtotal = toNumber(req.body.subtotal ?? req.body.subTotal, 0);
    const total = toNumber(req.body.total, subtotal);

    const salesOrder = await SalesOrder.create({
      organization: organizationId,
      orderNumber,
      customer: customer._id,
      customerName: mapCustomerName(customer, req.body.customerName),
      customerEmail: String(customer.email || req.body.customerEmail || "").trim(),
      date: parseDisplayDate(req.body.date) || new Date(),
      expectedShipmentDate: parseDisplayDate(req.body.expectedShipmentDate),
      referenceNumber: String(req.body.referenceNumber || "").trim(),
      paymentTerms: String(req.body.paymentTerms || "Due on Receipt").trim(),
      deliveryMethod: String(req.body.deliveryMethod || "").trim(),
      salesperson: salesperson?._id || null,
      salespersonName: String(salesperson?.name || req.body.salespersonName || req.body.salesperson || "").trim(),
      warehouseLocation: String(req.body.warehouseLocation || "Head Office").trim(),
      items,
      subtotal,
      total,
      notes: String(req.body.notes || req.body.customerNotes || "").trim(),
      termsAndConditions: String(req.body.termsAndConditions || req.body.terms || "").trim(),
      status: String(req.body.status || "draft").toLowerCase() === "sent" ? "sent" : "draft",
      attachedFiles: Array.isArray(req.body.attachedFiles) ? req.body.attachedFiles : [],
    });

    const populated = await SalesOrder.findById(salesOrder._id)
      .populate("customer", "name displayName email companyName")
      .populate("salesperson", "name email")
      .lean();

    res.status(201).json({ success: true, data: populated || salesOrder });
  } catch (error: any) {
    console.error("[SALES ORDERS] Error creating sales order:", error);
    res.status(500).json({ success: false, message: "Failed to create sales order", error: error.message });
  }
};

export const updateSalesOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ success: false, message: "Organization not found" });
      return;
    }

    const salesOrder = await SalesOrder.findOne({
      _id: req.params.id,
      organization: req.user.organizationId,
    });

    if (!salesOrder) {
      res.status(404).json({ success: false, message: "Sales order not found" });
      return;
    }

    const customer = req.body.customerId || req.body.customerName ? await resolveCustomer(new mongoose.Types.ObjectId(req.user.organizationId), req.body) : null;
    const salesperson = req.body.salespersonId || req.body.salespersonName || req.body.salesperson
      ? await resolveSalesperson(new mongoose.Types.ObjectId(req.user.organizationId), req.body)
      : null;

    salesOrder.set({
      orderNumber: req.body.orderNumber || req.body.salesOrderNumber || salesOrder.orderNumber,
      customer: customer?._id || salesOrder.customer,
      customerName: customer ? mapCustomerName(customer, req.body.customerName) : salesOrder.customerName,
      customerEmail: customer ? String(customer.email || "") : salesOrder.customerEmail,
      date: parseDisplayDate(req.body.date) || salesOrder.date,
      expectedShipmentDate: parseDisplayDate(req.body.expectedShipmentDate) || salesOrder.expectedShipmentDate,
      referenceNumber: String(req.body.referenceNumber ?? salesOrder.referenceNumber ?? "").trim(),
      paymentTerms: String(req.body.paymentTerms ?? salesOrder.paymentTerms ?? "Due on Receipt").trim(),
      deliveryMethod: String(req.body.deliveryMethod ?? salesOrder.deliveryMethod ?? "").trim(),
      salesperson: salesperson?._id || salesOrder.salesperson,
      salespersonName: salesperson ? String(salesperson.name || "") : salesOrder.salespersonName,
      warehouseLocation: String(req.body.warehouseLocation ?? salesOrder.warehouseLocation ?? "Head Office").trim(),
      items: Array.isArray(req.body.items)
        ? req.body.items.map((item: any) => ({
            item: toObjectId(item.item) || undefined,
            name: String(item.name || item.itemName || item.description || "").trim(),
            description: String(item.description || "").trim(),
            quantity: toNumber(item.quantity, 0),
            rate: toNumber(item.rate ?? item.unitPrice, 0),
            amount: toNumber(item.amount, 0),
          }))
        : salesOrder.items,
      subtotal: toNumber(req.body.subtotal ?? req.body.subTotal, salesOrder.subtotal || 0),
      total: toNumber(req.body.total, salesOrder.total || 0),
      notes: String(req.body.notes ?? req.body.customerNotes ?? salesOrder.notes ?? "").trim(),
      termsAndConditions: String(req.body.termsAndConditions ?? req.body.terms ?? salesOrder.termsAndConditions ?? "").trim(),
      status: String(req.body.status || salesOrder.status || "draft").toLowerCase() === "sent" ? "sent" : "draft",
      attachedFiles: Array.isArray(req.body.attachedFiles) ? req.body.attachedFiles : salesOrder.attachedFiles,
    });

    await salesOrder.save();

    const populated = await SalesOrder.findById(salesOrder._id)
      .populate("customer", "name displayName email companyName")
      .populate("salesperson", "name email")
      .lean();

    res.json({ success: true, data: populated || salesOrder });
  } catch (error: any) {
    console.error("[SALES ORDERS] Error updating sales order:", error);
    res.status(500).json({ success: false, message: "Failed to update sales order", error: error.message });
  }
};

export const deleteSalesOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ success: false, message: "Organization not found" });
      return;
    }

    const deleted = await SalesOrder.findOneAndDelete({
      _id: req.params.id,
      organization: req.user.organizationId,
    });

    if (!deleted) {
      res.status(404).json({ success: false, message: "Sales order not found" });
      return;
    }

    res.json({ success: true, message: "Sales order deleted successfully" });
  } catch (error: any) {
    console.error("[SALES ORDERS] Error deleting sales order:", error);
    res.status(500).json({ success: false, message: "Failed to delete sales order", error: error.message });
  }
};
