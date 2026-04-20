import React, { useEffect } from "react";
import { Toaster } from "react-hot-toast";
import { ToastContainer } from "react-toastify";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AppRoutes from "./routes/AppRoutes";
import { API_BASE_URL } from "./services/auth";
import type { Organization } from "./services/auth";
import { AppBootstrapProvider, useAppBootstrap } from "./context/AppBootstrapContext";
import { SettingsProvider } from "./lib/settings/SettingsContext";
import "react-toastify/dist/ReactToastify.css";

const DEFAULT_TITLE = "Taban Books";
const queryClient = new QueryClient();
const DEFAULT_FAVICON = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#156372"/><text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-family="Arial,sans-serif" font-size="26" font-weight="700" fill="#ffffff">TB</text></svg>'
)}`;

const resolveImageUrl = (value: string): string => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw) || raw.startsWith("data:") || raw.startsWith("blob:")) {
    return raw;
  }

  const normalizedPath = raw.startsWith("/") ? raw : `/${raw}`;
  if (!API_BASE_URL.startsWith("http")) {
    return normalizedPath;
  }

  try {
    const apiOrigin = new URL(API_BASE_URL).origin;
    return `${apiOrigin}${normalizedPath}`;
  } catch {
    return normalizedPath;
  }
};

const setFavicon = (href: string) => {
  let favicon = document.querySelector("link[rel='icon']") as HTMLLinkElement | null;
  if (!favicon) {
    favicon = document.createElement("link");
    favicon.rel = "icon";
    document.head.appendChild(favicon);
  }
  favicon.href = href || DEFAULT_FAVICON;
};

const applyOrganizationBranding = (organization?: Partial<Organization> | null) => {
  const orgName = String(organization?.name || organization?.legalName || "").trim();
  document.title = orgName || DEFAULT_TITLE;

  const logoUrl = resolveImageUrl(String(organization?.logo || ""));
  setFavicon(logoUrl || DEFAULT_FAVICON);
};

function AppBrandingSync() {
  const { organization } = useAppBootstrap();

  useEffect(() => {
    applyOrganizationBranding(organization as Partial<Organization> | null);
  }, [organization]);

  return null;
}

function AppContent() {
  return (
    <>
      <AppBrandingSync />
      <QueryClientProvider client={queryClient}>
        <SettingsProvider>
          <AppRoutes />
        </SettingsProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#fff',
              color: '#374151',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            },
            success: {
              iconTheme: {
                primary: '#059669',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#dc2626',
                secondary: '#fff',
              },
            },
          }}
        />
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />
      </QueryClientProvider>
    </>
  );
}

export default function App() {
  return (
    <AppBootstrapProvider>
      <AppContent />
    </AppBootstrapProvider>
  );
}
