/**
 * Tag Assignment Controller
 * Handles assigning tags to entities and managing tag relationships
 */

import { Request, Response } from "express";
import TagAssignment from "../models/TagAssignment.js";
import ReportingTag from "../models/ReportingTag.js";

/**
 * Get tags for a specific entity
 * GET /api/tags/entity/:entityType/:entityId
 */
export const getEntityTags = async (req: Request, res: Response): Promise<void> => {
  try {
    const { entityType, entityId } = req.params;
    
    const assignments = await TagAssignment.find({
      organization: (req as any).user.organizationId,
      entityType,
      entityId,
    }).populate({
      path: 'tag',
      match: { isActive: true },
      populate: {
        path: 'createdBy',
        select: 'name email'
      }
    });

    // Filter out null tags (inactive ones)
    const tags = assignments
      .filter(assignment => assignment.tag)
      .map(assignment => assignment.tag);

    res.json({
      success: true,
      data: tags,
    });
  } catch (error: any) {
    console.error("Error fetching entity tags:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch entity tags",
    });
  }
};

/**
 * Assign tags to an entity
 * POST /api/tags/assign
 */
export const assignTags = async (req: Request, res: Response): Promise<void> => {
  try {
    const { entityType, entityId, tagIds } = req.body;

    if (!entityType || !entityId || !tagIds || !Array.isArray(tagIds)) {
      res.status(400).json({
        success: false,
        message: "entityType, entityId, and tagIds array are required",
      });
      return;
    }

    const organizationId = (req as any).user.organizationId;
    const userId = (req as any).user.id;

    // Verify all tags exist and belong to the organization
    const tags = await ReportingTag.find({
      _id: { $in: tagIds },
      organization: organizationId,
      isActive: true,
    });

    if (tags.length !== tagIds.length) {
      res.status(400).json({
        success: false,
        message: "Some tags are invalid or inactive",
      });
      return;
    }

    // Remove existing tag assignments for this entity
    await TagAssignment.deleteMany({
      organization: organizationId,
      entityType,
      entityId,
    });

    // Create new tag assignments
    const assignments = tagIds.map(tagId => ({
      organization: organizationId,
      tag: tagId,
      entityType,
      entityId,
      assignedBy: userId,
    }));

    const createdAssignments = await TagAssignment.insertMany(assignments);

    // Fetch the assigned tags with details
    const populatedAssignments = await TagAssignment.find({
      _id: { $in: createdAssignments.map(a => a._id) }
    }).populate({
      path: 'tag',
      populate: {
        path: 'createdBy',
        select: 'name email'
      }
    });

    res.status(201).json({
      success: true,
      message: "Tags assigned successfully",
      data: populatedAssignments.map(a => a.tag),
    });
  } catch (error: any) {
    console.error("Error assigning tags:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to assign tags",
    });
  }
};

/**
 * Remove a tag from an entity
 * DELETE /api/tags/remove/:entityType/:entityId/:tagId
 */
export const removeTag = async (req: Request, res: Response): Promise<void> => {
  try {
    const { entityType, entityId, tagId } = req.params;

    const result = await TagAssignment.deleteOne({
      organization: (req as any).user.organizationId,
      entityType,
      entityId,
      tag: tagId,
    });

    if (result.deletedCount === 0) {
      res.status(404).json({
        success: false,
        message: "Tag assignment not found",
      });
      return;
    }

    res.json({
      success: true,
      message: "Tag removed successfully",
    });
  } catch (error: any) {
    console.error("Error removing tag:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to remove tag",
    });
  }
};

/**
 * Get all entities with a specific tag
 * GET /api/tags/entities/:tagId/:entityType
 */
export const getEntitiesByTag = async (req: Request, res: Response): Promise<void> => {
  try {
    const { tagId, entityType } = req.params;

    const assignments = await TagAssignment.find({
      organization: (req as any).user.organizationId,
      tag: tagId,
      entityType,
    }).populate('entityId');

    const entities = assignments.map(assignment => assignment.entityId);

    res.json({
      success: true,
      data: entities,
    });
  } catch (error: any) {
    console.error("Error fetching entities by tag:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch entities by tag",
    });
  }
};

/**
 * Get tag statistics
 * GET /api/tags/stats
 */
export const getTagStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const organizationId = (req as any).user.organizationId;

    const stats = await TagAssignment.aggregate([
      { $match: { organization: organizationId } },
      {
        $group: {
          _id: '$tag',
          count: { $sum: 1 },
          entityTypes: { $addToSet: '$entityType' }
        }
      },
      {
        $lookup: {
          from: 'reportingtags',
          localField: '_id',
          foreignField: '_id',
          as: 'tag'
        }
      },
      { $unwind: '$tag' },
      {
        $project: {
          tagName: '$tag.name',
          tagColor: '$tag.color',
          count: 1,
          entityTypes: 1,
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error("Error fetching tag stats:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch tag statistics",
    });
  }
};

/**
 * Bulk assign tags to multiple entities
 * POST /api/tags/bulk-assign
 */
export const bulkAssignTags = async (req: Request, res: Response): Promise<void> => {
  try {
    const { entityType, entityIds, tagIds } = req.body;

    if (!entityType || !entityIds || !tagIds || !Array.isArray(entityIds) || !Array.isArray(tagIds)) {
      res.status(400).json({
        success: false,
        message: "entityType, entityIds array, and tagIds array are required",
      });
      return;
    }

    const organizationId = (req as any).user.organizationId;
    const userId = (req as any).user.id;

    // Verify all tags exist and belong to the organization
    const tags = await ReportingTag.find({
      _id: { $in: tagIds },
      organization: organizationId,
      isActive: true,
    });

    if (tags.length !== tagIds.length) {
      res.status(400).json({
        success: false,
        message: "Some tags are invalid or inactive",
      });
      return;
    }

    // Remove existing tag assignments for these entities
    await TagAssignment.deleteMany({
      organization: organizationId,
      entityType,
      entityId: { $in: entityIds },
    });

    // Create new tag assignments
    const assignments = [];
    for (const entityId of entityIds) {
      for (const tagId of tagIds) {
        assignments.push({
          organization: organizationId,
          tag: tagId,
          entityType,
          entityId,
          assignedBy: userId,
        });
      }
    }

    const createdAssignments = await TagAssignment.insertMany(assignments);

    res.status(201).json({
      success: true,
      message: "Tags bulk assigned successfully",
      data: {
        assignmentsCreated: createdAssignments.length,
        entitiesCount: entityIds.length,
        tagsCount: tagIds.length,
      },
    });
  } catch (error: any) {
    console.error("Error bulk assigning tags:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to bulk assign tags",
    });
  }
};

export default {
  getEntityTags,
  assignTags,
  removeTag,
  getEntitiesByTag,
  getTagStats,
  bulkAssignTags,
};
