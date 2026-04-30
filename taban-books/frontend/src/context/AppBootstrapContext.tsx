import React, { createContext, useContext, useEffect, useState } from "react";
import {
  type BootstrapCacheSnapshot,
  getCurrentUser,
  getOrganization,
  getSessionBootstrap,
  getToken,
  persistSessionBootstrapCache,
  readSessionBootstrapCache,
  setOrganization as persistOrganization,
} from "../services/auth";
import { primePermissionsCache } from "../services/permissions";
import { primeSWRCache } from "../sync/primeSWRCache";

export interface BootstrapBranding {
  appearance: string;
  accentColor: string;
  sidebarDarkFrom: string;
  sidebarDarkTo: string;
  sidebarLightFrom: string;
  sidebarLightTo: string;
  keepZohoBranding?: boolean;
  logo?: string;
}

export interface BootstrapGeneralSettings {
  currency?: string;
  fiscalYearStart?: string;
  settings?: any;
  subscription?: any;
}

export interface BootstrapBaseCurrency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  isBase: boolean;
}

interface AppBootstrapContextValue {
  authenticated: boolean;
  currentUser: any;
  organization: any;
  branding: BootstrapBranding;
  generalSettings: BootstrapGeneralSettings | null;
  baseCurrency: BootstrapBaseCurrency | null;
  enabledModules: Record<string, boolean>;
  loading: boolean;
  refreshBootstrap: (reason?: string) => Promise<void>;
  resetBootstrap: () => void;
}

const DEFAULT_BRANDING: BootstrapBranding = {
  appearance: "dark",
  accentColor: "#ffffff",
  sidebarDarkFrom: "#0f4e5a",
  sidebarDarkTo: "#156372",
  sidebarLightFrom: "#f9fafb",
  sidebarLightTo: "#f3f4f6",
  keepZohoBranding: false,
  logo: "",
};

const DEFAULT_MODULES: Record<string, boolean> = {
  quotes: true,
  salesOrders: false,
  salesReceipts: true,
  purchaseOrders: false,
  timeTracking: true,
  retainerInvoices: false,
  recurringInvoice: true,
  recurringExpense: true,
  recurringBills: true,
  recurringJournals: false,
  creditNote: true,
  paymentLinks: false,
  tasks: false,
  fixedAsset: false,
};

const asBoolean = (value: any): boolean =>
  value === true || value === "true" || value === 1 || value === "1";

const toModuleEntries = (modules: any): Array<[string, boolean]> => {
  if (modules instanceof Map) {
    return Array.from(modules.entries()).map(([key, moduleValue]) => [String(key), asBoolean(moduleValue)]);
  }

  if (Array.isArray(modules)) {
    return modules.map(([key, moduleValue]) => [String(key), asBoolean(moduleValue)] as [string, boolean]);
  }

  if (modules && typeof modules === "object") {
    return Object.entries(modules).map(([key, moduleValue]) => [key, asBoolean(moduleValue)] as [string, boolean]);
  }

  return [];
};

const normalizeModules = (modules: any): Record<string, boolean> => ({
  ...DEFAULT_MODULES,
  ...Object.fromEntries(toModuleEntries(modules)),
});

const readStoredBaseCurrency = (): BootstrapBaseCurrency | null => {
  const code = String(localStorage.getItem("base_currency_code") || "").trim();
  const symbol = String(localStorage.getItem("base_currency_symbol") || "").trim();

  if (!code && !symbol) return null;

  return {
    id: "",
    code: code || "USD",
    name: code || "USD",
    symbol: symbol || code || "$",
    isBase: true,
  };
};

const persistBaseCurrency = (currency: BootstrapBaseCurrency | null) => {
  if (!currency) {
    localStorage.removeItem("base_currency_code");
    localStorage.removeItem("base_currency_symbol");
    return;
  }

  localStorage.setItem("base_currency_code", currency.code || "");
  localStorage.setItem("base_currency_symbol", currency.symbol || "");
};

const AppBootstrapContext = createContext<AppBootstrapContextValue | null>(null);

const normalizeBootstrapCache = (snapshot: BootstrapCacheSnapshot | null) =>
  snapshot
    ? {
        ...snapshot,
        branding: {
          ...DEFAULT_BRANDING,
          ...(snapshot.branding || {}),
        },
      }
    : null;

const isTransientBootstrapNetworkError = (error: unknown) => {
  const message = String((error as any)?.message || error || "").toLowerCase();
  return (
    message.includes("failed to fetch") ||
    message.includes("networkerror") ||
    message.includes("err_network_changed") ||
    message.includes("network changed")
  );
};

