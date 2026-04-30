/**
 * Inventory Controller
 * Handles Items and Inventory Adjustments
 */

import { Request, Response } from "express";
import Item from "../models/Item.js";
import ChartOfAccount from "../models/ChartOfAccount.js";
import InventoryAdjustment from "../models/InventoryAdjustment.js";
import InventoryAdjustmentReason from "../models/InventoryAdjustmentReason.js";
import JournalEntry from "../models/JournalEntry.js";
import mongoose from "mongoose";
import { checkAndNotifyReorderPoint } from "../utils/reorderPointNotification.js";
import { getItemsSettings, formatQuantity } from "../utils/itemsSettings.js";

interface AuthRequest extends Request {
  user?: {
    userId: string;
    organizationId: string;
    role: string;
    email?: string;
  };
}

interface ItemQuery {
  page?: string;
  limit?: string;
  search?: string;
  type?: string;
  isActive?: string;
  sortBy?: string;
  sortOrder?: string;
}

// Helper to get organization filter consistent with getItems
const getOrgFilter = (orgId: any) => {
  if (!orgId) return {};
  if (mongoose.Types.ObjectId.isValid(String(orgId))) {
    try {
      const orgObjectId = new mongoose.Types.ObjectId(String(orgId));
      return {
        $or: [
          { organization: orgObjectId },
          { organization: String(orgId) }
        ]
      };
    } catch (e) {
      return { organization: String(orgId) };
    }
  }
  return { organization: String(orgId) };
};

const toNumber = (value: any): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const getValueDelta = (items: any[]): number => {
  return (items || []).reduce((sum: number, item: any) => sum + toNumber(item?.quantityAdjusted), 0);
};

const createInventoryAdjustmentJournalEntry = async (
  adjustment: any,
  organizationId: string,
  userId: string,
  totalValue: number,
): Promise<void> => {
  if (!(totalValue > 0)) {
    return;
  }

  const [inventoryAssetAccount, costOfGoodsSoldAccount] = await Promise.all([
    ChartOfAccount.findOne({
      organization: organizationId,
      $or: [{ accountName: 'Inventory Asset' }, { accountType: 'stock' }]
    }),
    ChartOfAccount.findOne({
      organization: organizationId,
      $or: [
        { accountName: adjustment.account || 'Cost of Goods Sold' },
        { accountType: 'cost_of_goods_sold' }
      ]
    }),
  ]);

  const debitAccount = inventoryAssetAccount?._id?.toString() || 'Inventory Asset';
  const creditAccount = costOfGoodsSoldAccount?._id?.toString() || adjustment.account || 'Cost of Goods Sold';
  const journalNumber = `JE-${adjustment.adjustmentNumber || adjustment.referenceNumber || Date.now()}`;
  const valueDelta = getValueDelta(adjustment.items as any[]);
  const absValueDelta = Math.abs(valueDelta);

  const lines = adjustment.type === 'Value'
    ? [
      {
        account: debitAccount,
        accountName: inventoryAssetAccount?.accountName || 'Inventory Asset',
        description: 'Inventory Value Adjustment',
        debit: valueDelta >= 0 ? absValueDelta : 0,
        credit: valueDelta < 0 ? absValueDelta : 0
      },
      {
        account: creditAccount,
        accountName: costOfGoodsSoldAccount?.accountName || adjustment.account || 'Cost of Goods Sold',
        description: `Inventory Adjustment - ${adjustment.reason}`,
        debit: valueDelta < 0 ? absValueDelta : 0,
        credit: valueDelta >= 0 ? absValueDelta : 0
      }
    ]
    : [
      {
        account: debitAccount,
        accountName: inventoryAssetAccount?.accountName || 'Inventory Asset',
        description: 'Inventory Adjustment - Stock',
        debit: adjustment.type === 'Quantity' && adjustment.reason !== 'Found' ? 0 : totalValue,
        credit: adjustment.type === 'Quantity' && adjustment.reason !== 'Found' ? totalValue : 0
      },
      {
        account: creditAccount,
        accountName: costOfGoodsSoldAccount?.accountName || adjustment.account || 'Cost of Goods Sold',
        description: `Inventory Adjustment - ${adjustment.reason}`,
        debit: adjustment.type === 'Quantity' && adjustment.reason !== 'Found' ? totalValue : 0,
        credit: adjustment.type === 'Quantity' && adjustment.reason !== 'Found' ? 0 : totalValue
      }
    ];

  await JournalEntry.create({
    organization: organizationId,
    entryNumber: journalNumber,
    date: adjustment.date || new Date(),
    reference: adjustment.adjustmentNumber || adjustment.referenceNumber,
    description: `Inventory Adjustment - ${adjustment.adjustmentNumber || adjustment.referenceNumber}`,
    status: 'posted',
    postedBy: userId,
    postedAt: new Date(),
    sourceId: adjustment._id,
    sourceType: 'inventory_adjustment',
    lines
  });
};

