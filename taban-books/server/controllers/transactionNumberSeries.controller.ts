/**
 * Transaction Number Series Controller
 * Handles document numbering configuration
 */

import { Request, Response } from "express";
import TransactionNumberSeries from "../models/TransactionNumberSeries.js";

/**
 * Get all transaction number series
 * GET /api/settings/transaction-number-series
 */
export const getTransactionNumberSeries = async (req: Request, res: Response): Promise<void> => {
  try {
    const { module } = req.query;
    const query: any = {
      organization: (req as any).user.organizationId,
      isActive: true,
    };

    if (module) {
      query.module = module;
    }

    const series = await TransactionNumberSeries.find(query).sort({ module: 1, isDefault: -1 });

    res.json({
      success: true,
      data: series,
    });
  } catch (error: any) {
    console.error("Error fetching transaction number series:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch transaction number series",
    });
  }
};

/**
 * Get single transaction number series
 * GET /api/settings/transaction-number-series/:id
 */
export const getTransactionNumberSeriesById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const series = await TransactionNumberSeries.findOne({
      _id: id,
      organization: (req as any).user.organizationId,
    });

    if (!series) {
      res.status(404).json({
        success: false,
        message: "Transaction number series not found",
      });
      return;
    }

    res.json({
      success: true,
      data: series,
    });
  } catch (error: any) {
    console.error("Error fetching transaction number series:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch transaction number series",
    });
  }
};

/**
 * Create transaction number series
 * POST /api/settings/transaction-number-series
 */
export const createTransactionNumberSeries = async (req: Request, res: Response): Promise<void> => {
  try {
    const { module, prefix, startingNumber, isDefault } = req.body;

    if (!module || !startingNumber) {
      res.status(400).json({
        success: false,
        message: "Module and starting number are required",
      });
      return;
    }

    // If setting as default, unset other defaults for this module
    if (isDefault) {
      await TransactionNumberSeries.updateMany(
        {
          organization: (req as any).user.organizationId,
          module,
        },
        { $set: { isDefault: false } }
      );
    }

    const series = await TransactionNumberSeries.create({
      organization: (req as any).user.organizationId,
      module,
      prefix: prefix || "",
      startingNumber,
      currentNumber: parseInt(startingNumber) || 1,
      isDefault: isDefault || false,
    });

    res.status(201).json({
      success: true,
      message: "Transaction number series created successfully",
      data: series,
    });
  } catch (error: any) {
    console.error("Error creating transaction number series:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create transaction number series",
    });
  }
};

/**
 * Update transaction number series
 * PUT /api/settings/transaction-number-series/:id
 */
export const updateTransactionNumberSeries = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { module, prefix, startingNumber, currentNumber, isDefault, isActive } = req.body;

    const series = await TransactionNumberSeries.findOne({
      _id: id,
      organization: (req as any).user.organizationId,
    });

    if (!series) {
      res.status(404).json({
        success: false,
        message: "Transaction number series not found",
      });
      return;
    }

    // If setting as default, unset other defaults for this module
    if (isDefault && !series.isDefault) {
      await TransactionNumberSeries.updateMany(
        {
          organization: (req as any).user.organizationId,
          module: series.module,
          _id: { $ne: id },
        },
        { $set: { isDefault: false } }
      );
    }

    if (module) series.module = module;
    if (prefix !== undefined) series.prefix = prefix;
    if (startingNumber !== undefined) {
      series.startingNumber = startingNumber;
      // Only set currentNumber to startingNumber if not explicitly provided
      if (currentNumber === undefined) {
        series.currentNumber = parseInt(startingNumber) || 1;
      }
    }
    if (currentNumber !== undefined) series.currentNumber = currentNumber;
    if (isDefault !== undefined) series.isDefault = isDefault;
    if (isActive !== undefined) series.isActive = isActive;

    await series.save();

    res.json({
      success: true,
      message: "Transaction number series updated successfully",
      data: series,
    });
  } catch (error: any) {
    console.error("Error updating transaction number series:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update transaction number series",
    });
  }
};

/**
 * Delete transaction number series
 * DELETE /api/settings/transaction-number-series/:id
 */
export const deleteTransactionNumberSeries = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const series = await TransactionNumberSeries.findOne({
      _id: id,
      organization: (req as any).user.organizationId,
    });

    if (!series) {
      res.status(404).json({
        success: false,
        message: "Transaction number series not found",
      });
      return;
    }

    if (series.isDefault) {
      res.status(400).json({
        success: false,
        message: "Cannot delete default transaction number series",
      });
      return;
    }

    // Soft delete
    series.isActive = false;
    await series.save();

    res.json({
      success: true,
      message: "Transaction number series deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting transaction number series:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete transaction number series",
    });
  }
};

/**
 * Get next transaction number
 * GET /api/settings/transaction-number-series/:id/next
 */
export const getNextTransactionNumber = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const series = await TransactionNumberSeries.findOne({
      _id: id,
      organization: (req as any).user.organizationId,
      isActive: true,
    });

    if (!series) {
      res.status(404).json({
        success: false,
        message: "Transaction number series not found",
      });
      return;
    }

    const nextNumber = series.currentNumber + 1;
    series.currentNumber = nextNumber;
    await series.save();

    const formattedNumber = `${series.prefix}${nextNumber.toString().padStart(series.startingNumber.length, '0')}`;

    res.json({
      success: true,
      data: {
        number: formattedNumber,
        currentNumber: nextNumber,
      },
    });
  } catch (error: any) {
    console.error("Error getting next transaction number:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get next transaction number",
    });
  }
};

/**
 * Create multiple transaction number series at once
 * POST /api/settings/transaction-number-series/batch
 */
export const createMultipleTransactionNumberSeries = async (req: Request, res: Response): Promise<void> => {
  try {
    const { seriesName, modules } = req.body;

    if (!seriesName || !modules || !Array.isArray(modules)) {
      res.status(400).json({
        success: false,
        message: "Series name and modules array are required",
      });
      return;
    }

    const organizationId = (req as any).user.organizationId;
    const createdSeries = [];

    for (const moduleConfig of modules) {
      const { module, prefix, startingNumber, restartNumbering, isDefault } = moduleConfig;

      if (!module || !startingNumber) {
        continue; // Skip invalid entries
      }

      // If setting as default, unset other defaults for this module
      if (isDefault) {
        await TransactionNumberSeries.updateMany(
          {
            organization: organizationId,
            module,
          },
          { $set: { isDefault: false } }
        );
      }

      const series = await TransactionNumberSeries.create({
        organization: organizationId,
        seriesName,
        module,
        prefix: prefix || "",
        startingNumber,
        restartNumbering: restartNumbering || "never",
        currentNumber: parseInt(startingNumber) || 1,
        isDefault: isDefault || false,
      });

      createdSeries.push(series);
    }

    res.status(201).json({
      success: true,
      message: "Transaction number series created successfully",
      data: createdSeries,
    });
  } catch (error: any) {
    console.error("Error creating multiple transaction number series:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create transaction number series",
    });
  }
};

export default {
  getTransactionNumberSeries,
  getTransactionNumberSeriesById,
  createTransactionNumberSeries,
  createMultipleTransactionNumberSeries,
  updateTransactionNumberSeries,
  deleteTransactionNumberSeries,
  getNextTransactionNumber,
};
