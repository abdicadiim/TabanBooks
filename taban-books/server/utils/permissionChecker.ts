/**
 * Permission Checker Utility
 * Checks permissions for custom roles
 */

import Role, { IRole } from "../models/Role.js";
import User from "../models/User.js";
import mongoose from "mongoose";

const normalizeRoleName = (role: string = ""): string =>
    String(role || "").trim().toLowerCase().replace(/\s+/g, "_");

const fullCrud = { view: true, create: true, edit: true, delete: true };
const viewOnly = { view: true, create: false, edit: false, delete: false };
const noneCrud = { view: false, create: false, edit: false, delete: false };

const getSystemRolePermissions = (rawRole: string) => {
    const role = normalizeRoleName(rawRole);

    // Staff: all operational modules except reports, settings and accountant.
    if (role === "staff" || role === "staff_assigned") {
        return {
            fullAccess: false,
            role,
            contacts: {
                customers: fullCrud,
                vendors: fullCrud,
            },
            items: {
                item: fullCrud,
                inventoryAdjustments: fullCrud,
            },
            banking: {
                banking: fullCrud,
            },
            sales: {
                invoices: fullCrud,
                customerPayments: fullCrud,
                quotes: fullCrud,
                salesReceipt: fullCrud,
                salesOrders: fullCrud,
                creditNotes: fullCrud,
            },
            purchases: {
                bills: fullCrud,
                vendorPayments: fullCrud,
                expenses: fullCrud,
                purchaseOrders: fullCrud,
                vendorCredits: fullCrud,
            },
            accountant: {
                chartOfAccounts: noneCrud,
                journals: noneCrud,
                budget: noneCrud,
            },
            timesheets: {
                projects: fullCrud,
            },
            locations: {},
            vatFiling: {},
            documents: {
                documents: fullCrud,
            },
            settings: { view: false },
            dashboard: { view: true },
            reports: { view: false, fullReportsAccess: false, reportGroups: {} },
        };
    }

    // Timesheet Staff: only timesheet module access.
    if (role === "timesheet_staff" || role === "timesheet_staff_only") {
        return {
            fullAccess: false,
            role,
            contacts: {
                customers: noneCrud,
                vendors: noneCrud,
            },
            items: {
                item: noneCrud,
                inventoryAdjustments: noneCrud,
            },
            banking: {
                banking: noneCrud,
            },
            sales: {
                invoices: noneCrud,
                customerPayments: noneCrud,
                quotes: noneCrud,
                salesReceipt: noneCrud,
                salesOrders: noneCrud,
                creditNotes: noneCrud,
            },
            purchases: {
                bills: noneCrud,
                vendorPayments: noneCrud,
                expenses: noneCrud,
                purchaseOrders: noneCrud,
                vendorCredits: noneCrud,
            },
            accountant: {
                chartOfAccounts: noneCrud,
                journals: noneCrud,
                budget: noneCrud,
            },
            timesheets: {
                projects: fullCrud,
            },
            locations: {},
            vatFiling: {},
            documents: {
                documents: noneCrud,
            },
            settings: { view: false },
            dashboard: { view: false },
            reports: { view: false, fullReportsAccess: false, reportGroups: {} },
        };
    }

    // Viewer fallback: read-only for common modules.
    if (role === "viewer") {
        return {
            fullAccess: false,
            role,
            contacts: { customers: viewOnly, vendors: viewOnly },
            items: { item: viewOnly, inventoryAdjustments: viewOnly },
            banking: { banking: viewOnly },
            sales: {
                invoices: viewOnly,
                customerPayments: viewOnly,
                quotes: viewOnly,
                salesReceipt: viewOnly,
                salesOrders: viewOnly,
                creditNotes: viewOnly,
            },
            purchases: {
                bills: viewOnly,
                vendorPayments: viewOnly,
                expenses: viewOnly,
                purchaseOrders: viewOnly,
                vendorCredits: viewOnly,
            },
            accountant: {
                chartOfAccounts: noneCrud,
                journals: noneCrud,
                budget: noneCrud,
            },
            timesheets: { projects: viewOnly },
            locations: {},
            vatFiling: {},
            documents: { documents: viewOnly },
            settings: { view: false },
            dashboard: { view: true },
            reports: { view: false, fullReportsAccess: false, reportGroups: {} },
        };
    }

    return null;
};