const applyValueRevaluation = async (items: any[], organizationId: string, reverse = false): Promise<void> => {
  for (const adjItem of items || []) {
    if (!adjItem?.item) continue;

    const itemDoc = await Item.findOne({ _id: adjItem.item, ...getOrgFilter(organizationId) });
    if (!itemDoc) continue;

    const qtyOnHand = toNumber(adjItem.quantityOnHand) || toNumber(itemDoc.stockQuantity);
    if (qtyOnHand <= 0) continue;

    const changedValue = toNumber(adjItem.newQuantity);
    const valueDelta = toNumber(adjItem.quantityAdjusted);
    const previousValue = changedValue - valueDelta;
    const targetValue = reverse ? previousValue : changedValue;
    const newCostPrice = targetValue / qtyOnHand;

    await Item.findOneAndUpdate(
      { _id: adjItem.item, ...getOrgFilter(organizationId) },
      { costPrice: newCostPrice },
      { new: true }
    );
  }
};

// Get all items
export const getItems = async (req: AuthRequest, res: Response): Promise<void> => {
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
      page = '1',
      limit = '50',
      search = '',
      type,
      isActive,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query as ItemQuery;

    const query: any = {};
    const orgId = req.user.organizationId;

    // Build organization filter
    const orgFilter = getOrgFilter(orgId);

    // Combine filters
    const andConditions: any[] = [orgFilter];

    if (search && search.trim()) {
      andConditions.push({
        $or: [
          { name: { $regex: search.trim(), $options: 'i' } },
          { sku: { $regex: search.trim(), $options: 'i' } },
          { description: { $regex: search.trim(), $options: 'i' } }
        ]
      });
    }

    if (type) {
      andConditions.push({ type: type });
    }
    if (isActive !== undefined) {
      andConditions.push({ isActive: isActive === 'true' });
    }

    if (andConditions.length > 1) {
      query.$and = andConditions;
    } else if (andConditions.length === 1) {
      Object.assign(query, andConditions[0]);
    } else {
      Object.assign(query, orgFilter);
    }

    const validSortFields = ['createdAt', 'updatedAt', 'name', 'sku'];
    const safeSortBy = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const sort: any = {};
    sort[safeSortBy] = sortOrder === 'asc' ? 1 : -1;

    const skip = Math.max(0, (parseInt(page) - 1) * parseInt(limit));
    const limitValue = Math.max(1, Math.min(100, parseInt(limit)));

    const items = await Item.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limitValue)
      .select('-__v')
      .lean();

    const total = await Item.countDocuments(query);

    res.json({
      success: true,
      data: items,
      pagination: {
        page: parseInt(page),
        limit: limitValue,
        total,
        pages: Math.ceil(total / limitValue)
      }
    });
  } catch (error: any) {
    console.error('Error in getItems:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code,
      hasUser: !!req.user,
      organizationId: req.user?.organizationId,
      dbReadyState: mongoose.connection.readyState
    });
    res.status(500).json({
      success: false,
      message: 'Error fetching items',
      error: error.message
    });
  }
};

// Get item by ID
export const getItem = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const item = await Item.findOne({
      _id: id,
      ...getOrgFilter(req.user.organizationId)
    }).lean();

    if (!item) {
      res.status(404).json({ success: false, message: 'Item not found' });
      return;
    }

    res.json({ success: true, data: item });
  } catch (error: any) {
    console.error('Error in getItem:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching item',
      error: error.message
    });
  }
};

