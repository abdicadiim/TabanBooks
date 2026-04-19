/**
 * Projects Controller
 * Handles Projects & Time Tracking
 */

import { Request, Response } from "express";
import Project from "../models/Project.js";
import TimeEntry from "../models/TimeEntry.js";

// ============================================================================
// PROJECTS
// ============================================================================

export const getProjects = async (req: Request, res: Response): Promise<void> => {
  try {
    const query: any = { organization: (req as any).user.organizationId };

    // Filter by customer if provided
    if (req.query.customer_id || req.query.customerId) {
      query.customer = req.query.customer_id || req.query.customerId;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 500; // Default 500 for safety
    const skip = (page - 1) * limit;

    const projects = await Project.find(query)
      .populate("customer", "name email")
      .populate("assignedTo", "name email")
      .populate("userBudgetHours.user", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get total count for pagination context if needed
    const total = await Project.countDocuments(query);

    res.json({
      success: true,
      data: projects,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getProject = async (req: Request, res: Response): Promise<void> => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      organization: (req as any).user.organizationId,
    })
      .populate("customer", "name email phone address")
      .populate("assignedTo", "name email")
      .populate("userBudgetHours.user", "name email");

    if (!project) {
      res.status(404).json({ success: false, message: "Project not found" });
      return;
    }

    res.json({ success: true, data: project });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createProject = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate required fields
    if (!req.body.name) {
      res.status(400).json({ success: false, message: "Project name is required" });
      return;
    }

    // Generate project number if not provided
    if (!req.body.projectNumber) {
      let count = await Project.countDocuments({ organization: (req as any).user.organizationId });
      let projectNumber = `PRJ-${String(count + 1).padStart(4, '0')}`;

      // Ensure uniqueness by checking if it exists
      let exists = await Project.findOne({ projectNumber, organization: (req as any).user.organizationId });
      while (exists) {
        count++;
        projectNumber = `PRJ-${String(count + 1).padStart(4, '0')}`;
        exists = await Project.findOne({ projectNumber, organization: (req as any).user.organizationId });
      }

      req.body.projectNumber = projectNumber;
    } else {
      // Check if provided project number already exists
      const existingProject = await Project.findOne({
        projectNumber: req.body.projectNumber,
        organization: (req as any).user.organizationId
      });
      if (existingProject) {
        res.status(400).json({
          success: false,
          message: `Project number ${req.body.projectNumber} already exists`
        });
        return;
      }
    }

    // Prepare project data
    const projectData: any = {
      name: req.body.name ? String(req.body.name).trim() : '',
      projectNumber: req.body.projectNumber,
      organization: (req as any).user.organizationId,
      description: req.body.description ? String(req.body.description).trim() : '',
      status: req.body.status || 'planning',
      budget: req.body.budget ? parseFloat(req.body.budget) || 0 : 0,
      currency: req.body.currency || 'USD',
      billable: req.body.billable !== undefined ? req.body.billable : true,
      billingRate: req.body.billingRate ? parseFloat(req.body.billingRate) || 0 : 0,
      startDate: req.body.startDate ? new Date(req.body.startDate) : new Date(),
      endDate: req.body.endDate ? new Date(req.body.endDate) : null,
      tags: Array.isArray(req.body.tags) ? req.body.tags : [],
      // Budget hours fields
      hoursBudgetType: req.body.hoursBudgetType || '',
      totalBudgetHours: req.body.totalBudgetHours ? String(req.body.totalBudgetHours) : '',
    };

    // Handle customer if provided
    if (req.body.customer) {
      // Validate customer ID format
      if (typeof req.body.customer === 'string' && req.body.customer.match(/^[0-9a-fA-F]{24}$/)) {
        projectData.customer = req.body.customer;
      } else if (req.body.customerId && typeof req.body.customerId === 'string' && req.body.customerId.match(/^[0-9a-fA-F]{24}$/)) {
        projectData.customer = req.body.customerId;
      }
    }

    // Validate hoursBudgetType enum value
    if (req.body.hoursBudgetType && !['total-project-hours', 'hours-per-task', 'hours-per-staff', ''].includes(req.body.hoursBudgetType)) {
      res.status(400).json({ success: false, message: "Invalid hoursBudgetType value" });
      return;
    }

    // Handle assignedTo if provided
    if (req.body.assignedTo && Array.isArray(req.body.assignedTo) && req.body.assignedTo.length > 0) {
      const validUserIds = req.body.assignedTo.filter((id: any) =>
        typeof id === 'string' && id.match(/^[0-9a-fA-F]{24}$/)
      );
      if (validUserIds.length > 0) {
        projectData.assignedTo = validUserIds;
      }
    }

    // Handle tasks if provided
    if (req.body.tasks && Array.isArray(req.body.tasks) && req.body.tasks.length > 0) {
      projectData.tasks = req.body.tasks
        .filter((task: any) => task && (task.taskName || task.description)) // Only include tasks with at least a name or description
        .map((task: any) => ({
          taskName: task.taskName || '',
          description: task.description || '',
          billable: task.billable !== undefined ? task.billable : true,
          budgetHours: task.budgetHours || '',
        }));
    }

    // Handle user budget hours if provided
    if (req.body.userBudgetHours && Array.isArray(req.body.userBudgetHours) && req.body.userBudgetHours.length > 0) {
      projectData.userBudgetHours = req.body.userBudgetHours
        .filter((ubh: any) => ubh && ubh.user && typeof ubh.user === 'string' && ubh.user.match(/^[0-9a-fA-F]{24}$/))
        .map((ubh: any) => ({
          user: ubh.user,
          budgetHours: ubh.budgetHours || '',
        }));
    }

    const project = await Project.create(projectData);

    const populatedProject = await Project.findById(project._id)
      .populate("customer", "name email")
      .populate("assignedTo", "name email")
      .populate("userBudgetHours.user", "name email");

    res.status(201).json({ success: true, data: populatedProject });
  } catch (error: any) {
    console.error('Error creating project:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      keyPattern: error.keyPattern,
      keyValue: error.keyValue
    });

    // Handle specific MongoDB errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err: any) => err.message).join(', ');
      res.status(400).json({
        success: false,
        message: `Validation error: ${messages}`,
        errors: error.errors
      });
      return;
    }

    // Handle duplicate key error (e.g., duplicate projectNumber)
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0] || 'field';
      res.status(400).json({
        success: false,
        message: `${field} already exists`,
        duplicateField: field
      });
      return;
    }

    // Return more detailed error information
    const statusCode = error.name === 'ValidationError' ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to create project',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

