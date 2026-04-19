/**
 * PermissionGuard Component
 * Conditionally renders children based on user permissions
 */

import React from "react";
import { usePermissions } from "../hooks/usePermissions";

interface PermissionGuardProps {
    module: string;
    subModule?: string;
    action?: string;
    children: React.ReactNode;
    fallback?: React.ReactNode;
    hideIfNoPermission?: boolean; // If true, hide completely. If false, show fallback
}

/**
 * Component that conditionally renders based on permissions
 * 
 * Usage:
 * <PermissionGuard module="items" subModule="item" action="create">
 *   <button>Create Item</button>
 * </PermissionGuard>
 */
export function PermissionGuard({
    module,
    subModule,
    action,
    children,
    fallback = null,
    hideIfNoPermission = true,
}: PermissionGuardProps) {
    const { hasPermission, loading } = usePermissions();

    // While loading, don't render anything
    if (loading) {
        return null;
    }

    const permitted = hasPermission(module, subModule, action);

    if (permitted) {
        return <>{children}</>;
    }

    // If no permission
    if (hideIfNoPermission) {
        return null;
    }

    return <>{fallback}</>;
}

/**
 * Component that shows disabled state if no permission
 */
interface PermissionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    module: string;
    subModule?: string;
    action?: string;
    children: React.ReactNode;
    disabledMessage?: string;
}

export function PermissionButton({
    module,
    subModule,
    action,
    children,
    disabledMessage = "You don't have permission to perform this action",
    ...buttonProps
}: PermissionButtonProps) {
    const { hasPermission, loading } = usePermissions();

    const permitted = hasPermission(module, subModule, action);

    return (
        <button
            {...buttonProps}
            disabled={loading || !permitted || buttonProps.disabled}
            title={!permitted ? disabledMessage : buttonProps.title}
            style={{
                ...buttonProps.style,
                cursor: !permitted ? "not-allowed" : buttonProps.style?.cursor,
                opacity: !permitted ? 0.5 : buttonProps.style?.opacity,
            }}
        >
            {children}
        </button>
    );
}

/**
 * HOC to wrap a component with permission check
 */
export function withPermission<P extends object>(
    Component: React.ComponentType<P>,
    module: string,
    subModule?: string,
    action?: string,
    fallback?: React.ReactNode
) {
    return function PermissionWrappedComponent(props: P) {
        return (
            <PermissionGuard
                module={module}
                subModule={subModule}
                action={action}
                fallback={fallback}
            >
                <Component {...props} />
            </PermissionGuard>
        );
    };
}

export default PermissionGuard;
