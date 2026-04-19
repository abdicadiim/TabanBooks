/**
 * Permission Utilities for Frontend
 * Check user permissions based on their role
 */

import { getCurrentUser } from "./auth";
import { apiRequest } from "./api";

export interface PermissionCheck {
    module: string;
    subModule?: string;
    action?: string;
}

function isPlainObject(value: any): boolean {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}

function checkModuleLevelPermission(modulePermissions: any, action?: string): boolean {
    if (!modulePermissions) return false;

    // Boolean module permission
    if (typeof modulePermissions === "boolean") {
        return modulePermissions;
    }

    if (!isPlainObject(modulePermissions)) return false;

    // Most permissive flags first
    if (modulePermissions.full === true || modulePermissions.fullAccess === true) {
        return true;
    }

    if (modulePermissions.enabled === false) {
        return false;
    }

    // Explicit module-level action flag
    if (action && typeof modulePermissions[action] === "boolean") {
        return modulePermissions[action] === true;
    }

    // For view checks, treat enabled modules as viewable
    if (!action || action === "view") {
        if (modulePermissions.enabled === true || modulePermissions.view === true) {
            return true;
        }
    }

    // Fallback: check nested permission objects recursively
    const hasNestedPermission = (obj: any, depth = 0): boolean => {
        if (!isPlainObject(obj) || depth > 5) return false;
        if (obj.full === true || obj.fullAccess === true) return true;
        if (action && obj[action] === true) return true;
        if ((!action || action === "view") && obj.view === true) return true;

        for (const value of Object.values(obj)) {
            if (hasNestedPermission(value, depth + 1)) return true;
        }
        return false;
    };

    if (hasNestedPermission(modulePermissions)) {
        return true;
    }

    return false;
}

// Cache for user permissions
let permissionsCache: any = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
let permissionsRequestPromise: Promise<any> | null = null;
type PermissionsStoreSnapshot = {
    permissions: any;
    loading: boolean;
    userId: string | null;
    privileged: boolean;
};
const permissionsListeners = new Set<() => void>();
let permissionsStoreSnapshot: PermissionsStoreSnapshot = {
    permissions: null,
    loading: false,
    userId: null,
    privileged: false,
};
let sessionUserRawCache: string | null | undefined;
let sessionUserMetaCache: {
    userId: string | null;
    privileged: boolean;
    permissions: any;
} = {
    userId: null,
    privileged: false,
    permissions: null,
};

function readSessionUserMeta(): {
    userId: string | null;
    privileged: boolean;
    permissions: any;
} {
    const rawUser = typeof window === "undefined" ? null : localStorage.getItem("user");

    if (rawUser === sessionUserRawCache) {
        return sessionUserMetaCache;
    }

    sessionUserRawCache = rawUser;

    if (!rawUser) {
        sessionUserMetaCache = {
            userId: null,
            privileged: false,
            permissions: null,
        };
        return sessionUserMetaCache;
    }

    try {
        const user = JSON.parse(rawUser);
        const role = String(user?.role || "");

        sessionUserMetaCache = {
            userId: user?.id ? String(user.id) : null,
            privileged: role === "owner" || role === "admin",
            permissions: user?.permissions || null,
        };
    } catch {
        sessionUserMetaCache = {
            userId: null,
            privileged: false,
            permissions: null,
        };
    }

    return sessionUserMetaCache;
}

function arePermissionsStoreSnapshotsEqual(
    current: PermissionsStoreSnapshot,
    next: PermissionsStoreSnapshot,
): boolean {
    return (
        current.permissions === next.permissions &&
        current.loading === next.loading &&
        current.userId === next.userId &&
        current.privileged === next.privileged
    );
}

function commitPermissionsStoreSnapshot(next: PermissionsStoreSnapshot): PermissionsStoreSnapshot {
    if (arePermissionsStoreSnapshotsEqual(permissionsStoreSnapshot, next)) {
        return permissionsStoreSnapshot;
    }

    permissionsStoreSnapshot = next;
    return permissionsStoreSnapshot;
}

function getSessionPermissions(): any {
    const sessionUserMeta = readSessionUserMeta();
    if (!sessionUserMeta.userId || sessionUserMeta.privileged) {
        return null;
    }
    return sessionUserMeta.permissions;
}

const emitPermissionsStoreChange = (): void => {
    permissionsListeners.forEach((listener) => listener());
};

