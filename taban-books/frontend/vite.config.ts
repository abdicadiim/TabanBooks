import { defineConfig, ProxyOptions } from "vite";
import react from "@vitejs/plugin-react";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { HttpProxy } from "vite";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  // Load environment variables
  const rawApiBaseUrl = process.env.VITE_API_BASE_URL || "http://127.0.0.1:5001";
  // Normalize localhost to IPv4 loopback to avoid intermittent Node DNS localhost resolution issues in proxy.
  const apiBaseUrl = rawApiBaseUrl.replace("http://localhost:", "http://127.0.0.1:");
  const frontendUrl = process.env.VITE_FRONTEND_URL || "http://localhost:5175";
  const port = parseInt(process.env.VITE_PORT || "5175", 10);
  const isProduction = mode === "production";
  const isProxyDebugEnabled = process.env.VITE_PROXY_DEBUG === "true";
  const sanitizeChunkName = (value: string) =>
    value.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "-").toLowerCase();

  const config = {
    resolve: {
      alias: {
        "@tanstack/react-query": resolve(__dirname, "src/react-query.tsx"),
      },
    },
    plugins: [react()],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            const normalizedId = id.replace(/\\/g, "/");

            if (normalizedId.includes("node_modules")) {
              if (
                normalizedId.includes("/react/") ||
                normalizedId.includes("/react-dom/")
              ) {
                return "react-vendor";
              }

              if (
                normalizedId.includes("/react-router/") ||
                normalizedId.includes("/react-router-dom/") ||
                normalizedId.includes("/@remix-run/")
              ) {
                return "router-vendor";
              }

              if (normalizedId.includes("/lucide-react/")) {
                return "icons";
              }

              if (
                normalizedId.includes("/xlsx/") ||
                normalizedId.includes("/cfb/") ||
                normalizedId.includes("/codepage/") ||
                normalizedId.includes("/ssf/")
              ) {
                return "spreadsheet";
              }

              if (
                normalizedId.includes("/jspdf/")
              ) {
                return "pdf-core";
              }

              if (
                normalizedId.includes("/html2canvas/") ||
                normalizedId.includes("/canvg/") ||
                normalizedId.includes("/rgbcolor/") ||
                normalizedId.includes("/stackblur-canvas/") ||
                normalizedId.includes("/svg-pathdata/")
              ) {
                return "pdf-capture";
              }

              return "vendor";
            }

            const nestedFeatureMatch = normalizedId.match(
              /\/src\/features\/(sales\/customers|settings\/organization-settings)\/([^/]+)/i,
            );
            if (nestedFeatureMatch) {
              const [, featurePath, nestedSegment] = nestedFeatureMatch;
              return `feature-${featurePath.replace(/\//g, "-")}-${sanitizeChunkName(nestedSegment)}`;
            }

            const largeFeatureMatch = normalizedId.match(
              /\/src\/features\/(sales|purchases|settings|accountant|timeTracking)\/([^/]+)/,
            );
            if (largeFeatureMatch) {
              const [, featureName, subFeatureName] = largeFeatureMatch;
              return `feature-${featureName}-${sanitizeChunkName(subFeatureName)}`;
            }

            const bankingMoneyInOverlayMatch = normalizedId.match(
              /\/src\/features\/banking\/accountDetail\/moneyInOverlays\/([^/]+)/,
            );
            if (bankingMoneyInOverlayMatch) {
              const [, segment] = bankingMoneyInOverlayMatch;
              return `feature-banking-accountdetail-moneyin-${sanitizeChunkName(segment)}`;
            }

            const bankingMoneyOutOverlayMatch = normalizedId.match(
              /\/src\/features\/banking\/accountDetail\/moneyOutOverlays\/([^/]+)/,
            );
            if (bankingMoneyOutOverlayMatch) {
              const [, segment] = bankingMoneyOutOverlayMatch;
              return `feature-banking-accountdetail-moneyout-${sanitizeChunkName(segment)}`;
            }

            const featureMatch = normalizedId.match(/\/src\/features\/([^/]+)\//);
            if (featureMatch) {
              return `feature-${featureMatch[1]}`;
            }

            if (normalizedId.includes("/src/pages/")) {
              return "app-pages";
            }

            return undefined;
          },
        },
      },
    },
    server: {
      port: port,
      host: true,
      open: false,
      proxy: {
        "/api": {
          target: apiBaseUrl,
          changeOrigin: true,
          secure: false,
          ws: true,
          timeout: 30000,
          proxyTimeout: 30000,
          // Retry on connection errors
          configure: (proxy: HttpProxy.Server, _options: ProxyOptions) => {
            proxy.on('error', (err: Error, req: IncomingMessage, res: ServerResponse) => {
              console.error('[Vite Proxy] Proxy error:', err.message);
              console.error('[Vite Proxy] Request:', req.url);
            });

            if (isProxyDebugEnabled) {
              proxy.on('proxyReq', (_proxyReq: any, req: IncomingMessage, _res: ServerResponse) => {
                console.log('[Vite Proxy] Proxying:', req.method, req.url);
              });
              console.log('[Vite Proxy] Proxy middleware configured');
              console.log('[Vite Proxy] Target:', apiBaseUrl);
            }
          },
        }
      }
    },
  };

  if (isProxyDebugEnabled) {
    console.log('[Vite Config] Proxy target:', apiBaseUrl);
    console.log('[Vite Config] Frontend URL:', frontendUrl);
    console.log('[Vite Config] Frontend port:', port);
    console.log('[Vite Config] Mode:', mode);
  }

  return config;
});
