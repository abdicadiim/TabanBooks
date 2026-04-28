import { TEMPLATE_TYPES } from "./constants";

// Utility function to get template type label
export const getTemplateTypeLabel = (type) => {
  const templateType = TEMPLATE_TYPES.find((t) => t.id === type);
  return templateType ? templateType.label : type;
};

// Utility function to format template name
export const formatTemplateName = (name) => {
  return name || "Untitled Template";
};

// Utility function to check if template is default
export const isDefaultTemplate = (template) => {
  return template?.isDefault === true;
};

