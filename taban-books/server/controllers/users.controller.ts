/**
 * Users Controller
 * Handle user-related operations
 */

import { Request, Response } from "express";
import User from "../models/User.js";
import Role from "../models/Role.js";
import { sendInvitationEmail } from "../services/email.service.js";
import { getUserPermissions } from "../utils/permissionChecker.js";


interface AuthRequest extends Request {
  user?: {
    userId: string;
    organizationId: string;
    role: string;
    organization?: string;
  };
}

const SYSTEM_ROLE_MAP: Record<string, string> = {
  owner: "owner",
  admin: "admin",
  staff: "staff",
  "timesheet staff": "timesheet_staff",
  timesheet_staff: "timesheet_staff",
  "staff (assigned customers only)": "staff_assigned",
  "staff assigned": "staff_assigned",
  staff_assigned: "staff_assigned",
  accountant: "accountant",
  manager: "manager",
  viewer: "viewer",
};

const ROLE_LABEL_MAP: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  staff: "Staff",
  timesheet_staff: "Timesheet Staff",
  staff_assigned: "Staff (Assigned Customers Only)",
  accountant: "Accountant",
  manager: "Manager",
  viewer: "Viewer",
};

const isAdminOrOwner = (req: AuthRequest): boolean => {
  const role = String(req.user?.role || "").toLowerCase();
  return role === "owner" || role === "admin";
};

const toRoleLabel = (roleValue: string): string => {
  const normalized = String(roleValue || "").trim().toLowerCase();
  if (ROLE_LABEL_MAP[normalized]) return ROLE_LABEL_MAP[normalized];
  if (!roleValue) return "";
  return roleValue
    .replace(/_/g, " ")
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
};

const normalizeRoleValue = async (roleInput: any, organizationId: any): Promise<string> => {
  const raw = String(roleInput || "").trim();
  const lower = raw.toLowerCase();
  if (SYSTEM_ROLE_MAP[lower]) return SYSTEM_ROLE_MAP[lower];

  const customRole = await Role.findOne({
    organization: organizationId,
    isActive: true,
    name: { $regex: new RegExp(`^${raw}$`, "i") },
  }).lean();

  if (customRole?.name) return customRole.name;
  return raw;
};

/**
 * Get all users
 * GET /api/users
 */
