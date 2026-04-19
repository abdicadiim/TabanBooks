/**
 * Express Type Definitions
 * Extend Express Request to include user property
 */

import { Request } from "express";

declare global {
  namespace Express {
    interface Request {
      user?: {
      userId: string;
      organizationId: string;
      role: string;
      email?: string;
      isVerified?: boolean;
      organizationIds?: string[];
      organizationExternalId?: string;
    };
  }
}
}

export {};

