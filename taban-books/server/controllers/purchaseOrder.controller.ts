/**
 * Purchase Order Controller
 * Handles Purchase Order CRUD operations
 */

import { Request, Response } from "express";
import PurchaseOrder from "../models/PurchaseOrder.js";
import Vendor from "../models/Vendor.js";
import TransactionNumberSeries from "../models/TransactionNumberSeries.js";
import mongoose from "mongoose";
import { sendEmail } from "../services/email.service.js";
import Organization from "../models/Organization.js";
import { buildSimplePdf } from "../utils/simplePdf.js";

interface AuthRequest extends Request {
  user?: {
    userId: string;
    organizationId: string;
    role: string;
    email?: string;
  };
}

const normalizeText = (value: any): string => String(value ?? '').trim();

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const resolveVendorForOrganization = async ({
  organizationId,
  vendorId,
  vendorName,
}: {
  organizationId: string;
  vendorId?: any;
  vendorName?: any;
}) => {
  const normalizedVendorId = normalizeText(vendorId);
  const normalizedVendorName = normalizeText(vendorName);

  if (normalizedVendorId) {
    if (mongoose.Types.ObjectId.isValid(normalizedVendorId)) {
      const vendorByObjectId = await Vendor.findOne({
        _id: normalizedVendorId,
        organization: organizationId
      });
      if (vendorByObjectId) return vendorByObjectId;
    }

    const vendorByLegacyId = await Vendor.findOne({
      id: normalizedVendorId,
      organization: organizationId
    });
    if (vendorByLegacyId) return vendorByLegacyId;
  }

  if (normalizedVendorName) {
    const exactMatch = new RegExp(`^${escapeRegex(normalizedVendorName)}$`, 'i');
    const vendorByName = await Vendor.findOne({
      organization: organizationId,
      $or: [
        { name: exactMatch },
        { displayName: exactMatch },
        { companyName: exactMatch }
      ]
    });
    if (vendorByName) return vendorByName;
  }

  return null;
};

// Create a new purchase order
export const createPurchaseOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (mongoose.connection.readyState !== 1) {
      res.status(503).json({
        success: false,
        message: 'Database not connected',
        error: 'MongoDB connection is not established.'
      });
      return;
    }

    if (!req.user || !req.user.organizationId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized - Organization ID required'
      });
      return;
    }

    const {
      date,
      purchase_order_number,
      reference_number,
      vendor_name,
      vendor_id,
      status,
      delivery_date,
      total,
      sub_total,
      items,
      notes,
      terms
    } = req.body;

    const vendor = await resolveVendorForOrganization({
      organizationId: req.user.organizationId,
      vendorId: vendor_id,
      vendorName: vendor_name
    });

    if (!vendor) {
      res.status(400).json({
        success: false,
        message: 'Vendor not found'
      });
      return;
    }

    // Check if purchase order number already exists
    const existingPO = await PurchaseOrder.findOne({
      purchaseOrderNumber: purchase_order_number,
      organization: req.user.organizationId
    });

    if (existingPO) {
      console.log('[CreatePO] PO Number exists:', purchase_order_number);
      res.status(400).json({
        success: false,
        message: 'Purchase order number already exists'
      });
      return;
    }

    // Create purchase order items
    console.log('[CreatePO] Processing items...');
    const purchaseOrderItems = items.map((item: any) => ({
      item: item.item || item.item_id || item.id,
      name: item.itemDetails || item.name || 'Unknown Item',
      description: item.description || '',
      quantity: parseFloat(item.quantity) || 0,
      unitPrice: parseFloat(item.rate) || 0,
      total: parseFloat(item.amount) || 0,
      account: item.account_id || item.account
    }));

    // Create new purchase order
    console.log('[CreatePO] Instantiating PurchaseOrder model...');
    const purchaseOrder = new PurchaseOrder({
      organization: req.user.organizationId,
      purchaseOrderNumber: purchase_order_number,
      vendor: vendor._id,
      vendorName: vendor.name || vendor.displayName || vendor.companyName || '',
      date: new Date(date),
      expectedDate: delivery_date ? new Date(delivery_date) : undefined,
      items: purchaseOrderItems,
      subtotal: parseFloat(sub_total) || 0,
      total: parseFloat(total) || 0,
      status: status || 'draft',
      notes: notes || '',
      terms: terms || ''
    });

    console.log('[CreatePO] Saving to database...');
    await purchaseOrder.save();
    console.log('[CreatePO] Save successful');

    // Increment/Sync the transaction number series
    try {
      const series = await TransactionNumberSeries.findOne({
        organization: req.user.organizationId,
        module: 'Purchase Order',
        isDefault: true,
        isActive: true
      });

      if (series) {
        // Extract the number part from the created PO to ensure we sync to the highest number
        // e.g. "PO-00003" -> 3
        let currentPONum = 0;
        if (purchase_order_number && series.prefix) {
          const numPart = purchase_order_number.replace(new RegExp(`^${series.prefix}`, 'i'), '');
          const match = numPart.match(/\d+/);
          if (match) {
            currentPONum = parseInt(match[0], 10);
          }
        }

        // Only update if the new number is higher than what's in the series
        // This ensures monotonic increase
        if (currentPONum > series.currentNumber) {
          series.currentNumber = currentPONum;
          await series.save();
          console.log('[CreatePO] Transaction series synced to:', series.currentNumber);
        }
      }
    } catch (seriesError: any) {
      // Log but don't fail the request if series update fails
      console.error('[CreatePO] Failed to update transaction series:', seriesError);
    }

    res.status(201).json({
      success: true,
      message: 'Purchase order created successfully',
      data: purchaseOrder
    });

  } catch (error: any) {
    console.error('[CreatePO] Error creating purchase order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create purchase order',
      error: error.message
    });
  }
};

