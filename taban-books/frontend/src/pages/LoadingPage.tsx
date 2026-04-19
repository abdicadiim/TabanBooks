import React, { startTransition, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { CheckCircle, Loader2, Sparkles } from "lucide-react";
import { getSessionBootstrap, readSessionBootstrapCache } from "../services/auth";
import { dashboardService } from "../services/dashboardService";

export default function LoadingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const isNewUser = location.state?.isNewUser || false;
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
      const minimumDelay = hasWarmState ? 900 : 1400;

      try {
        const bootstrapPromise = Promise.race([
          getSessionBootstrap("loading:hydration"),
          new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 2500)),
        ]);

        setSubtitle(
          hasWarmState
            ? "Checking for changes and syncing anything new in the background..."
            : "Preparing your first live dashboard snapshot...",
        );

        await Promise.allSettled([
          bootstrapPromise,
          new Promise<void>((resolve) => window.setTimeout(resolve, minimumDelay)),
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

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Beautiful Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        {/* Animated Background Pattern */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 left-0 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
          <div className="absolute top-0 right-0 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-indigo-200 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
        </div>
      </div>

      <div className="relative z-10 text-center">
        {/* Logo */}
        <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl mb-8 shadow-xl animate-pulse">
          <div className="text-white text-3xl font-bold">TB</div>
        </div>

        {/* Dynamic Icon */}
        <div className="mb-0 flex justify-center h-24">
          <div className="relative">
            <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping opacity-25"></div>
            {isNewUser ? (
              <div className="relative z-10 bg-white p-4 rounded-full shadow-lg border-4 border-blue-500/10 animate-scale-in">
                <Sparkles size={48} className="text-orange-400 animate-pulse" />
              </div>
            ) : (
              <div className="relative z-10 bg-white p-4 rounded-full shadow-lg border-4 border-green-500/10 animate-scale-in">
                <CheckCircle size={48} className="text-green-500" />
              </div>
            )}
          </div>
        </div>

        {/* Loading Text */}
        <div className="mt-8 space-y-2">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight animate-fade-in">{title}</h2>
          <p className="text-slate-500 font-medium text-lg animate-fade-in-delay">
            {subtitle}
          </p>
        </div>

        {/* Loading Spinner */}
        <div className="mt-12 flex justify-center">
          <Loader2
            size={32}
            className="text-blue-600 animate-spin opacity-40"
          />
        </div>
      </div>

      {/* Add CSS for animations */}
      <style>{`
        @keyframes blob {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }
        @keyframes scale-in {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          50% {
            transform: scale(1.2);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        @keyframes fade-in {
          0% {
            opacity: 0;
            transform: translateY(-10px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animate-scale-in {
          animation: scale-in 0.6s ease-out;
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }
        .animate-fade-in-delay {
          animation: fade-in 0.8s ease-out 0.2s both;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}