const syncPermissionsStoreFromSessionAndNotify = (): PermissionsStoreSnapshot => {
    const previousSnapshot = permissionsStoreSnapshot;
    const nextSnapshot = syncPermissionsStoreFromSession();

    if (nextSnapshot !== previousSnapshot) {
        emitPermissionsStoreChange();
    }

    return nextSnapshot;
};

const setPermissionsStoreSnapshot = (partial: Partial<PermissionsStoreSnapshot>): void => {
    const nextSnapshot: PermissionsStoreSnapshot = {
        ...permissionsStoreSnapshot,
        ...partial,
    };
    const previousSnapshot = permissionsStoreSnapshot;
    const updatedSnapshot = commitPermissionsStoreSnapshot(nextSnapshot);

    if (updatedSnapshot !== previousSnapshot) {
        emitPermissionsStoreChange();
    }
};

const syncPermissionsStoreFromSession = (): PermissionsStoreSnapshot => {
    const { userId, privileged } = readSessionUserMeta();
    const availablePermissions = privileged ? null : getCachedPermissions();
    let nextSnapshot: PermissionsStoreSnapshot;

    if (!userId) {
        nextSnapshot = {
            permissions: null,
            loading: false,
            userId: null,
            privileged: false,
        };
        return commitPermissionsStoreSnapshot(nextSnapshot);
    }

    if (privileged) {
        nextSnapshot = {
            permissions: null,
            loading: false,
            userId,
            privileged: true,
        };
        return commitPermissionsStoreSnapshot(nextSnapshot);
    }

    nextSnapshot = {
        permissions: availablePermissions,
        loading: Boolean(!availablePermissions && permissionsRequestPromise),
        userId,
        privileged: false,
    };
    return commitPermissionsStoreSnapshot(nextSnapshot);
};

export function subscribePermissionsStore(listener: () => void): () => void {
    permissionsListeners.add(listener);
    return () => {
        permissionsListeners.delete(listener);
    };
}

export function getPermissionsStoreSnapshot(): PermissionsStoreSnapshot {
    return syncPermissionsStoreFromSession();
}

export function hasFreshPermissionsCache(): boolean {
    return Boolean(permissionsCache) && Date.now() - cacheTimestamp < CACHE_DURATION;
}

export function getCachedPermissions(): any {
    if (hasFreshPermissionsCache()) {
        return permissionsCache;
    }
    return getSessionPermissions();
}

export function primePermissionsCache(permissions: any): any {
    const user = getCurrentUser();
    const userId = user?.id ? String(user.id) : null;
    const privileged = user?.role === "owner" || user?.role === "admin";

    if (privileged || !userId) {
        clearPermissionsCache();
        return null;
    }

    permissionsCache = permissions || null;
    cacheTimestamp = permissions ? Date.now() : 0;
    permissionsRequestPromise = null;
    setPermissionsStoreSnapshot({
        permissions: permissionsCache,
        loading: false,
        userId,
        privileged: false,
    });
    return permissionsCache;
}

/**
 * Get current user's permissions from API
 */
export async function fetchUserPermissions(): Promise<any> {
    try {
        const user = getCurrentUser();
        const userId = user?.id ? String(user.id) : null;

        if (!userId) {
            clearPermissionsCache();
            syncPermissionsStoreFromSessionAndNotify();
            return null;
        }

        if (user.role === "owner" || user.role === "admin") {
            syncPermissionsStoreFromSessionAndNotify();
            return null;
        }

        const existingPermissions = getCachedPermissions();
        if (existingPermissions) {
            if (!hasFreshPermissionsCache()) {
                permissionsCache = existingPermissions;
                cacheTimestamp = Date.now();
            }
            syncPermissionsStoreFromSessionAndNotify();
            return existingPermissions;
        }

        if (permissionsRequestPromise) {
            setPermissionsStoreSnapshot({
                userId,
                privileged: false,
                loading: true,
            });
            return permissionsRequestPromise;
        }

        setPermissionsStoreSnapshot({
            userId,
            privileged: false,
            loading: true,
            permissions: permissionsCache,
        });

        permissionsRequestPromise = (async () => {
            const response = await apiRequest("/users/me/permissions");
            if (response.success && response.data) {
                primePermissionsCache(response.data);
                return getCachedPermissions();
            }
            setPermissionsStoreSnapshot({
                permissions: null,
                loading: false,
                userId,
                privileged: false,
            });
            return null;
        })();

        return await permissionsRequestPromise;
    } catch (error) {
        console.error("Failed to fetch user permissions:", error);
        syncPermissionsStoreFromSession();
        setPermissionsStoreSnapshot({
            loading: false,
        });
        return null;
    } finally {
        permissionsRequestPromise = null;
    }
}

