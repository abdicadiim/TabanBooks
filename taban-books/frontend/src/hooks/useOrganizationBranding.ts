import { useAppBootstrap } from "../context/AppBootstrapContext";

export function useOrganizationBranding() {
    const { branding, loading } = useAppBootstrap();

    return {
        accentColor: "#475569",
        appearance: branding.appearance || "dark",
        isLoading: loading,
    };
}