export const getUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Get current user's organization
    const organizationId = req.user?.organizationId || req.user?.organization;

    if (!organizationId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    // Find all users in the same organization (including inactive)
    const query: any = { organization: organizationId };
    const statusFilter = String((req.query as any)?.status || "").toLowerCase();
    if (statusFilter === "active") query.isActive = true;
    if (statusFilter === "inactive") query.isActive = false;

    const users = await User.find(query)
      .select("-password") // Exclude password
      .sort({ createdAt: -1 }) // Sort by newest first
      .lean();

    // Format users for frontend (similar to settings controller)
    const formattedUsers = users.map((user: any) => {
      // Determine status: Invited if no lastLogin and not active, Active if isActive, Inactive otherwise
      const userStatus = !user.lastLogin && !user.isActive ? 'Invited' : (user.isActive ? 'Active' : 'Inactive');

      return {
        id: user._id,
        name: user.name,
        email: user.email,
        roleKey: user.role || "",
        role: toRoleLabel(user.role || ""),
        status: userStatus,
        avatar: user.name ? user.name.charAt(0).toUpperCase() : '?',
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
        isActive: user.isActive,
      };
    });

    res.status(200).json({ success: true, data: formattedUsers });
  } catch (error: any) {
    console.error("Error in getUsers:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get user by ID
 * GET /api/users/:id
 */
export const getUserById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const organizationId = req.user?.organizationId || req.user?.organization;

    if (!organizationId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const user = await User.findOne({
      _id: id,
      organization: organizationId,
    }).select("-password");

    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    res.status(200).json({ success: true, data: user });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Create a new user (Invite)
 * POST /api/users
 */
export const createUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!isAdminOrOwner(req)) {
      res.status(403).json({ success: false, message: "Only Admin users can add new users." });
      return;
    }

    const organizationId = req.user?.organizationId || req.user?.organization;

    if (!organizationId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const {
      name,
      email,
      role,
      password,
      accessibleLocations,
      defaultBusinessLocation,
      defaultWarehouseLocation,
      skipEmail
    } = req.body;

    const normalizedRole = await normalizeRoleValue(role, organizationId);

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({
        success: false,
        message: "User already exists with this email",
      });
      return;
    }

    // Create user
    // If skipEmail is true, we assume it's an invite and set as inactive (Invited status logic)
    const user = await User.create({
      name,
      email,
      password, // Will be hashed by pre-save hook
      organization: organizationId,
      organizationMemberships: [organizationId],
      role: normalizedRole,
      accessibleLocations,
      defaultBusinessLocation,
      defaultWarehouseLocation,
      isActive: false, // Set as inactive initially (Invited status)
    });

    // In a real app, we would send an email here if !skipEmail

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: 'Invited'
      }
    });
  } catch (error: any) {
    console.error("Error in createUser:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update a user
 * PUT /api/users/:id
 */
export const updateUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!isAdminOrOwner(req)) {
      res.status(403).json({ success: false, message: "Only Admin users can edit users." });
      return;
    }

    const { id } = req.params;
    const organizationId = req.user?.organizationId || req.user?.organization;

    const user = await User.findOne({ _id: id, organization: organizationId });

    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    const {
      name,
      email,
      role,
      password,
      accessibleLocations,
      defaultBusinessLocation,
      defaultWarehouseLocation,
      isActive
    } = req.body;

    if (name) user.name = name;
    if (email) user.email = email;
    if (role) user.role = await normalizeRoleValue(role, organizationId);
    if (password) user.password = password; // Will be hashed by pre-save hook
    if (accessibleLocations) user.accessibleLocations = accessibleLocations;
    if (defaultBusinessLocation !== undefined) user.defaultBusinessLocation = defaultBusinessLocation;
    if (defaultWarehouseLocation !== undefined) user.defaultWarehouseLocation = defaultWarehouseLocation;
    if (isActive !== undefined) user.isActive = isActive;

    await user.save();

    res.status(200).json({ success: true, data: user });
  } catch (error: any) {
    console.error("Error in updateUser:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Delete a user
 * DELETE /api/users/:id
 */
export const deleteUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!isAdminOrOwner(req)) {
      res.status(403).json({ success: false, message: "Only Admin users can delete users." });
      return;
    }

    const { id } = req.params;
    const organizationId = req.user?.organizationId || req.user?.organization;

    // Prevent deleting yourself? Maybe not for now.

    const user = await User.findOneAndDelete({ _id: id, organization: organizationId });

    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    res.status(200).json({ success: true, message: "User deleted successfully" });
  } catch (error: any) {
    console.error("Error in deleteUser:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Send invitation to user
 * POST /api/users/:id/invite
 */
export const sendInvitation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!isAdminOrOwner(req)) {
      res.status(403).json({ success: false, message: "Only Admin users can send invitations." });
      return;
    }

    const { id } = req.params;
    const organizationId = req.user?.organizationId || req.user?.organization;
    const { tempPassword, accessibleLocations, defaultBusinessLocation, defaultWarehouseLocation } = req.body;

    const user = await User.findOne({ _id: id, organization: organizationId });

    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    // Update fields if provided
    if (accessibleLocations) user.accessibleLocations = accessibleLocations;
    if (defaultBusinessLocation !== undefined) user.defaultBusinessLocation = defaultBusinessLocation;
    if (defaultWarehouseLocation !== undefined) user.defaultWarehouseLocation = defaultWarehouseLocation;

    // If tempPassword provided, update password
    if (tempPassword) user.password = tempPassword;

    await user.save();

    // Send invitation email
    const emailResult = await sendInvitationEmail({
      name: user.name,
      email: user.email,
      password: tempPassword || "unchanged",
      role: user.role,
      organizationId: organizationId,
    });

    if (emailResult.success) {
      if ((emailResult as any).logged) {
        console.log("Email logged (SMTP not configured)");
      }
      res.status(200).json({ success: true, message: "Invitation sent successfully" });
    } else {
      console.error("Failed to send email:", (emailResult as any).error);
      res.status(500).json({
        success: false,
        message: (emailResult as any).error || "Failed to send email",
      });
    }

  } catch (error: any) {
    console.error("Error in sendInvitation:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get current user's permissions
 * GET /api/users/me/permissions
 */
export const getMyPermissions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const permissions = await getUserPermissions(userId);

    if (!permissions) {
      res.status(200).json({
        success: true,
        data: { fullAccess: false, role: "unknown" },
      });
      return;
    }

    res.status(200).json({ success: true, data: permissions });
  } catch (error: any) {
    console.error("Error in getMyPermissions:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