const mapRoleDocumentToPermissions = (role: any, roleName: string) => ({
    fullAccess: false,
    role: normalizeRoleName(roleName),
    contacts: role.contacts,
    items: role.items,
    banking: role.banking,
    sales: role.sales,
    purchases: role.purchases,
    accountant: role.accountant,
    timesheets: role.timesheets,
    locations: role.locations,
    vatFiling: role.vatFiling,
    documents: role.documents,
    settings: role.settings,
    dashboard: role.dashboard,
    reports: role.reports,
});

async function resolveRolePermissions(user: any): Promise<any | null> {
    const normalizedRole = normalizeRoleName(user.role);

    // Try system-role defaults first.
    const systemPermissions = getSystemRolePermissions(normalizedRole);
    if (systemPermissions) return systemPermissions;

    // Then try custom role lookup with flexible name matching.
    const roleCandidates = Array.from(
        new Set([
            String(user.role || ""),
            normalizedRole,
            normalizedRole.replace(/_/g, " "),
        ])
    ).filter(Boolean);

    const role = await Role.findOne({
        organization: user.organization,
        isActive: true,
        name: { $in: roleCandidates },
    });

    if (!role) return null;
    return mapRoleDocumentToPermissions(role, String(user.role || ""));
}

/**
 * Check if a user has a specific permission
 * @param userId - User ID
 * @param module - Module name (e.g., 'items', 'sales', 'purchases')
 * @param subModule - Sub-module name (e.g., 'invoices', 'bills')
 * @param action - Action to check (e.g., 'view', 'create', 'edit', 'delete')
 * @returns True if user has permission
 */
export async function checkUserPermission(
    userId: string | mongoose.Types.ObjectId,
    module: string,
    subModule?: string,
    action?: string
): Promise<boolean> {
    try {
        // Get user
        const user = await User.findById(userId);
        if (!user) return false;

        // Owner and Admin have all permissions
        if (user.role === "owner" || user.role === "admin") {
            return true;
        }

        const permissions = await resolveRolePermissions(user);
        if (!permissions) {
            return false;
        }

        // Get the module permissions
        const modulePermissions = permissions[module];
        if (!modulePermissions) return false;

        // If no subModule specified, check if module is enabled
        if (!subModule) {
            return true;
        }

        // Get sub-module permissions
        const subModulePermissions = modulePermissions[subModule];
        if (!subModulePermissions) return false;

        // If no action specified, check if sub-module is enabled
        if (!action) {
            return true;
        }

        // Check specific action permission
        return subModulePermissions[action] === true;
    } catch (error) {
        console.error("Permission check error:", error);
        return false;
    }
}

/**
 * Get all permissions for a user
 * @param userId - User ID
 * @returns User's complete permission object
 */
export async function getUserPermissions(
    userId: string | mongoose.Types.ObjectId
): Promise<any> {
    try {
        const user = await User.findById(userId);
        if (!user) return null;

        // Owner and Admin have all permissions
        if (user.role === "owner" || user.role === "admin") {
            return {
                fullAccess: true,
                role: user.role,
            };
        }

        return await resolveRolePermissions(user);
    } catch (error) {
        console.error("Get user permissions error:", error);
        return null;
    }
}

/**
 * Middleware to check permission
 * @param module - Module name
 * @param subModule - Sub-module name (optional)
 * @param action - Action to check (optional)
 */
export function requirePermission(
    module: string,
    subModule?: string,
    action?: string
) {
    return async (req: any, res: any, next: any) => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: "Unauthorized",
                });
            }

            const hasPermission = await checkUserPermission(
                userId,
                module,
                subModule,
                action
            );

            if (!hasPermission) {
                return res.status(403).json({
                    success: false,
                    message: "You don't have permission to perform this action",
                });
            }

            next();
        } catch (error) {
            console.error("Permission middleware error:", error);
            res.status(500).json({
                success: false,
                message: "Permission check failed",
            });
        }
    };
}

export default {
    checkUserPermission,
    getUserPermissions,
    requirePermission,
};
