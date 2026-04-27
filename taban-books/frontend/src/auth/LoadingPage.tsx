import React, { startTransition, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getSessionBootstrap, readSessionBootstrapCache } from "../services/auth";
import { dashboardService } from "../services/dashboardService";
import FullScreenLoader from "../components/FullScreenLoader";

export default function LoadingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const isNewUser = location.state?.isNewUser || false;
  const MINIMUM_LOADING_MS = 2500;
  const [title, setTitle] = useState(isNewUser ? "Welcome to Taban!" : "Welcome back!");
  const [subtitle, setSubtitle] = useState(
    isNewUser ? "Setting up your workspace..." : "Preparing your dashboard...",
  );

  useEffect(() => {
    let cancelled = false;

    const token = localStorage.getItem("auth_token");
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    const organizationRaw = localStorage.getItem("organization");
    const localVerifiedFlag = localStorage.getItem("account_verified") === "true";
    let organizationVerified: boolean | undefined;

    try {
      if (organizationRaw) {
        const organization = JSON.parse(organizationRaw);
        if (typeof organization?.isVerified === "boolean") {
          organizationVerified = organization.isVerified;
        }
      }
    } catch {
      organizationVerified = undefined;
    }

    const isVerified = organizationVerified ?? localVerifiedFlag;
    if (!isVerified) {
      navigate("/verify-identity", { replace: true });
      return;
    }

    const hasWarmBootstrap = Boolean(readSessionBootstrapCache());
    const hasWarmDashboard = Boolean(dashboardService.getCachedHomeBootstrap()?.data);
    const hasWarmState = hasWarmBootstrap || hasWarmDashboard;

    setTitle(isNewUser ? "Welcome to Taban!" : hasWarmState ? "Restoring your workspace" : "Welcome back!");
    setSubtitle(
      isNewUser
        ? "Caching your workspace essentials..."
        : hasWarmState
          ? "Loading your saved dashboard first, then validating live updates..."
          : "Fetching your latest workspace snapshot...",
    );

    void dashboardService.primeHomeHydration();

    const runHydration = async () => {
      try {
        const bootstrapPromise = Promise.race([
          getSessionBootstrap("loading:hydration"),
          new Promise<null>((resolve) => window.setTimeout(() => resolve(null), MINIMUM_LOADING_MS)),
        ]);

        setSubtitle(
          hasWarmState
            ? "Checking for changes and syncing anything new in the background..."
            : "Preparing your first live dashboard snapshot...",
        );

        await Promise.allSettled([
          bootstrapPromise,
          new Promise<void>((resolve) => window.setTimeout(resolve, MINIMUM_LOADING_MS)),
        ]);
      } finally {
        if (cancelled) return;

        setSubtitle("Opening the app while background sync keeps running...");
        window.setTimeout(() => {
          if (cancelled) return;
          startTransition(() => {
            navigate("/", { replace: true });
          });
        }, 150);
      }
    };

    void runHydration();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return <FullScreenLoader title={title} subtitle={subtitle} />;
}


