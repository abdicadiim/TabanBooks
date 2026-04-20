import { useOrganizationBranding } from "./useOrganizationBranding";

export function useThemeColors() {
  useOrganizationBranding();
  const fallback = "#475569";

  return {
    buttonColor: fallback,
    sidebarColor: fallback,
  };
}