// Create item
export const createItem = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    // Get items settings
    const settings = await getItemsSettings(req.user.organizationId);

    // Check for duplicate names if not allowed
    if (!settings.allowDuplicateNames && req.body.name) {
      const existingItem = await Item.findOne({
        organization: req.user.organizationId,
        name: req.body.name.trim(),
      });

      if (existingItem) {
        res.status(400).json({
          success: false,
          message: `An item with the name "${req.body.name}" already exists. Please use a different name or enable "Allow duplicate item names" in settings.`,
        });
        return;
      }
    }

    const itemData = {
      ...req.body,
      organization: req.user.organizationId,
      stockQuantity: formatQuantity(req.body.openingStock || 0, settings.decimalPlaces)
    };

    const item = await Item.create(itemData);
    res.status(201).json({ success: true, data: item });
  } catch (error: any) {
    console.error('Error in createItem:', error);

    // Handle duplicate key error
    if (error.code === 11000) {
      res.status(400).json({
        success: false,
        message: 'An item with this name or SKU already exists.',
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Error creating item',
      error: error.message
    });
  }
};

// Update item
export const updateItem = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;

    // If openingStock is changing, we need to adjust stockQuantity
    if (req.body.openingStock !== undefined) {
      const oldItem = await Item.findOne({ _id: id, ...getOrgFilter(req.user.organizationId) });
      if (oldItem) {
        const settings = await getItemsSettings(req.user.organizationId);
        const diff = (req.body.openingStock || 0) - (oldItem.openingStock || 0);
        if (diff !== 0) {
          req.body.stockQuantity = formatQuantity((oldItem.stockQuantity || 0) + diff, settings.decimalPlaces);
        }
      }
    }

    const item = await Item.findOneAndUpdate(
      { _id: id, ...getOrgFilter(req.user.organizationId) },
      req.body,
      { new: true, runValidators: true }
    );

    if (!item) {
      res.status(404).json({ success: false, message: 'Item not found' });
      return;
    }

    // Check reorder point notification if stock quantity changed
    if (req.body.stockQuantity !== undefined) {
      const newStock = item.stockQuantity || 0;
      checkAndNotifyReorderPoint(
        req.user.organizationId,
        id,
        newStock
      ).catch(err => {
        console.error(`[INVENTORY] Error checking reorder point for item ${id}:`, err);
      });
    }

    res.json({ success: true, data: item });
  } catch (error: any) {
    console.error('Error in updateItem:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating item',
      error: error.message
    });
  }
};

// Delete item
export const deleteItem = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const item = await Item.findOneAndDelete({
      _id: id,
      organization: req.user.organizationId
    });

    if (!item) {
      res.status(404).json({ success: false, message: 'Item not found' });
      return;
    }

    res.json({ success: true, message: 'Item deleted' });
  } catch (error: any) {
    console.error('Error in deleteItem:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting item',
      error: error.message
    });
  }
};

// Get all inventory adjustments
export const getInventoryAdjustments = async (req: AuthRequest, res: Response): Promise<void> => {
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

    const query: any = {};
    const orgId = req.user.organizationId;

    if (mongoose.Types.ObjectId.isValid(orgId as string)) {
      const orgObjectId = new mongoose.Types.ObjectId(orgId as string);
      query.organization = { $in: [orgObjectId, String(orgId)] };
    } else {
      query.organization = String(orgId);
    }

    const adjustments = await InventoryAdjustment.find(query)
      .populate('items.item')
      .populate('createdBy', 'name')
      .populate('lastModifiedBy', 'name')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, data: adjustments });
  } catch (error: any) {
    console.error('Error in getInventoryAdjustments:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code,
      hasUser: !!req.user,
      organizationId: req.user?.organizationId,
      dbReadyState: mongoose.connection.readyState
    });
    res.status(500).json({
      success: false,
      message: 'Error fetching inventory adjustments',
      error: error.message
    });
  }
};

// Search inventory adjustments
export const searchInventoryAdjustments = async (req: AuthRequest, res: Response): Promise<void> => {
  getInventoryAdjustments(req, res);
};

