/**
 * Reminder Controller
 * Handles automated reminders
 */

import { Request, Response } from "express";
import Reminder from "../models/Reminder.js";

/**
 * Get all reminders
 * GET /api/settings/reminders
 */
export const getReminders = async (req: Request, res: Response): Promise<void> => {
  try {
    const { type, status } = req.query;
    const query: any = {
      organization: (req as any).user.organizationId,
    };

    if (type) {
      query.type = type;
    }

    if (status === "active") {
      query.isActive = true;
    } else if (status === "inactive") {
      query.isActive = false;
    }

    const reminders = await Reminder.find(query)
      .populate("recipients.internalUsers", "name email")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: reminders,
    });
  } catch (error: any) {
    console.error("Error fetching reminders:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch reminders",
    });
  }
};

/**
 * Get single reminder
 * GET /api/settings/reminders/:id
 */
export const getReminder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const reminder = await Reminder.findOne({
      _id: id,
      organization: (req as any).user.organizationId,
    })
      .populate("recipients.internalUsers", "name email");

    if (!reminder) {
      res.status(404).json({
        success: false,
        message: "Reminder not found",
      });
      return;
    }

    res.json({
      success: true,
      data: reminder,
    });
  } catch (error: any) {
    console.error("Error fetching reminder:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch reminder",
    });
  }
};

/**
 * Create reminder
 * POST /api/settings/reminders
 */
export const createReminder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { key, name, type, entityType, conditions, recipients, email, isActive } = req.body;

    if (!name || !type || !entityType) {
      res.status(400).json({
        success: false,
        message: "Name, type, and entity type are required",
      });
      return;
    }

    const normalizedConditions = conditions || {};
    if (!normalizedConditions.basedOn) {
      normalizedConditions.basedOn = type === "payment_due" ? "expectedPaymentDate" : "dueDate";
    }

    const reminderPayload: any = {
      organization: (req as any).user.organizationId,
      key: key || undefined,
      name,
      type,
      entityType,
      conditions: normalizedConditions,
      recipients: recipients || {},
      email: email || {},
    };

    if (typeof isActive === "boolean") {
      reminderPayload.isActive = isActive;
    }

    // If a stable key is provided, upsert by (org, key) to avoid duplicates.
    if (key) {
      const existing = await Reminder.findOne({
        organization: (req as any).user.organizationId,
        key,
      });
      if (existing) {
        Object.assign(existing, reminderPayload);
        await existing.save();
        res.status(200).json({
          success: true,
          message: "Reminder updated successfully",
          data: existing,
        });
        return;
      }
    }

    const reminder = await Reminder.create(reminderPayload);

    res.status(201).json({
      success: true,
      message: "Reminder created successfully",
      data: reminder,
    });
  } catch (error: any) {
    console.error("Error creating reminder:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create reminder",
    });
  }
};

/**
 * Update reminder
 * PUT /api/settings/reminders/:id
 */
export const updateReminder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { key, name, type, entityType, conditions, recipients, email, isActive } = req.body;

    const reminder = await Reminder.findOne({
      _id: id,
      organization: (req as any).user.organizationId,
    });

    if (!reminder) {
      res.status(404).json({
        success: false,
        message: "Reminder not found",
      });
      return;
    }

    if (key !== undefined) reminder.key = key;
    if (name) reminder.name = name;
    if (type) reminder.type = type;
    if (entityType) reminder.entityType = entityType;
    if (conditions) reminder.conditions = conditions;
    if (recipients) reminder.recipients = recipients;
    if (email) reminder.email = email;
    if (isActive !== undefined) reminder.isActive = isActive;

    await reminder.save();

    res.json({
      success: true,
      message: "Reminder updated successfully",
      data: reminder,
    });
  } catch (error: any) {
    console.error("Error updating reminder:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update reminder",
    });
  }
};

/**
 * Delete reminder
 * DELETE /api/settings/reminders/:id
 */
export const deleteReminder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const reminder = await Reminder.findOne({
      _id: id,
      organization: (req as any).user.organizationId,
    });

    if (!reminder) {
      res.status(404).json({
        success: false,
        message: "Reminder not found",
      });
      return;
    }

    await Reminder.deleteOne({ _id: id });

    res.json({
      success: true,
      message: "Reminder deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting reminder:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete reminder",
    });
  }
};

export default {
  getReminders,
  getReminder,
  createReminder,
  updateReminder,
  deleteReminder,
};