// Get all purchase orders
export const getAllPurchaseOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (mongoose.connection.readyState !== 1) {
      res.status(503).json({
        success: false,
        message: 'Database not connected',
        error: 'MongoDB connection is not established.'
      });
      return;
    }

    if (!req.user || !req.user.organizationId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized - Organization ID required'
      });
      return;
    }

    const { page = 1, limit = 10, status, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    const query: any = { organization: req.user.organizationId };
    if (status) {
      query.status = status;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const sortOptions: any = {};
    sortOptions[sortBy as string] = sortOrder === 'desc' ? -1 : 1;

    const purchaseOrders = await PurchaseOrder.find(query)
      .populate('vendor', 'name email')
      .sort(sortOptions)
      .skip(skip)
      .limit(Number(limit));

    const total = await PurchaseOrder.countDocuments(query);

    res.json({
      success: true,
      data: purchaseOrders,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });

  } catch (error: any) {
    console.error('Error fetching purchase orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch purchase orders',
      error: error.message
    });
  }
};

// Get purchase order by ID
export const getPurchaseOrderById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.organizationId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized - Organization ID required'
      });
      return;
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid purchase order ID'
      });
      return;
    }

    const purchaseOrder = await PurchaseOrder.findOne({
      _id: id,
      organization: req.user.organizationId
    }).populate('vendor', 'name email phone address');

    if (!purchaseOrder) {
      res.status(404).json({
        success: false,
        message: 'Purchase order not found'
      });
      return;
    }

    res.json({
      success: true,
      data: purchaseOrder
    });

  } catch (error: any) {
    console.error('Error fetching purchase order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch purchase order',
      error: error.message
    });
  }
};

