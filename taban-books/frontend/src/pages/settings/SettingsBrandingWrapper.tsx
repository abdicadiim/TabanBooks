import React from "react";
import SettingsLayout from "./SettingsLayout";
import BrandingPage from "./organization-settings/organization/branding/BrandingPage";

export default function SettingsBrandingWrapper() {
  return (
    <SettingsLayout>
      <BrandingPage />
    </SettingsLayout>
  );
}