// Get inventory adjustment by ID
export const getInventoryAdjustment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const adjustment = await InventoryAdjustment.findOne({
      _id: id,
      ...getOrgFilter(req.user.organizationId)
    }).populate('items.item')
      .populate('createdBy', 'name')
      .populate('lastModifiedBy', 'name')
      .populate('lastModifiedBy', 'name')
      .lean();

    if (!adjustment) {
      res.status(404).json({ success: false, message: 'Inventory adjustment not found' });
      return;
    }

    // Fetch related journal entry
    const journalEntry = await JournalEntry.findOne({
      reference: adjustment.adjustmentNumber || adjustment.referenceNumber,
      organization: req.user.organizationId
    }).lean();

    res.json({ success: true, data: { ...adjustment, journalEntry } });
  } catch (error: any) {
    console.error('Error in getInventoryAdjustment:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching inventory adjustment',
      error: error.message
    });
  }
};

// Create inventory adjustment
export const createInventoryAdjustment = async (req: AuthRequest, res: Response): Promise<void> => {
  console.log('[Inventory] Creating adjustment initiated by user:', req.user?.userId);
  try {
    if (!req.user || !req.user.organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { items, ...rest } = req.body;

    // Sanitize items array
    const sanitizedItems = [];
    if (Array.isArray(items)) {
      for (const item of items) {
        if (item.item && mongoose.Types.ObjectId.isValid(item.item)) {
          sanitizedItems.push({
            item: item.item,
            quantityOnHand: Number(item.quantityOnHand) || 0,
            quantityAdjusted: Number(item.quantityAdjusted) || 0,
            newQuantity: Number(item.newQuantity) || 0,
            reason: item.reason,
            cost: Number(item.cost) || 0
          });
        }
      }
    }

    const adjustmentData = {
      ...rest,
      status: req.body.status || 'DRAFT',
      items: sanitizedItems,
      organization: req.user.organizationId,
      createdBy: req.user.userId,
      lastModifiedBy: req.user.userId
    };

    console.log('[Inventory] Saving adjustment document...', adjustmentData.adjustmentNumber);

    // Validate required fields manually
    if (!adjustmentData.adjustmentNumber) throw new Error('Adjustment Number is required');
    if (!adjustmentData.type) throw new Error('Type is required');

    const adjustment = await InventoryAdjustment.create(adjustmentData);
    console.log('[Inventory] Adjustment created successfully:', adjustment._id);

    // Update item stock (Quantity adjustments only) if status is ADJUSTED
    if (adjustment.status === "ADJUSTED" && adjustment.items && adjustment.items.length > 0) {
      console.log('[Inventory] Processing stock updates for', adjustment.items.length, 'items');
      let totalValue = 0;
      if (adjustment.type === "Quantity") {
        const bulkOperations: any[] = [];

        for (const adjItem of adjustment.items) {
          if (!adjItem.item || adjItem.quantityAdjusted === 0) {
            continue;
          }

          const newStock = toNumber(adjItem.newQuantity);

          bulkOperations.push({
            updateOne: {
              filter: { _id: adjItem.item, ...getOrgFilter(req.user.organizationId) },
              update: { stockQuantity: newStock },
            }
          });

          checkAndNotifyReorderPoint(
            req.user.organizationId,
            adjItem.item.toString(),
            newStock
          ).catch(err => console.error(`[INVENTORY] Error checking reorder point:`, err));

          const cost = (adjItem as any).cost || (adjItem as any).costPrice || 0;
          totalValue += Math.abs(toNumber(adjItem.quantityAdjusted) * toNumber(cost));
        }

        if (bulkOperations.length > 0) {
          await Item.bulkWrite(bulkOperations, { ordered: false });
        }
      } else {
        // Value adjustment: revalue inventory by updating item costPrice only.
        await applyValueRevaluation(adjustment.items as any[], req.user.organizationId, false);
        totalValue = Math.abs(getValueDelta(adjustment.items as any[]));
      }

      if (totalValue > 0) {
        console.log('[Inventory] Queueing Journal Entry creation with value:', totalValue);
        setImmediate(() => {
          void createInventoryAdjustmentJournalEntry(
            adjustment,
            req.user!.organizationId,
            req.user!.userId,
            totalValue,
          )
            .then(() => console.log('[Inventory] Journal Entry created successfully.'))
            .catch((jeError: any) => console.error('[Inventory] Failed to create Journal Entry:', jeError));
        });
      }
    }

    res.status(201).json({ success: true, data: adjustment });
  } catch (error: any) {
    console.error('Error in createInventoryAdjustment:', error);

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err: any) => err.message).join(', ');
      res.status(400).json({
        success: false,
        message: `Validation Error: ${messages}`,
        error: error.message
      });
      return;
    }

    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      res.status(400).json({
        success: false,
        message: `Duplicate value for ${field}. An adjustment with this number already exists.`,
        field: field
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Error creating inventory adjustment',
      error: error.message
    });
  }
};