// Update purchase order
export const updatePurchaseOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.organizationId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized - Organization ID required'
      });
      return;
    }

    const { id } = req.params;
    const updateData = { ...req.body };

    if (updateData.items) {
      updateData.items = updateData.items.map((item: any) => ({
        item: item.item || item.item_id || item.id,
        name: item.itemDetails || item.name || 'Unknown Item',
        description: item.description || '',
        quantity: parseFloat(item.quantity) || 0,
        unitPrice: parseFloat(item.rate) || 0,
        total: parseFloat(item.amount) || 0,
        account: item.account_id || item.account
      }));
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid purchase order ID'
      });
      return;
    }

    const hasVendorUpdate =
      !!updateData.vendor_id ||
      !!updateData.vendor ||
      !!updateData.vendor_name ||
      !!updateData.vendorName;

    // If vendor changes, resolve and normalize fields before update
    if (hasVendorUpdate) {
      const vendor = await resolveVendorForOrganization({
        organizationId: req.user.organizationId,
        vendorId: updateData.vendor_id || updateData.vendor,
        vendorName: updateData.vendor_name || updateData.vendorName
      });

      if (!vendor) {
        res.status(400).json({
          success: false,
          message: 'Vendor not found'
        });
        return;
      }

      updateData.vendorName = vendor.name || vendor.displayName || vendor.companyName || '';
      updateData.vendor = vendor._id;
      delete updateData.vendor_id;
      delete updateData.vendor_name;
    }

    const purchaseOrder = await PurchaseOrder.findOneAndUpdate(
      { _id: id, organization: req.user.organizationId },
      updateData,
      { new: true, runValidators: true }
    ).populate('vendor', 'name email');

    if (!purchaseOrder) {
      res.status(404).json({
        success: false,
        message: 'Purchase order not found'
      });
      return;
    }

    res.json({
      success: true,
      message: 'Purchase order updated successfully',
      data: purchaseOrder
    });

  } catch (error: any) {
    console.error('Error updating purchase order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update purchase order',
      error: error.message
    });
  }
};

// Delete purchase order
export const deletePurchaseOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.organizationId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized - Organization ID required'
      });
      return;
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid purchase order ID'
      });
      return;
    }

    const purchaseOrder = await PurchaseOrder.findOneAndDelete({
      _id: id,
      organization: req.user.organizationId
    });

    if (!purchaseOrder) {
      res.status(404).json({
        success: false,
        message: 'Purchase order not found'
      });
      return;
    }

    res.json({
      success: true,
      message: 'Purchase order deleted successfully'
    });

  } catch (error: any) {
    console.error('Error deleting purchase order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete purchase order',
      error: error.message
    });
  }
};

/**
 * Get next purchase order number from transaction series
 * GET /api/purchase-orders/next-number
 */
export const getNextPurchaseOrderNumber = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.organizationId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized - Organization ID required'
      });
      return;
    }

    // Find the default transaction number series for Purchase Orders
    const series = await TransactionNumberSeries.findOne({
      organization: req.user.organizationId,
      module: 'Purchase Order',
      isDefault: true,
      isActive: true
    });

    if (!series) {
      // If no series found, return a default number
      res.json({
        success: true,
        data: {
          number: 'PO-00001',
          message: 'No transaction series found, using default'
        }
      });
      return;
    }

    // ROBUST STRATEGY: Fetch all Purchase Orders to find the actual maximum number used.
    // This handles cases where POs were deleted (creating gaps) or the series is out of sync.
    // We fetch only the purchaseOrderNumber field for performance.
    const allPOs = await PurchaseOrder.find(
      {
        organization: req.user.organizationId,
        purchaseOrderNumber: { $regex: new RegExp(`^${series.prefix}`, 'i') }
      },
      { purchaseOrderNumber: 1 }
    ).lean();

    let maxUsedNumber = 0;

    // Parse all existing numbers to find the true max
    for (const po of allPOs) {
      if (po.purchaseOrderNumber) {
        // Remove prefix case-insensitively
        const numPart = po.purchaseOrderNumber.replace(new RegExp(`^${series.prefix}`, 'i'), '');
        // Extract digits
        const match = numPart.match(/\d+/);
        if (match) {
          const num = parseInt(match[0], 10);
          if (!isNaN(num) && num > maxUsedNumber) {
            maxUsedNumber = num;
          }
        }
      }
    }

    // The safe next number is robustly calculated as: Max(Series, MaxUsed) + 1
    const effectiveCurrentNumber = Math.max(series.currentNumber, maxUsedNumber);

    // Get the next number (preview only, don't save yet)
    const nextNumber = effectiveCurrentNumber + 1;
    const paddedNumber = nextNumber.toString().padStart(5, '0');
    const formattedNumber = `${series.prefix}${paddedNumber}`;

    // Don't update the series here - it will be updated when the PO is actually created

    res.json({
      success: true,
      data: {
        number: formattedNumber,
        currentNumber: nextNumber
      }
    });

  } catch (error: any) {
    console.error('Error getting next purchase order number:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get next purchase order number',
      error: error.message
    });
  }
};