/**
 * Clear permissions cache (call this on logout or role change)
 */
export function clearPermissionsCache(): void {
    permissionsCache = null;
    cacheTimestamp = 0;
    permissionsRequestPromise = null;
    syncPermissionsStoreFromSessionAndNotify();
}

export async function ensurePermissionsLoaded(): Promise<any> {
    const snapshot = getPermissionsStoreSnapshot();

    if (!snapshot.userId || snapshot.privileged || snapshot.permissions) {
        return snapshot.permissions;
    }

    return fetchUserPermissions();
}

/**
 * Check if current user has a specific permission
 * @param module - Module name (e.g., 'items', 'sales', 'purchases')
 * @param subModule - Sub-module name (e.g., 'invoices', 'bills')
 * @param action - Action to check (e.g., 'view', 'create', 'edit', 'delete')
 */
export async function hasPermission(
    module: string,
    subModule?: string,
    action?: string
): Promise<boolean> {
    const user = getCurrentUser();
    if (!user) return false;

    // Owner and Admin have all permissions
    if (user.role === "owner" || user.role === "admin") {
        return true;
    }

    // Get user permissions
    const permissions = await fetchUserPermissions();
    if (!permissions) return false;

    // Check full access
    if (permissions.fullAccess) return true;

    // Get module permissions
    const modulePermissions = permissions[module];
    if (!modulePermissions) return false;

    // If no subModule specified, check if module is enabled
    if (!subModule) {
        return checkModuleLevelPermission(modulePermissions, action);
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
}

/**
 * Check if user can view a module
 */
export async function canView(module: string, subModule?: string): Promise<boolean> {
    return hasPermission(module, subModule, "view");
}

/**
 * Check if user can create in a module
 */
export async function canCreate(module: string, subModule?: string): Promise<boolean> {
    return hasPermission(module, subModule, "create");
}

/**
 * Check if user can edit in a module
 */
export async function canEdit(module: string, subModule?: string): Promise<boolean> {
    return hasPermission(module, subModule, "edit");
}

/**
 * Check if user can delete in a module
 */
export async function canDelete(module: string, subModule?: string): Promise<boolean> {
    return hasPermission(module, subModule, "delete");
}

/**
 * Check if user can approve in a module
 */
export async function canApprove(module: string, subModule?: string): Promise<boolean> {
    return hasPermission(module, subModule, "approve");
}

/**
 * Get all permissions for current user
 */
export async function getAllPermissions(): Promise<any> {
    return fetchUserPermissions();
}

/**
 * Synchronous permission check (uses cached permissions)
 * Use this for UI rendering, but make sure to call fetchUserPermissions first
 */
export function hasPermissionSync(
    module: string,
    subModule?: string,
    action?: string
): boolean {
    const user = getCurrentUser();
    if (!user) return false;

    // Owner and Admin have all permissions
    if (user.role === "owner" || user.role === "admin") {
        return true;
    }

    const availablePermissions = getCachedPermissions();
    if (!availablePermissions) return false;

    // Check full access
    if (availablePermissions.fullAccess) return true;

    // Get module permissions
    const modulePermissions = availablePermissions[module];
    if (!modulePermissions) return false;

    // If no subModule specified, check if module is enabled
    if (!subModule) {
        return checkModuleLevelPermission(modulePermissions, action);
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
}

export default {
    hasPermission,
    hasPermissionSync,
    canView,
    canCreate,
    canEdit,
    canDelete,
    canApprove,
    getAllPermissions,
    fetchUserPermissions,
    ensurePermissionsLoaded,
    subscribePermissionsStore,
    getPermissionsStoreSnapshot,
    clearPermissionsCache,
    primePermissionsCache,
};

if (typeof window !== "undefined") {
    window.addEventListener("taban:session-changed", () => {
        clearPermissionsCache();
    });
    window.addEventListener("storage", () => {
        syncPermissionsStoreFromSessionAndNotify();
    });
}
