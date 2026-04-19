/**
 * Audit Middleware
 * Audit logs (who did what)
 */

import { Request, Response, NextFunction } from "express";
import User from "../models/User.js";

/**
 * Log user actions for audit trail
 */
export const auditLog = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // Skip audit for GET requests (read operations)
  if (req.method === "GET") {
    next();
    return;
  }

  try {
    const user = await User.findById((req as any).user?.userId);

    // Log action
    console.log(`[AUDIT] ${req.method} ${req.originalUrl} - User: ${user?.email || "Unknown"} - ${new Date().toISOString()}`);

    // TODO: Store in audit log collection
    // await AuditLog.create({
    //   user: req.user.userId,
    //   action: `${req.method} ${req.originalUrl}`,
    //   resource: req.params.id || req.body.id,
    //   ip: req.ip,
    //   userAgent: req.get("user-agent"),
    // });

    next();
  } catch (error) {
    // Don't block request if audit fails
    console.error("Audit log error:", error);
    next();
  }
};

export default { auditLog };
