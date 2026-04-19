import { useAppBootstrap } from "../context/AppBootstrapContext";

export function useOrganizationBranding() {
    const { branding, loading } = useAppBootstrap();

    return {
        accentColor: branding.accentColor || "#3b82f6",
        appearance: branding.appearance || "dark",
        isLoading: loading,
    };
}