/**
 * Send Purchase Order via Email
 * POST /api/purchase-orders/:id/email
 */
export const sendPurchaseOrderEmail = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    console.log('[Email] Initiating send for PO ID:', req.params.id);
    if (!req.user || !req.user.organizationId) {
      console.error('[Email] Unauthorized: Missing user or org ID');
      res.status(401).json({
        success: false,
        message: 'Unauthorized - Organization ID required'
      });
      return;
    }

    const { id } = req.params;
    const { to, cc, bcc, subject, body, attachPdf, attachSystemPDF, attachments } = req.body;
    console.log('[Email] Payload:', { to, cc, bcc, subject, bodyLength: body?.length });

    if (!to || (Array.isArray(to) && to.length === 0)) {
      console.error('[Email] Missing recipient');
      res.status(400).json({
        success: false,
        message: 'Recipient email is required'
      });
      return;
    }

    const purchaseOrder = await PurchaseOrder.findOne({
      _id: id,
      organization: req.user.organizationId
    });

    if (!purchaseOrder) {
      console.error('[Email] Purchase order not found for ID:', id);
      res.status(404).json({
        success: false,
        message: 'Purchase order not found'
      });
      return;
    }

    // Convert array to string if needed
    const toString = Array.isArray(to) ? to.join(', ') : to;

    // Build plain text and HTML versions
    const text = body;
    const html = `
      <div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
        <div style="white-space: pre-wrap;">${body}</div>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 12px; color: #999;">This email was sent via Taban Books.</p>
      </div>
    `;

    console.log('[Email] Calling sendEmail service...');
    // Force 'from' to be the SMTP_USER to avoid potential Gmail rejection
    const organization = await Organization.findById(req.user.organizationId).select("settings name");
    const organizationSettings: any = organization?.settings || {};
    const pdfEnabledInSettings = organizationSettings?.pdfSettings?.attachPDFInvoice !== false;
    const encryptPdfEnabled = organizationSettings?.pdfSettings?.encryptPDF === true;
    const shouldAttachSystemPdf = typeof attachSystemPDF === "boolean"
      ? attachSystemPDF
      : (typeof attachPdf === "boolean" ? attachPdf : pdfEnabledInSettings);

    const normalizedAttachments = Array.isArray(attachments)
      ? attachments.filter((a: any) => a && a.filename && (a.path || a.content))
      : [];

    if (shouldAttachSystemPdf) {
      const fileName = `${purchaseOrder.purchaseOrderNumber || "purchase-order"}${encryptPdfEnabled ? "-protected" : ""}.pdf`;
      const lines = [
        `${organization?.name || "Taban"} Purchase Order`,
        `PO Number: ${purchaseOrder.purchaseOrderNumber || "-"}`,
        `Date: ${purchaseOrder.date ? new Date(purchaseOrder.date).toLocaleDateString("en-GB") : "-"}`,
        `Total: ${purchaseOrder.currency || ""} ${Number(purchaseOrder.total || 0).toFixed(2)}`,
        `PDF Protection: ${encryptPdfEnabled ? "Enabled" : "Disabled"}`,
      ];
      normalizedAttachments.push({
        filename: fileName,
        content: buildSimplePdf(lines),
        contentType: "application/pdf",
      });
    }

    const result = await sendEmail({
      to: toString,
      subject,
      html,
      text,
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      attachments: normalizedAttachments,
      organizationId: req.user.organizationId
    });

    console.log('[Email] Service result:', result);

    if (!result.success) {
      console.error('[Email] Service failed to send:', result.error);
      res.status(500).json({
        success: false,
        message: 'Email delivery failed',
        error: result.error
      });
      return;
    }

    // Update status to 'ISSUED' if it was draft
    if (purchaseOrder.status === 'draft') {
      purchaseOrder.status = 'ISSUED';
      await purchaseOrder.save();
      console.log('[Email] PO status updated to ISSUED');
    }

    res.json({
      success: true,
      message: 'Email sent successfully',
      data: result
    });

  } catch (error: any) {
    console.error('[Email] Critical error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send purchase order email',
      error: error.message
    });
  }
};
