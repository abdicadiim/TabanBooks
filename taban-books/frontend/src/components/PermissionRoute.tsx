import React from "react";
import { Outlet } from "react-router-dom";
import { usePermissions } from "../hooks/usePermissions";
import AccessDenied from "./AccessDenied";

interface PermissionRequirement {
  module: string;
  subModule?: string;
  action?: string;
}

interface PermissionRouteProps {
  anyOf: PermissionRequirement[];
  children?: React.ReactNode;
  deniedTitle?: string;
  deniedMessage?: string;
}

export default function PermissionRoute({
  anyOf,
  children,
  deniedTitle,
  deniedMessage,
}: PermissionRouteProps) {
  const { hasPermission, loading } = usePermissions();

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-sm text-gray-500">
        Loading permissions...
      </div>
    );
  }

  const allowed = anyOf.some((req) =>
    hasPermission(req.module, req.subModule, req.action || "view")
  );

  if (!allowed) {
    return <AccessDenied title={deniedTitle} message={deniedMessage} />;
  }

  return <>{children || <Outlet />}</>;
}