// Clone inventory adjustment
export const cloneInventoryAdjustment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.organizationId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { id } = req.params;
    const source = await InventoryAdjustment.findOne({
      _id: id,
      ...getOrgFilter(req.user.organizationId)
    }).lean();

    if (!source) {
      res.status(404).json({ success: false, message: "Inventory adjustment not found" });
      return;
    }

    const baseRefRaw = String(source.adjustmentNumber || source.referenceNumber || "ADJ").trim();
    const baseRef = baseRefRaw.replace(/\s+/g, "-").replace(/[^A-Za-z0-9\-_/]/g, "") || "ADJ";

    let cloneNumber = "";
    let counter = 0;
    while (true) {
      const uniquePart = `${Date.now().toString().slice(-6)}${Math.random().toString(36).slice(2, 6).toUpperCase()}${counter ? `-${counter}` : ""}`;
      const candidate = `${baseRef}-COPY-${uniquePart}`;
      const exists = await InventoryAdjustment.exists({ adjustmentNumber: candidate });
      if (!exists) {
        cloneNumber = candidate;
        break;
      }
      counter += 1;
      if (counter > 20) {
        throw new Error("Unable to generate unique adjustment number for clone");
      }
    }

    const clonedItems = Array.isArray(source.items)
      ? source.items
        .filter((it: any) => it?.item && mongoose.Types.ObjectId.isValid(String(it.item)))
        .map((it: any) => ({
          item: it.item,
          quantityOnHand: Number(it.quantityOnHand) || 0,
          quantityAdjusted: Number(it.quantityAdjusted) || 0,
          newQuantity: Number(it.newQuantity) || 0,
          reason: it.reason || source.reason || "",
          cost: Number(it.cost) || 0
        }))
      : [];

    if (clonedItems.length === 0) {
      res.status(400).json({
        success: false,
        message: "Cannot clone adjustment without valid items"
      });
      return;
    }

    const clonePayload: any = {
      organization: req.user.organizationId,
      createdBy: req.user.userId,
      lastModifiedBy: req.user.userId,
      adjustmentNumber: cloneNumber,
      reference: cloneNumber,
      referenceNumber: cloneNumber,
      date: new Date(),
      type: source.type === "Value" ? "Value" : "Quantity",
      status: "DRAFT",
      reason: source.reason || "",
      notes: source.notes || "",
      account: typeof source.account === "string" ? source.account : "",
      items: clonedItems,
      attachments: Array.isArray(source.attachments) ? source.attachments : [],
      comments: []
    };

    const clone = await InventoryAdjustment.create(clonePayload);
    res.status(201).json({ success: true, data: clone });
  } catch (error: any) {
    console.error("Error in cloneInventoryAdjustment:", error);
    res.status(500).json({
      success: false,
      message: "Error cloning inventory adjustment",
      error: error.message
    });
  }
};

