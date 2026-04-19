/**
 * Unit Controller
 * Handles unit management
 */

import { Request, Response } from "express";
import Unit from "../models/Unit.js";
import mongoose from "mongoose";

interface AuthRequest extends Request {
  user?: {
    userId: string;
    organizationId: string;
    role: string;
  };
}

/**
 * Get all units
 * GET /api/settings/units
 */
export const getUnits = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const query: any = {
      organization: req.user.organizationId,
    };

    if (req.query.isActive !== undefined) {
      query.isActive = req.query.isActive === 'true';
    }

    const units = await Unit.find(query).sort({ name: 1 });

    res.json({
      success: true,
      data: units,
    });
  } catch (error: any) {
    console.error('Error fetching units:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch units',
    });
  }
};

/**
 * Get single unit
 * GET /api/settings/units/:id
 */
export const getUnit = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const unit = await Unit.findOne({
      _id: id,
      organization: req.user.organizationId,
    });

    if (!unit) {
      res.status(404).json({ success: false, message: 'Unit not found' });
      return;
    }

    res.json({
      success: true,
      data: unit,
    });
  } catch (error: any) {
    console.error('Error fetching unit:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch unit',
    });
  }
};

/**
 * Create unit
 * POST /api/settings/units
 */
export const createUnit = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { name, code, description } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ success: false, message: 'Unit name is required' });
      return;
    }

    // Check if unit with same name already exists for this organization
    const existingUnit = await Unit.findOne({
      organization: req.user.organizationId,
      name: name.trim(),
    });

    if (existingUnit) {
      res.status(400).json({ success: false, message: 'Unit with this name already exists' });
      return;
    }

    const unit = await Unit.create({
      name: name.trim(),
      code: code ? code.trim().toUpperCase() : name.trim().toUpperCase(),
      description: description?.trim(),
      organization: req.user.organizationId,
      isActive: true,
    });

    res.status(201).json({
      success: true,
      message: 'Unit created successfully',
      data: unit,
    });
  } catch (error: any) {
    console.error('Error creating unit:', error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      res.status(400).json({
        success: false,
        message: 'Unit with this name or code already exists',
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create unit',
    });
  }
};

/**
 * Update unit
 * PUT /api/settings/units/:id
 */
export const updateUnit = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const { name, code, description, isActive } = req.body;

    // If name is being updated, check for duplicates
    if (name && name.trim()) {
      const existingUnit = await Unit.findOne({
        organization: req.user.organizationId,
        name: name.trim(),
        _id: { $ne: id },
      });

      if (existingUnit) {
        res.status(400).json({ success: false, message: 'Unit with this name already exists' });
        return;
      }
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (code !== undefined) updateData.code = code.trim().toUpperCase();
    if (description !== undefined) updateData.description = description.trim();
    if (isActive !== undefined) updateData.isActive = isActive;

    const unit = await Unit.findOneAndUpdate(
      { _id: id, organization: req.user.organizationId },
      updateData,
      { new: true, runValidators: true }
    );

    if (!unit) {
      res.status(404).json({ success: false, message: 'Unit not found' });
      return;
    }

    res.json({
      success: true,
      message: 'Unit updated successfully',
      data: unit,
    });
  } catch (error: any) {
    console.error('Error updating unit:', error);
    
    if (error.code === 11000) {
      res.status(400).json({
        success: false,
        message: 'Unit with this name or code already exists',
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update unit',
    });
  }
};

/**
 * Delete unit
 * DELETE /api/settings/units/:id
 */
export const deleteUnit = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const unit = await Unit.findOneAndDelete({
      _id: id,
      organization: req.user.organizationId,
    });

    if (!unit) {
      res.status(404).json({ success: false, message: 'Unit not found' });
      return;
    }

    res.json({
      success: true,
      message: 'Unit deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting unit:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete unit',
    });
  }
};
