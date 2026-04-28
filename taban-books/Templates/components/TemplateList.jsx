import React from "react";
import TemplatePreview from "./TemplatePreview";
import NewTemplateSection from "./NewTemplateSection";

const TemplateList = ({ templates, templateType, onNewTemplate, onTemplateClick }) => {
  return (
    <div className="flex gap-6">
      {/* Template Preview Section */}
      <TemplatePreview
        template={templates.find((t) => t.isDefault) || templates[0]}
        templateType={templateType}
      />

      {/* New Template Section */}
      <NewTemplateSection onNewTemplate={onNewTemplate} />
    </div>
  );
};

export default TemplateList;

