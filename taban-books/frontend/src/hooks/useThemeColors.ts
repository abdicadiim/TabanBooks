import { useOrganizationBranding } from "./useOrganizationBranding";

export function useThemeColors() {
  const { accentColor } = useOrganizationBranding();
  const fallback = accentColor || "#0d4a52";

  return {
    buttonColor: fallback,
    sidebarColor: fallback,
  };
}
