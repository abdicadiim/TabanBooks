/**
 * Reporting Tags Controller
 * Handles CRUD operations for reporting tags
 */

import { Request, Response } from "express";
import ReportingTag from "../models/ReportingTag.js";

/**
 * Get all reporting tags
 * GET /api/settings/reporting-tags
 */
export const getReportingTags = async (req: Request, res: Response): Promise<void> => {
  try {
    const { appliesTo, isActive } = req.query;
    const query: any = {
      organization: (req as any).user.organizationId,
    };

    if (appliesTo) {
      query.appliesTo = appliesTo;
    }

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const tags = await ReportingTag.find(query)
      .sort({ name: 1 })
      .populate('createdBy', 'name email');

    res.json({
      success: true,
      data: tags,
    });
  } catch (error: any) {
    console.error("Error fetching reporting tags:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch reporting tags",
    });
  }
};

/**
 * Get single reporting tag
 * GET /api/settings/reporting-tags/:id
 */
export const getReportingTagById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const tag = await ReportingTag.findOne({
      _id: id,
      organization: (req as any).user.organizationId,
    }).populate('createdBy', 'name email');

    if (!tag) {
      res.status(404).json({
        success: false,
        message: "Reporting tag not found",
      });
      return;
    }

    res.json({
      success: true,
      data: tag,
    });
  } catch (error: any) {
    console.error("Error fetching reporting tag:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch reporting tag",
    });
  }
};

/**
 * Create reporting tag
 * POST /api/settings/reporting-tags
 */
export const createReportingTag = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, color, description, appliesTo, moduleLevel, isMandatory, options, isActive } = req.body;

    if (!name || !appliesTo || !Array.isArray(appliesTo)) {
      res.status(400).json({
        success: false,
        message: "Name and appliesTo array are required",
      });
      return;
    }

    const tag = await ReportingTag.create({
      organization: (req as any).user.organizationId,
      name: name.trim(),
      color: color || "#3B82F6",
      description: description?.trim(),
      appliesTo,
      moduleLevel: moduleLevel || {},
      isMandatory: Boolean(isMandatory),
      options: Array.isArray(options)
        ? options.map((opt: any) => String(opt || "").trim()).filter(Boolean)
        : [],
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      createdBy: (req as any).user.id,
    });

    const populatedTag = await ReportingTag.findById(tag._id).populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      message: "Reporting tag created successfully",
      data: populatedTag,
    });
  } catch (error: any) {
    console.error("Error creating reporting tag:", error);
    if (error?.name === "ValidationError") {
      res.status(400).json({
        success: false,
        message: error.message || "Invalid reporting tag data",
      });
      return;
    }
    if (error?.code === 11000) {
      res.status(409).json({
        success: false,
        message: "A reporting tag with this name already exists",
      });
      return;
    }
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create reporting tag",
    });
  }
};

/**
 * Update reporting tag
 * PUT /api/settings/reporting-tags/:id
 */
export const updateReportingTag = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, color, description, appliesTo, moduleLevel, isMandatory, options, isActive } = req.body;

    const tag = await ReportingTag.findOne({
      _id: id,
      organization: (req as any).user.organizationId,
    });

    if (!tag) {
      res.status(404).json({
        success: false,
        message: "Reporting tag not found",
      });
      return;
    }

    if (name) tag.name = name.trim();
    if (color !== undefined) tag.color = color;
    if (description !== undefined) tag.description = description.trim();
    if (appliesTo) tag.appliesTo = appliesTo;
    if (moduleLevel !== undefined) tag.moduleLevel = moduleLevel;
    if (isMandatory !== undefined) tag.isMandatory = Boolean(isMandatory);
    if (options !== undefined) {
      tag.options = Array.isArray(options)
        ? options.map((opt: any) => String(opt || "").trim()).filter(Boolean)
        : [];
    }
    if (isActive !== undefined) tag.isActive = isActive;

    await tag.save();

    const populatedTag = await ReportingTag.findById(tag._id).populate('createdBy', 'name email');

    res.json({
      success: true,
      message: "Reporting tag updated successfully",
      data: populatedTag,
    });
  } catch (error: any) {
    console.error("Error updating reporting tag:", error);
    if (error?.name === "ValidationError") {
      res.status(400).json({
        success: false,
        message: error.message || "Invalid reporting tag data",
      });
      return;
    }
    if (error?.code === 11000) {
      res.status(409).json({
        success: false,
        message: "A reporting tag with this name already exists",
      });
      return;
    }
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update reporting tag",
    });
  }
};

/**
 * Delete reporting tag
 * DELETE /api/settings/reporting-tags/:id
 */
export const deleteReportingTag = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const tag = await ReportingTag.findOne({
      _id: id,
      organization: (req as any).user.organizationId,
    });

    if (!tag) {
      res.status(404).json({
        success: false,
        message: "Reporting tag not found",
      });
      return;
    }

    // Soft delete by setting isActive to false
    tag.isActive = false;
    await tag.save();

    res.json({
      success: true,
      message: "Reporting tag deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting reporting tag:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete reporting tag",
    });
  }
};

/**
 * Get tags by entity type
 * GET /api/settings/reporting-tags/by-entity/:entityType
 */
export const getTagsByEntityType = async (req: Request, res: Response): Promise<void> => {
  try {
    const { entityType } = req.params;
    
    const tags = await ReportingTag.find({
      organization: (req as any).user.organizationId,
      appliesTo: entityType,
      isActive: true,
    }).sort({ name: 1 });

    res.json({
      success: true,
      data: tags,
    });
  } catch (error: any) {
    console.error("Error fetching tags by entity type:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch tags by entity type",
    });
  }
};

/**
 * Bulk create reporting tags
 * POST /api/settings/reporting-tags/bulk
 */
export const bulkCreateReportingTags = async (req: Request, res: Response): Promise<void> => {
  try {
    const { tags } = req.body;

    if (!tags || !Array.isArray(tags)) {
      res.status(400).json({
        success: false,
        message: "Tags array is required",
      });
      return;
    }

    const organizationId = (req as any).user.organizationId;
    const createdTags = [];

    for (const tagData of tags) {
      const { name, color, description, appliesTo, moduleLevel, isMandatory, options, isActive } = tagData;

      if (!name || !appliesTo || !Array.isArray(appliesTo)) {
        continue; // Skip invalid entries
      }

      try {
        const tag = await ReportingTag.create({
          organization: organizationId,
          name: name.trim(),
          color: color || "#3B82F6",
          description: description?.trim(),
          appliesTo,
          moduleLevel: moduleLevel || {},
          isMandatory: Boolean(isMandatory),
          options: Array.isArray(options)
            ? options.map((opt: any) => String(opt || "").trim()).filter(Boolean)
            : [],
          isActive: isActive !== undefined ? Boolean(isActive) : true,
          createdBy: (req as any).user.id,
        });
        createdTags.push(tag);
      } catch (error: any) {
        // Skip duplicate tags
        if (error.message.includes("already exists")) {
          continue;
        }
        throw error;
      }
    }

    const populatedTags = await ReportingTag.find({
      _id: { $in: createdTags.map(tag => tag._id) }
    }).populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      message: "Reporting tags created successfully",
      data: populatedTags,
    });
  } catch (error: any) {
    console.error("Error bulk creating reporting tags:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create reporting tags",
    });
  }
};

export default {
  getReportingTags,
  getReportingTagById,
  createReportingTag,
  updateReportingTag,
  deleteReportingTag,
  getTagsByEntityType,
  bulkCreateReportingTags,
};
