import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function TemplateEditorPage() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/settings/customization/pdf-templates", { replace: true });
  }, [navigate]);

  return null;
}