export const updateProject = async (req: Request, res: Response): Promise<void> => {
  try {
    // Prepare update data
    const updateData: any = { ...req.body };

    // Handle tasks if provided
    if (req.body.tasks && Array.isArray(req.body.tasks)) {
      updateData.tasks = req.body.tasks.map((task: any) => ({
        taskName: task.taskName || '',
        description: task.description || '',
        billable: task.billable !== undefined ? task.billable : true,
        budgetHours: task.budgetHours || '',
      }));
    }

    // Handle user budget hours if provided
    if (req.body.userBudgetHours && Array.isArray(req.body.userBudgetHours)) {
      updateData.userBudgetHours = req.body.userBudgetHours
        .filter((ubh: any) => ubh.user && typeof ubh.user === 'string' && ubh.user.match(/^[0-9a-fA-F]{24}$/))
        .map((ubh: any) => ({
          user: ubh.user,
          budgetHours: ubh.budgetHours || '',
        }));
    }

    // Handle assignedTo if provided
    if (req.body.assignedTo && Array.isArray(req.body.assignedTo)) {
      updateData.assignedTo = req.body.assignedTo.filter((id: any) =>
        typeof id === 'string' && id.match(/^[0-9a-fA-F]{24}$/)
      );
    }

    // Handle customer if provided
    if (req.body.customer) {
      if (typeof req.body.customer === 'string' && req.body.customer.match(/^[0-9a-fA-F]{24}$/)) {
        updateData.customer = req.body.customer;
      } else if (req.body.customerId) {
        updateData.customer = req.body.customerId;
      }
    }

    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, organization: (req as any).user.organizationId },
      updateData,
      { new: true, runValidators: true }
    )
      .populate("customer", "name email")
      .populate("assignedTo", "name email")
      .populate("userBudgetHours.user", "name email");

    if (!project) {
      res.status(404).json({ success: false, message: "Project not found" });
      return;
    }

    res.json({ success: true, data: project });
  } catch (error: any) {
    console.error('Error updating project:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteProject = async (req: Request, res: Response): Promise<void> => {
  try {
    const project = await Project.findOneAndDelete({
      _id: req.params.id,
      organization: (req as any).user.organizationId,
    });

    if (!project) {
      res.status(404).json({ success: false, message: "Project not found" });
      return;
    }

    // Delete associated time entries
    await TimeEntry.deleteMany({ project: req.params.id });

    res.json({ success: true, message: "Project deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================================
// TIME ENTRIES
// ============================================================================

export const getTimeEntries = async (req: Request, res: Response): Promise<void> => {
  try {
    const query: any = { organization: (req as any).user.organizationId };

    // Filter by project if provided
    if (req.query.projectId) {
      query.project = req.query.projectId;
    }

    // Filter by date range if provided
    if (req.query.startDate || req.query.endDate) {
      query.date = {};
      if (req.query.startDate) {
        query.date.$gte = new Date(req.query.startDate as string);
      }
      if (req.query.endDate) {
        query.date.$lte = new Date(req.query.endDate as string);
      }
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 500;
    const skip = (page - 1) * limit;

    const timeEntries = await TimeEntry.find(query)
      .populate("project", "name projectNumber")
      .populate("user", "name email")
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await TimeEntry.countDocuments(query);

    res.json({
      success: true,
      data: timeEntries,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getTimeEntry = async (req: Request, res: Response): Promise<void> => {
  try {
    const timeEntry = await TimeEntry.findOne({
      _id: req.params.id,
      organization: (req as any).user.organizationId,
    })
      .populate("project", "name projectNumber")
      .populate("user", "name email");

    if (!timeEntry) {
      res.status(404).json({ success: false, message: "Time entry not found" });
      return;
    }

    res.json({ success: true, data: timeEntry });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createTimeEntry = async (req: Request, res: Response): Promise<void> => {
  try {
    const timeEntry = await TimeEntry.create({
      ...req.body,
      organization: (req as any).user.organizationId,
      user: req.body.user || (req as any).user.userId, // Use current user if not specified
    });

    const populatedEntry = await TimeEntry.findById(timeEntry._id)
      .populate("project", "name projectNumber")
      .populate("user", "name email");

    res.status(201).json({ success: true, data: populatedEntry });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateTimeEntry = async (req: Request, res: Response): Promise<void> => {
  try {
    const timeEntry = await TimeEntry.findOneAndUpdate(
      { _id: req.params.id, organization: (req as any).user.organizationId },
      req.body,
      { new: true, runValidators: true }
    )
      .populate("project", "name projectNumber")
      .populate("user", "name email");

    if (!timeEntry) {
      res.status(404).json({ success: false, message: "Time entry not found" });
      return;
    }

    res.json({ success: true, data: timeEntry });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteTimeEntry = async (req: Request, res: Response): Promise<void> => {
  try {
    const timeEntry = await TimeEntry.findOneAndDelete({
      _id: req.params.id,
      organization: (req as any).user.organizationId,
    });

    if (!timeEntry) {
      res.status(404).json({ success: false, message: "Time entry not found" });
      return;
    }

    res.json({ success: true, message: "Time entry deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export default {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  getTimeEntries,
  getTimeEntry,
  createTimeEntry,
  updateTimeEntry,
  deleteTimeEntry,
};

