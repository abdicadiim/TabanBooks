import React, { createContext, useContext, useEffect, useState } from "react";
import { AUTH_USER_UPDATED_EVENT, getCurrentUser, getOrganization } from "../../services/auth";

type SettingsShape = {
  general?: {
    companyDisplayName?: string;
    schoolDisplayName?: string;
    organizationEmail?: string;
  };
};

const SettingsContext = createContext<{ settings: SettingsShape }>({
  settings: {},
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SettingsShape>(() => {
    const organization = getOrganization();
    const currentUser = getCurrentUser();
    const companyDisplayName =
      String(organization?.name || currentUser?.organizationName || organization?.legalName || "").trim();

    return {
      general: {
        companyDisplayName,
        schoolDisplayName: companyDisplayName,
        organizationEmail: String(organization?.email || "").trim(),
      },
    };
  });

  useEffect(() => {
    const syncSettings = () => {
      const organization = getOrganization();
      const currentUser = getCurrentUser();
      const companyDisplayName =
        String(organization?.name || currentUser?.organizationName || organization?.legalName || "").trim();

      setSettings({
        general: {
          companyDisplayName,
          schoolDisplayName: companyDisplayName,
          organizationEmail: String(organization?.email || "").trim(),
        },
      });
    };

    syncSettings();
    window.addEventListener(AUTH_USER_UPDATED_EVENT, syncSettings);
    window.addEventListener("organizationProfileUpdated", syncSettings);

    return () => {
      window.removeEventListener(AUTH_USER_UPDATED_EVENT, syncSettings);
      window.removeEventListener("organizationProfileUpdated", syncSettings);
    };
  }, []);

  return <SettingsContext.Provider value={{ settings }}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  return useContext(SettingsContext);
}
