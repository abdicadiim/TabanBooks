/**
 * usePermissions Hook
 * React hook for checking user permissions
 */

import { useEffect, useSyncExternalStore } from "react";
import {
    hasPermissionSync,
    ensurePermissionsLoaded,
    getPermissionsStoreSnapshot,
    subscribePermissionsStore,
} from "../services/permissions";
import { getCurrentUser } from "../services/auth";

export interface UsePermissionsResult {
    hasPermission: (module: string, subModule?: string, action?: string) => boolean;
    canView: (module: string, subModule?: string) => boolean;
    canCreate: (module: string, subModule?: string) => boolean;
    canEdit: (module: string, subModule?: string) => boolean;
    canDelete: (module: string, subModule?: string) => boolean;
    canApprove: (module: string, subModule?: string) => boolean;
    permissions: any;
    loading: boolean;
    isOwner: boolean;
    isAdmin: boolean;
}

/**
 * Hook to check user permissions
 */
export function usePermissions(): UsePermissionsResult {
    const user = getCurrentUser();
    const snapshot = useSyncExternalStore(
        subscribePermissionsStore,
        getPermissionsStoreSnapshot,
        getPermissionsStoreSnapshot,
    );
    const permissions = snapshot.permissions;
    const loading = snapshot.loading;

    useEffect(() => {
        void ensurePermissionsLoaded();
    }, [user?.id]);

    const hasPermission = (
        module: string,
        subModule?: string,
        action?: string
    ): boolean => {
        return hasPermissionSync(module, subModule, action);
    };

    const canView = (module: string, subModule?: string): boolean => {
        return hasPermissionSync(module, subModule, "view");
    };

    const canCreate = (module: string, subModule?: string): boolean => {
        return hasPermissionSync(module, subModule, "create");
    };

    const canEdit = (module: string, subModule?: string): boolean => {
        return hasPermissionSync(module, subModule, "edit");
    };

    const canDelete = (module: string, subModule?: string): boolean => {
        return hasPermissionSync(module, subModule, "delete");
    };

    const canApprove = (module: string, subModule?: string): boolean => {
        return hasPermissionSync(module, subModule, "approve");
    };

    return {
        hasPermission,
        canView,
        canCreate,
        canEdit,
        canDelete,
        canApprove,
        permissions,
        loading,
        isOwner: user?.role === "owner",
        isAdmin: user?.role === "admin" || user?.role === "owner",
    };
}

/**
 * Hook to check a specific permission
 */
export function useHasPermission(
    module: string,
    subModule?: string,
    action?: string
): { hasPermission: boolean; loading: boolean } {
    const { hasPermission, loading } = usePermissions();

    return {
        hasPermission: hasPermission(module, subModule, action),
        loading,
    };
}

export default usePermissions;
