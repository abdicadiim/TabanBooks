import React from "react";
import { Navigate, Outlet } from "react-router-dom";

/**
 * Protected Route Component
 * Redirects to login if user is not authenticated
 * Can be used as a wrapper component or as a route element
 */
export default function ProtectedRoute({ children }: { children?: React.ReactNode }) {
  const token = localStorage.getItem("auth_token");
  const isLocalAuthMode = localStorage.getItem("taban_auth_mode") === "local";

  if (!token) {
    // Redirect to login if no token
    return <Navigate to="/login" replace />;
  }

  if (!isLocalAuthMode) {
    let organizationVerified: boolean | undefined;

    try {
      const organizationRaw = localStorage.getItem("organization");
      if (organizationRaw) {
        const organization = JSON.parse(organizationRaw);
        if (typeof organization?.isVerified === "boolean") {
          organizationVerified = organization.isVerified;
        }
      }
    } catch {
      // Ignore parsing/storage issues and enforce verification redirect.
    }

    if (organizationVerified === true) {
      localStorage.setItem("account_verified", "true");
    } else if (organizationVerified === false) {
      localStorage.removeItem("account_verified");
    }

    const isAccountVerified =
      organizationVerified ?? localStorage.getItem("account_verified") === "true";

    if (!isAccountVerified) {
      return <Navigate to="/verify-identity" replace />;
    }
  }

  // If used as wrapper, render children
  if (children) {
    return children;
  }

  // If used as route element, render outlet
  return <Outlet />;
}

