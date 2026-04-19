/**
 * Role Middleware
 * Role & permission checks
 */

import { Request, Response, NextFunction } from "express";
import { hasPermission } from "../config/permissions.js";
import User from "../models/User.js";

/**
 * Check if user has permission for an action in a module
 */
export const checkPermission = (module: string, action: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await User.findById((req as any).user.userId);

      if (!user) {
        res.status(404).json({
          success: false,
          message: "User not found",
        });
        return;
      }

      if (!hasPermission(user.role, module, action)) {
        res.status(403).json({
          success: false,
          message: `You don't have permission to ${action} ${module}`,
        });
        return;
      }

      (req as any).user.role = user.role;
      next();
    } catch (error: any) {
      console.error("Permission check error:", error);
      res.status(500).json({
        success: false,
        message: "Permission check error",
      });
    }
  };
};

/**
 * Check if user has one of the required roles
 */
export const requireRole = (...roles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await User.findById((req as any).user.userId);

      if (!user) {
        res.status(404).json({
          success: false,
          message: "User not found",
        });
        return;
      }

      if (!roles.includes(user.role)) {
        res.status(403).json({
          success: false,
          message: "You don't have the required role to access this resource",
        });
        return;
      }

      (req as any).user.role = user.role;
      next();
    } catch (error: any) {
      console.error("Role check error:", error);
      res.status(500).json({
        success: false,
        message: "Role check error",
      });
    }
  };
};

export default { checkPermission, requireRole };

