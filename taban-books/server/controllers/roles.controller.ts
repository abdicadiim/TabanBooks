/**
 * Roles Controller
 * Handle role-related operations
 */

import { Request, Response } from "express";
import Role from "../models/Role.js";
import User from "../models/User.js";

interface AuthRequest extends Request {
  user?: {
    userId: string;
    organizationId: string;
    role: string;
  };
}

const SYSTEM_ROLE_NAMES = new Set([
  "admin",
  "staff",
  "timesheet staff",
  "staff (assigned customers only)",
]);

const isAdminOrOwner = (req: AuthRequest): boolean => {
  const role = String(req.user?.role || "").toLowerCase();
  return role === "owner" || role === "admin";
};

/**
 * Get all roles from database
 * GET /api/roles
 */
export const getRoles = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const organizationId = (req as any).user?.organizationId;

    if (!organizationId) {
      res.status(401).json({
        success: false,
        message: "Organization ID is required. Please ensure you are authenticated."
      });
      return;
    }

    const query: any = { organization: organizationId, isActive: true };

    const roles = await Role.find(query)
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({ success: true, data: roles });
  } catch (error: any) {
    console.error("Error in getRoles:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get single role by ID
 * GET /api/roles/:id
 */
export const getRoleById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const organizationId = (req as any).user?.organizationId;

    const role = await Role.findOne({ _id: id, organization: organizationId });

    if (!role) {
      res.status(404).json({ success: false, message: "Role not found" });
      return;
    }

    res.status(200).json({ success: true, data: role });
  } catch (error: any) {
    console.error("Error in getRoleById:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Create a new role
 * POST /api/roles
 */
export const createRole = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!isAdminOrOwner(req)) {
      res.status(403).json({ success: false, message: "Only Admin users can create roles." });
      return;
    }

    const organizationId = (req as any).user?.organizationId;

    if (!organizationId) {
      res.status(401).json({
        success: false,
        message: "Organization ID is required. Please ensure you are authenticated."
      });
      return;
    }

    const {
      name,
      description,
      isAccountantRole,
      contacts,
      items,
      banking,
      sales,
      purchases,
      accountant,
      timesheets,
      locations,
      vatFiling,
      documents,
      settings,
      dashboard,
      reports
    } = req.body;

    // Check if role name already exists in organization
    const existingRole = await Role.findOne({
      organization: organizationId,
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      isActive: true
    });

    if (existingRole) {
      res.status(400).json({
        success: false,
        message: "A role with this name already exists"
      });
      return;
    }

    const newRole = await Role.create({
      organization: organizationId,
      name,
      description,
      isAccountantRole,
      contacts,
      items,
      banking,
      sales,
      purchases,
      accountant,
      timesheets,
      locations,
      vatFiling,
      documents,
      settings,
      dashboard,
      reports,
      isActive: true
    });

    res.status(201).json({ success: true, data: newRole });
  } catch (error: any) {
    console.error("Error in createRole:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update an existing role
 * PUT /api/roles/:id
 */
export const updateRole = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!isAdminOrOwner(req)) {
      res.status(403).json({ success: false, message: "Only Admin users can edit roles." });
      return;
    }

    const { id } = req.params;
    const organizationId = (req as any).user?.organizationId;

    const role = await Role.findOne({ _id: id, organization: organizationId });

    if (!role) {
      res.status(404).json({ success: false, message: "Role not found" });
      return;
    }
    if (SYSTEM_ROLE_NAMES.has(String(role.name || "").toLowerCase())) {
      res.status(400).json({ success: false, message: "Default roles cannot be edited." });
      return;
    }

    const {
      name,
      description,
      isAccountantRole,
      contacts,
      items,
      banking,
      sales,
      purchases,
      accountant,
      timesheets,
      locations,
      vatFiling,
      documents,
      settings,
      dashboard,
      reports
    } = req.body;

    // Check availability if name changed
    if (name && name !== role.name) {
      const existingRole = await Role.findOne({
        organization: organizationId,
        name: { $regex: new RegExp(`^${name}$`, 'i') },
        _id: { $ne: id },
        isActive: true
      });

      if (existingRole) {
        res.status(400).json({
          success: false,
          message: "A role with this name already exists"
        });
        return;
      }
    }

    // Update fields
    if (name) role.name = name;
    if (description !== undefined) role.description = description;
    if (isAccountantRole !== undefined) role.isAccountantRole = isAccountantRole;
    if (contacts) role.contacts = contacts;
    if (items) role.items = items;
    if (banking) role.banking = banking;
    if (sales) role.sales = sales;
    if (purchases) role.purchases = purchases;
    if (accountant) role.accountant = accountant;
    if (timesheets) role.timesheets = timesheets;
    if (locations) role.locations = locations;
    if (vatFiling) role.vatFiling = vatFiling;
    if (documents) role.documents = documents;
    if (settings) role.settings = settings;
    if (dashboard) role.dashboard = dashboard;
    if (reports) role.reports = reports;

    await role.save();

    res.status(200).json({ success: true, data: role });
  } catch (error: any) {
    console.error("Error in updateRole:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Delete a role (soft delete)
 * DELETE /api/roles/:id
 */
export const deleteRole = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!isAdminOrOwner(req)) {
      res.status(403).json({ success: false, message: "Only Admin users can delete roles." });
      return;
    }

    const { id } = req.params;
    const organizationId = (req as any).user?.organizationId;

    const role = await Role.findOne({ _id: id, organization: organizationId, isActive: true });
    if (!role) {
      res.status(404).json({ success: false, message: "Role not found" });
      return;
    }
    if (SYSTEM_ROLE_NAMES.has(String(role.name || "").toLowerCase())) {
      res.status(400).json({ success: false, message: "Default roles cannot be deleted." });
      return;
    }

    const usersWithRole = await User.countDocuments({
      organization: organizationId,
      role: role.name,
      isActive: true,
    });
    if (usersWithRole > 0) {
      res.status(400).json({
        success: false,
        message: `Cannot delete role. It is assigned to ${usersWithRole} user(s). Please reassign users first.`,
      });
      return;
    }

    const deletedRole = await Role.findOneAndUpdate(
      { _id: id, organization: organizationId },
      { isActive: false },
      { new: true }
    );

    if (!deletedRole) {
      res.status(404).json({ success: false, message: "Role not found" });
      return;
    }

    res.status(200).json({ success: true, message: "Role deleted successfully" });
  } catch (error: any) {
    console.error("Error in deleteRole:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