// Update inventory adjustment
export const updateInventoryAdjustment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const oldAdjustment = await InventoryAdjustment.findOne({
      _id: id,
      ...getOrgFilter(req.user.organizationId)
    });

    if (!oldAdjustment) {
      res.status(404).json({ success: false, message: 'Inventory adjustment not found' });
      return;
    }

    const adjustment = await InventoryAdjustment.findOneAndUpdate(
      { _id: id, ...getOrgFilter(req.user.organizationId) },
      { ...req.body, lastModifiedBy: req.user.userId },
      { new: true, runValidators: true }
    );

    if (!adjustment) {
      res.status(404).json({ success: false, message: 'Inventory adjustment not found' });
      return;
    }

    // Handle stock quantity updates
    const wasAdjusted = oldAdjustment.status === "ADJUSTED";
    const isNowAdjusted = adjustment.status === "ADJUSTED";

    const wasQuantityType = oldAdjustment.type === "Quantity";
    const isQuantityType = adjustment.type === "Quantity";
    const wasValueType = oldAdjustment.type === "Value";
    const isValueType = adjustment.type === "Value";

    if (!wasAdjusted && isNowAdjusted && isQuantityType) {
      // Transition from DRAFT to ADJUSTED: Apply full adjustment
      const settings = await getItemsSettings(req.user.organizationId);
      for (let i = 0; i < adjustment.items.length; i++) {
        const adjItem = adjustment.items[i];
        if (adjItem.item && adjItem.quantityAdjusted !== 0) {
          const itemDoc = await Item.findById(adjItem.item);
          const currentStock = itemDoc?.stockQuantity || 0;
          const newStock = formatQuantity(currentStock + adjItem.quantityAdjusted, settings.decimalPlaces);

          // Update adjustment record with actual quantities
          adjustment.items[i].quantityOnHand = currentStock;
          adjustment.items[i].newQuantity = newStock;

          await Item.findOneAndUpdate(
            { _id: adjItem.item, ...getOrgFilter(req.user.organizationId) },
            { stockQuantity: newStock }
          );

          // Check and send reorder point notification
          if (newStock !== undefined && newStock !== null) {
            checkAndNotifyReorderPoint(
              req.user.organizationId,
              adjItem.item.toString(),
              newStock
            ).catch(err => {
              console.error(`[INVENTORY] Error checking reorder point for item ${adjItem.item}:`, err);
            });
          }
        }
      }
      await adjustment.save();
    } else if (!wasAdjusted && isNowAdjusted && isValueType) {
      // Transition from DRAFT to ADJUSTED: Apply value revaluation only
      await applyValueRevaluation(adjustment.items as any[], req.user.organizationId, false);
    } else if (wasAdjusted && !isNowAdjusted && wasQuantityType) {
      // Transition from ADJUSTED to DRAFT: Reverse full adjustment
      for (const adjItem of oldAdjustment.items) {
        if (adjItem.item && adjItem.quantityAdjusted !== 0) {
          const itemDoc = await Item.findById(adjItem.item);
          const settings = await getItemsSettings(req.user.organizationId);
          const currentStock = itemDoc?.stockQuantity || 0;
          const reversedStock = formatQuantity(currentStock - adjItem.quantityAdjusted, settings.decimalPlaces);

          await Item.findOneAndUpdate(
            { _id: adjItem.item, ...getOrgFilter(req.user.organizationId) },
            { stockQuantity: reversedStock }
          );
        }
      }
    } else if (wasAdjusted && !isNowAdjusted && wasValueType) {
      // Transition from ADJUSTED to DRAFT: Reverse value revaluation
      await applyValueRevaluation(oldAdjustment.items as any[], req.user.organizationId, true);
    } else if (wasAdjusted && isNowAdjusted) {
      // Still ADJUSTED: Reconcile differences
      // 1. Reverse old quantity adjustment
      if (wasQuantityType) {
        for (const adjItem of oldAdjustment.items) {
          if (adjItem.item && adjItem.quantityAdjusted !== 0) {
            const itemDoc = await Item.findById(adjItem.item);
            const settings = await getItemsSettings(req.user.organizationId);
            const currentStock = itemDoc?.stockQuantity || 0;
            const reversedStock = formatQuantity(currentStock - adjItem.quantityAdjusted, settings.decimalPlaces);

            await Item.findOneAndUpdate(
              { _id: adjItem.item, ...getOrgFilter(req.user.organizationId) },
              { stockQuantity: reversedStock }
            );
          }
        }
      }
      // 2. Apply new quantity adjustment
      if (isQuantityType) {
        for (let i = 0; i < adjustment.items.length; i++) {
          const adjItem = adjustment.items[i];
          if (adjItem.item && adjItem.quantityAdjusted !== 0) {
            const itemDoc = await Item.findById(adjItem.item);
            const settings = await getItemsSettings(req.user.organizationId);
            const currentStock = itemDoc?.stockQuantity || 0;
            const newStock = formatQuantity(currentStock + adjItem.quantityAdjusted, settings.decimalPlaces);

            // Update adjustment record with actual quantities
            adjustment.items[i].quantityOnHand = currentStock;
            adjustment.items[i].newQuantity = newStock;

            await Item.findOneAndUpdate(
              { _id: adjItem.item, ...getOrgFilter(req.user.organizationId) },
              { stockQuantity: newStock }
            );

            // Check and send reorder point notification
            if (newStock !== undefined && newStock !== null) {
              checkAndNotifyReorderPoint(
                req.user.organizationId,
                adjItem.item.toString(),
                newStock
              ).catch(err => {
                console.error(`[INVENTORY] Error checking reorder point for item ${adjItem.item}:`, err);
              });
            }
          }
        }
        await adjustment.save();
      }
      // 3. Reverse old value revaluation
      if (wasValueType) {
        await applyValueRevaluation(oldAdjustment.items as any[], req.user.organizationId, true);
      }
      // 4. Apply new value revaluation
      if (isValueType) {
        await applyValueRevaluation(adjustment.items as any[], req.user.organizationId, false);
      }
    }

    // Handle Journal Entry for Update
    // If status became ADJUSTED or was ADJUSTED, ensure Journal Entry reflects current state
    if (isNowAdjusted) {
      // Delete potential existing journal entry to recreate it simpler
      await JournalEntry.deleteOne({
        reference: adjustment.adjustmentNumber || adjustment.referenceNumber || oldAdjustment.adjustmentNumber,
        organization: req.user.organizationId
      });

      // Recalculate Total Value
      const totalValue = adjustment.type === 'Value'
        ? Math.abs(getValueDelta(adjustment.items as any[]))
        : (adjustment.items as any[]).reduce((sum: number, adjItem: any) => {
          if (!adjItem.item || toNumber(adjItem.quantityAdjusted) === 0) return sum;
          return sum + Math.abs(toNumber(adjItem.quantityAdjusted) * toNumber(adjItem.cost || adjItem.costPrice));
        }, 0);

      if (totalValue > 0) {
        // Resolve accounts
        const inventoryAssetAccount = await ChartOfAccount.findOne({
          organization: req.user.organizationId,
          $or: [{ accountName: 'Inventory Asset' }, { accountType: 'stock' }]
        });

        const costOfGoodsSoldAccount = await ChartOfAccount.findOne({
          organization: req.user.organizationId,
          $or: [
            { accountName: adjustment.account || 'Cost of Goods Sold' },
            { accountType: 'cost_of_goods_sold' }
          ]
        });

        const journalNumber = `JE-${adjustment.adjustmentNumber || adjustment.referenceNumber || Date.now()}`;
        const valueDelta = getValueDelta(adjustment.items as any[]);
        const absValueDelta = Math.abs(valueDelta);
        const lines = adjustment.type === 'Value'
          ? [
            {
              account: inventoryAssetAccount?._id?.toString() || 'Inventory Asset',
              accountName: inventoryAssetAccount?.accountName || 'Inventory Asset',
              description: 'Inventory Value Adjustment',
              debit: valueDelta >= 0 ? absValueDelta : 0,
              credit: valueDelta < 0 ? absValueDelta : 0
            },
            {
              account: costOfGoodsSoldAccount?._id?.toString() || adjustment.account || 'Cost of Goods Sold',
              accountName: costOfGoodsSoldAccount?.accountName || adjustment.account || 'Cost of Goods Sold',
              description: `Inventory Adjustment - ${adjustment.reason}`,
              debit: valueDelta < 0 ? absValueDelta : 0,
              credit: valueDelta >= 0 ? absValueDelta : 0
            }
          ]
          : [
            {
              account: inventoryAssetAccount?._id?.toString() || 'Inventory Asset',
              accountName: inventoryAssetAccount?.accountName || 'Inventory Asset',
              description: 'Inventory Adjustment - Stock',
              debit: adjustment.type === 'Quantity' && (adjustment.reason === 'Damaged' || adjustment.reason === 'Lost' || adjustment.reason === 'Stolen') ? 0 : totalValue,
              credit: adjustment.type === 'Quantity' && (adjustment.reason === 'Damaged' || adjustment.reason === 'Lost' || adjustment.reason === 'Stolen') ? totalValue : 0
            },
            {
              account: costOfGoodsSoldAccount?._id?.toString() || adjustment.account || 'Cost of Goods Sold',
              accountName: costOfGoodsSoldAccount?.accountName || adjustment.account || 'Cost of Goods Sold',
              description: `Inventory Adjustment - ${adjustment.reason}`,
              debit: adjustment.type === 'Quantity' && (adjustment.reason === 'Damaged' || adjustment.reason === 'Lost' || adjustment.reason === 'Stolen') ? totalValue : 0,
              credit: adjustment.type === 'Quantity' && (adjustment.reason === 'Damaged' || adjustment.reason === 'Lost' || adjustment.reason === 'Stolen') ? 0 : totalValue
            }
          ];

        await JournalEntry.create({
          organization: req.user.organizationId,
          entryNumber: journalNumber,
          date: adjustment.date || new Date(),
          reference: adjustment.adjustmentNumber || adjustment.referenceNumber,
          description: `Inventory Adjustment - ${adjustment.adjustmentNumber || adjustment.referenceNumber}`,
          status: 'posted',
          postedBy: req.user.userId,
          postedAt: new Date(),
          sourceId: adjustment._id,
          sourceType: 'inventory_adjustment',
          lines
        });
      }
    } else if (wasAdjusted && !isNowAdjusted) {
      // Reverted to DRAFT - delete journal entry
      await JournalEntry.deleteOne({
        reference: oldAdjustment.adjustmentNumber || oldAdjustment.referenceNumber,
        organization: req.user.organizationId
      });
    }

    res.json({ success: true, data: adjustment });
  } catch (error: any) {
    console.error('Error in updateInventoryAdjustment:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating inventory adjustment',
      error: error.message
    });
  }
};