export function AppBootstrapProvider({ children }: { children: React.ReactNode }) {
  const [initialBootstrapSnapshot] = useState<BootstrapCacheSnapshot | null>(() =>
    normalizeBootstrapCache(readSessionBootstrapCache()),
  );
  const [authenticated, setAuthenticated] = useState(Boolean(getToken()));
  const [currentUser, setCurrentUser] = useState<any>(() => getCurrentUser());
  const [organization, setOrganization] = useState<any>(() => getOrganization());
  const [branding, setBranding] = useState<BootstrapBranding>(() => initialBootstrapSnapshot?.branding || DEFAULT_BRANDING);
  const [generalSettings, setGeneralSettings] = useState<BootstrapGeneralSettings | null>(
    () => initialBootstrapSnapshot?.generalSettings || null,
  );
  const [baseCurrency, setBaseCurrency] = useState<BootstrapBaseCurrency | null>(
    () => initialBootstrapSnapshot?.baseCurrency || readStoredBaseCurrency(),
  );
  const [loading, setLoading] = useState(Boolean(getToken()) && !initialBootstrapSnapshot);
  const BOOTSTRAP_LOADER_MIN_DURATION_MS = 700;
  const shouldSkipBootstrapLoader = () => {
    if (typeof window === "undefined") return false;
    return window.sessionStorage.getItem("taban:skip-bootstrap-loader") === "1";
  };
  const clearSkipBootstrapLoader = () => {
    if (typeof window === "undefined") return;
    window.sessionStorage.removeItem("taban:skip-bootstrap-loader");
  };

  const updateBootstrapCache = (
    nextBranding: BootstrapBranding,
    nextGeneralSettings: BootstrapGeneralSettings | null,
    nextBaseCurrency: BootstrapBaseCurrency | null,
  ) => {
    const currentSnapshot = readSessionBootstrapCache();
    persistSessionBootstrapCache({
      branding: nextBranding,
      generalSettings: nextGeneralSettings,
      baseCurrency: nextBaseCurrency,
      version_id: currentSnapshot?.version_id,
      last_updated: currentSnapshot?.last_updated,
    });
  };

  const resetBootstrap = () => {
    setAuthenticated(false);
    setCurrentUser(null);
    setOrganization(null);
    setBranding(DEFAULT_BRANDING);
    setGeneralSettings(null);
    setBaseCurrency(null);
    setLoading(false);
    persistBaseCurrency(null);
    persistSessionBootstrapCache(null);
    primePermissionsCache(null);
  };

  const refreshBootstrap = async (reason = "manual") => {
    const token = getToken();

    if (!token) {
      resetBootstrap();
      return;
    }

    setAuthenticated(true);

    const storedUser = getCurrentUser();
    const storedOrganization = getOrganization();

    // Show icon loader during startup/refresh flow.
    const showBlockingLoader = (reason === "initial" || reason === "session") && !shouldSkipBootstrapLoader();
    if (showBlockingLoader) {
      setLoading(true);
    }

    const minimumLoaderDelay = showBlockingLoader
      ? new Promise<void>((resolve) => window.setTimeout(resolve, BOOTSTRAP_LOADER_MIN_DURATION_MS))
      : Promise.resolve();
    const primeCachePromise = showBlockingLoader ? primeSWRCache() : Promise.resolve();

    if (storedUser) {
      setCurrentUser(storedUser);
      primePermissionsCache(storedUser.permissions || null);
    }

    if (storedOrganization) {
      setOrganization(storedOrganization);
    }

    try {
      const bootstrap = await getSessionBootstrap(`bootstrap:${reason}`);
      if (!bootstrap) return;

      const nextUser = bootstrap.user || getCurrentUser();
      const nextOrganization = bootstrap.organization || getOrganization();
      const nextBranding = {
        ...DEFAULT_BRANDING,
        ...(bootstrap.branding || {}),
      };
      const nextGeneralSettings = bootstrap.generalSettings || null;
      const nextBaseCurrency = bootstrap.baseCurrency
        ? {
            id: String(bootstrap.baseCurrency.id || ""),
            code: String(bootstrap.baseCurrency.code || "USD"),
            name: String(bootstrap.baseCurrency.name || bootstrap.baseCurrency.code || "USD"),
            symbol: String(bootstrap.baseCurrency.symbol || "$"),
            isBase: true,
          }
        : null;

      setCurrentUser(nextUser);
      setOrganization(nextOrganization);
      setBranding(nextBranding);
      setGeneralSettings(nextGeneralSettings);
      setBaseCurrency(nextBaseCurrency);
      persistBaseCurrency(nextBaseCurrency);
      primePermissionsCache(nextUser?.permissions || null);

      if (nextOrganization && nextBranding.logo !== undefined) {
        persistOrganization({
          ...nextOrganization,
          logo: nextBranding.logo || "",
        });
        setOrganization(getOrganization());
      }

      persistSessionBootstrapCache({
        branding: nextBranding,
        generalSettings: nextGeneralSettings,
        baseCurrency: nextBaseCurrency,
        version_id: bootstrap.version_id,
        last_updated: bootstrap.last_updated,
      });
    } catch (error) {
      if (isTransientBootstrapNetworkError(error)) {
        console.warn("Transient bootstrap network error:", error);
      } else {
        console.error("Error refreshing bootstrap data:", error);
      }
    } finally {
      clearSkipBootstrapLoader();
      if (showBlockingLoader) {
        await Promise.allSettled([primeCachePromise, minimumLoaderDelay]);
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    void refreshBootstrap("initial");
  }, []);

  useEffect(() => {
    const handleSessionChanged = () => {
      if (!getToken()) {
        resetBootstrap();
        return;
      }

      void refreshBootstrap("session");
    };

    const handleStorage = () => {
      if (!getToken()) {
        resetBootstrap();
        return;
      }

      const nextSnapshot = normalizeBootstrapCache(readSessionBootstrapCache());

      setAuthenticated(true);
      setCurrentUser(getCurrentUser());
      setOrganization(getOrganization());
      setBranding(nextSnapshot?.branding || DEFAULT_BRANDING);
      setGeneralSettings(nextSnapshot?.generalSettings || null);
      setBaseCurrency(nextSnapshot?.baseCurrency || readStoredBaseCurrency());
      primePermissionsCache(getCurrentUser()?.permissions || null);
    };

    const handleBrandingUpdated = (event: Event) => {
      const detail = (event as CustomEvent<any>).detail || {};

      setBranding((current) => {
        const cachedSnapshot = normalizeBootstrapCache(readSessionBootstrapCache());
        const nextBranding = {
          ...current,
          ...detail,
        };
        updateBootstrapCache(
          nextBranding,
          cachedSnapshot?.generalSettings || null,
          cachedSnapshot?.baseCurrency || readStoredBaseCurrency(),
        );
        return nextBranding;
      });

      if (detail.logo !== undefined) {
        const currentOrganization = getOrganization();
        if (currentOrganization) {
          persistOrganization({
            ...currentOrganization,
            logo: detail.logo || "",
          });
          setOrganization(getOrganization());
        }
      }
    };

    const handleGeneralSettingsUpdated = (event: Event) => {
      const detail = (event as CustomEvent<any>).detail || null;
      if (!detail) return;

      const nextSettings = {
        ...detail,
        modules: normalizeModules(detail.modules),
      };

      setGeneralSettings((current) => {
        const cachedSnapshot = normalizeBootstrapCache(readSessionBootstrapCache());
        const nextGeneralSettings = {
          ...(current || {}),
          settings: nextSettings,
        };
        updateBootstrapCache(
          cachedSnapshot?.branding || branding,
          nextGeneralSettings,
          cachedSnapshot?.baseCurrency || readStoredBaseCurrency(),
        );
        return nextGeneralSettings;
      });
    };

    window.addEventListener("taban:session-changed", handleSessionChanged);
    window.addEventListener("storage", handleStorage);
    window.addEventListener("brandingUpdated", handleBrandingUpdated as EventListener);
    window.addEventListener("generalSettingsUpdated", handleGeneralSettingsUpdated as EventListener);

    return () => {
      window.removeEventListener("taban:session-changed", handleSessionChanged);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("brandingUpdated", handleBrandingUpdated as EventListener);
      window.removeEventListener("generalSettingsUpdated", handleGeneralSettingsUpdated as EventListener);
    };
  }, []);

  const enabledModules = {
    ...normalizeModules(generalSettings?.settings?.modules),
    inventory: generalSettings?.settings?.enableInventory !== false,
  };

  return (
    <AppBootstrapContext.Provider
      value={{
        authenticated,
        currentUser,
        organization,
        branding,
        generalSettings,
        baseCurrency,
        enabledModules,
        loading,
        refreshBootstrap,
        resetBootstrap,
      }}
    >
      {children}
    </AppBootstrapContext.Provider>
  );
}

export function useAppBootstrap(): AppBootstrapContextValue {
  const context = useContext(AppBootstrapContext);

  if (!context) {
    throw new Error("useAppBootstrap must be used within an AppBootstrapProvider");
  }

  return context;
}
