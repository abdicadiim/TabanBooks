/**
 * Authentication Middleware
 * JWT authentication
 */

import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import dotenv from "dotenv";
import { measureRequestStep, RequestTimingState } from "../utils/requestTiming.js";
import {
    findAccessibleOrganizationByIdentifier,
    getUserOrganizationIds,
} from "../services/organizationResource.service.js";

dotenv.config();

interface DecodedToken {
    userId: string;
}

export interface AuthRequest extends Request {
    user?: {
        userId: string;
        organizationId: string;
        role: string;
        email?: string;
        isVerified?: boolean;
        organizationIds?: string[];
        organizationExternalId?: string;
    };
    requestTiming?: RequestTimingState;
}

const verificationExemptPrefixes = [
    "/api/auth/verify-account",
    "/api/auth/resend-otp",
    "/api/auth/logout",
    "/api/auth/me",
    "/api/settings/organization/profile",
    "/api/settings/organization/branding",
];

const isVerificationExemptRequest = (requestPath: string): boolean =>
    verificationExemptPrefixes.some((prefix) => requestPath.startsWith(prefix));

/**
 * Protect routes - require authentication
 */
export const protect = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        let token: string | undefined;

        // Get token from header
        if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
            token = req.headers.authorization.split(" ")[1];
        }

        if (!token) {
            console.warn('[AUTH] No token provided for:', req.originalUrl);
            res.status(401).json({
                success: false,
                message: "Not authorized to access this route",
            });
            return;
        }

        try {
            const verifyStartedAt = Date.now();
            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key-change-in-production") as DecodedToken;
            req.requestTiming = req.requestTiming || { startedAt: verifyStartedAt, steps: [] };
            req.requestTiming.steps.push({ name: "auth.jwt.verify", ms: Date.now() - verifyStartedAt });

            if (!decoded || !decoded.userId) {
                console.error('[AUTH] Invalid token payload:', decoded);
                res.status(401).json({ success: false, message: "Invalid token" });
                return;
            }

            // Check if user still exists
            const user = await measureRequestStep(
                req,
                "auth.user.lookup",
                () => User.findById(decoded.userId).select("_id organization organizationMemberships role email isActive").lean(),
                { projection: "_id organization organizationMemberships role email isActive" }
            );
            if (!user || !user.isActive) {
                console.warn('[AUTH] User not found or inactive:', decoded.userId);
                res.status(401).json({
                    success: false,
                    message: "User no longer exists or is inactive",
                });
                return;
            }

            const organizationIds = getUserOrganizationIds(user);
            const requestedOrganizationId =
                typeof req.query.organization_id === "string"
                    ? req.query.organization_id.trim()
                    : "";
            const fallbackOrganizationId =
                user.organization ? user.organization.toString() : organizationIds[0] || "";

            if (!organizationIds.length && !fallbackOrganizationId) {
                res.status(401).json({
                    success: false,
                    message: "No organization is linked to this user",
                });
                return;
            }

            // Get user from token
            req.user = {
                userId: user._id.toString(),
                organizationId: fallbackOrganizationId,
                role: user.role || "staff",
                email: user.email,
                isVerified: false,
                organizationIds,
            };

            if (fallbackOrganizationId) {
                const organization = await measureRequestStep(
                    req,
                    "auth.organization.lookup",
                    () =>
                        findAccessibleOrganizationByIdentifier({
                            organizationIds: organizationIds.length ? organizationIds : [fallbackOrganizationId],
                            identifier: requestedOrganizationId || fallbackOrganizationId,
                        }),
                    { projection: "isVerified organizationId" }
                );

                if (!organization) {
                    res.status(requestedOrganizationId ? 403 : 401).json({
                        success: false,
                        message: requestedOrganizationId
                            ? "You do not have access to the requested organization"
                            : "Organization not found",
                    });
                    return;
                }

                req.user.organizationId = organization._id.toString();
                req.user.organizationExternalId = String((organization as any).organizationId || "");

                const isVerified = Boolean(organization.isVerified);
                req.user.isVerified = isVerified;

                if (!isVerified && !isVerificationExemptRequest(req.originalUrl)) {
                    res.status(403).json({
                        success: false,
                        code: "ACCOUNT_NOT_VERIFIED",
                        message: "Account is not verified. Please verify your account to continue.",
                        data: { isVerified: false },
                    });
                    return;
                }
            }

            next();
        } catch (error: any) {
            console.error('[AUTH] Token verification failed:', error.message);
            res.status(401).json({
                success: false,
                message: "Not authorized to access this route",
            });
        }
    } catch (error: any) {
        console.error("[AUTH] CRITICAL Auth middleware error:", error);
        res.status(500).json({
            success: false,
            message: "Authentication error",
            error: error.message,
            stack: error.stack
        });
    }
};

export default { protect };