// Delete inventory adjustment
export const deleteInventoryAdjustment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const adjustment = await InventoryAdjustment.findOne({
      _id: id,
      ...getOrgFilter(req.user.organizationId)
    });

    if (!adjustment) {
      res.status(404).json({ success: false, message: 'Inventory adjustment not found' });
      return;
    }

    // Reverse stock adjustment if it was already applied
    if (adjustment.type === "Quantity" && adjustment.status === "ADJUSTED" && adjustment.items && adjustment.items.length > 0) {
      for (const adjItem of adjustment.items) {
        if (adjItem.item && adjItem.quantityAdjusted !== 0) {
          const itemDoc = await Item.findById(adjItem.item);
          const settings = await getItemsSettings(req.user.organizationId);
          const currentStock = itemDoc?.stockQuantity || 0;
          const reversedStock = formatQuantity(currentStock - adjItem.quantityAdjusted, settings.decimalPlaces);

          await Item.findOneAndUpdate(
            { _id: adjItem.item, ...getOrgFilter(req.user.organizationId) },
            { stockQuantity: reversedStock }
          );
        }
      }
    } else if (adjustment.type === "Value" && adjustment.status === "ADJUSTED" && adjustment.items && adjustment.items.length > 0) {
      // Reverse value revaluation by restoring previous valuation-derived costPrice.
      await applyValueRevaluation(adjustment.items as any[], req.user.organizationId, true);
    }

    await InventoryAdjustment.deleteOne({ _id: id });

    res.json({ success: true, message: 'Inventory adjustment deleted' });
  } catch (error: any) {
    console.error('Error in deleteInventoryAdjustment:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting inventory adjustment',
      error: error.message
    });
  }
};

// Bulk delete inventory adjustments
export const deleteInventoryAdjustments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { ids } = req.body;
    const result = await InventoryAdjustment.deleteMany({
      _id: { $in: ids },
      organization: req.user.organizationId
    });

    res.json({ success: true, deletedCount: result.deletedCount });
  } catch (error: any) {
    console.error('Error in deleteInventoryAdjustments:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting inventory adjustments',
      error: error.message
    });
  }
};
// Inventory Adjustment Reasons
export const getInventoryAdjustmentReasons = async (req: AuthRequest, res: Response) => {
  try {
    const reasons = await InventoryAdjustmentReason.find({ organization: req.user!.organizationId });
    res.status(200).json(reasons);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const createInventoryAdjustmentReason = async (req: AuthRequest, res: Response) => {
  const { reason } = req.body;
  const newReason = new InventoryAdjustmentReason({
    organization: req.user!.organizationId,
    name: reason,
  });

  try {
    const savedReason = await newReason.save();
    res.status(201).json(savedReason);
  } catch (error) {
    res.status(409).json({ message: (error as Error).message });
  }
};

export const deleteInventoryAdjustmentReason = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).send(`No reason with id: ${id}`);
  }

  await InventoryAdjustmentReason.findByIdAndDelete(id);

  res.json({ message: "Reason deleted successfully." });
};
