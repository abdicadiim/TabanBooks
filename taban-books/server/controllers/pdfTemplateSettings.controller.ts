import { Request, Response } from "express";
import Organization from "../models/Organization.js";
import PDFTemplate from "../models/PDFTemplate.js";

type PdfTemplatePayload = {
  templates?: any[];
  exportNames?: Record<string, string>;
};

const asPlainObject = (value: any): Record<string, any> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  if (typeof value.toObject === "function") {
    return asPlainObject(value.toObject());
  }
  if (value instanceof Map) {
    return Object.fromEntries(value.entries());
  }
  return value;
};

const normalizeTemplates = (value: any): any[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => item && typeof item === "object");
};

const normalizeExportNames = (value: any): Record<string, string> => {
  const source = asPlainObject(value);
  return Object.entries(source).reduce((acc, [key, nestedValue]) => {
    if (typeof nestedValue === "string") {
      acc[key] = nestedValue;
    }
    return acc;
  }, {} as Record<string, string>);
};

export const getPdfTemplateSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const organizationId = (req as any).user?.organizationId;
    if (!organizationId) {
      res.status(401).json({ success: false, message: "Organization ID is required" });
      return;
    }

    // 1. Get templates from the new table
    let templates = await PDFTemplate.find({ organization: organizationId });

    // 2. Load organization settings for export names and potential migration
    const organization = await Organization.findById(organizationId).select("settings");
    if (!organization) {
      res.status(404).json({ success: false, message: "Organization not found" });
      return;
    }

    const settings: any = (organization as any).settings || {};
    
    // 3. Lazy Migration: If new table is empty but old settings have templates, migrate them
    if (templates.length === 0 && Array.isArray(settings.pdfTemplates) && settings.pdfTemplates.length > 0) {
      const migratedTemplates = settings.pdfTemplates.map((tpl: any) => ({
        organization: organizationId,
        id: tpl.id || `tpl-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        name: tpl.name || "Untitled Template",
        moduleType: tpl.moduleType || "quotes",
        language: tpl.language || "English",
        status: tpl.status || "active",
        isDefault: !!tpl.isDefault,
        family: tpl.family || "standard",
        preview: tpl.preview || "standard",
        config: tpl.config || {},
      }));
      
      await PDFTemplate.insertMany(migratedTemplates);
      templates = await PDFTemplate.find({ organization: organizationId });
      
      // Optionally clear the old templates to prevent re-migration
      organization.set('settings.pdfTemplates', []);
      await organization.save();
    }

    res.json({
      success: true,
      data: {
        templates: normalizeTemplates(templates),
        exportNames: normalizeExportNames(settings.pdfTemplateExportNames),
      },
    });
  } catch (error: any) {
    console.error("Error loading PDF templates:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to load PDF template settings" });
  }
};

export const updatePdfTemplateSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const organizationId = (req as any).user?.organizationId;
    if (!organizationId) {
      res.status(401).json({ success: false, message: "Organization ID is required" });
      return;
    }

    const payload = (req.body || {}) as PdfTemplatePayload;
    const nextTemplates = normalizeTemplates(payload.templates);
    const nextExportNames = normalizeExportNames(payload.exportNames);

    // 1. Update Organization Export Names
    const organization = await Organization.findById(organizationId);
    if (!organization) {
      res.status(404).json({ success: false, message: "Organization not found" });
      return;
    }
    if (!(organization as any).settings) (organization as any).settings = {};
    (organization as any).settings.pdfTemplateExportNames = nextExportNames;
    // Also ensure old field is cleared if still present
    (organization as any).settings.pdfTemplates = []; 
    await organization.save();

    // 2. Synchronize PDFTemplate collection
    await PDFTemplate.deleteMany({ organization: organizationId });
    
    if (nextTemplates.length > 0) {
      // Deduplicate by ID before inserting
      const uniqueTemplates = Array.from(new Map(nextTemplates.map(tpl => [tpl.id, tpl])).values());
      
      const docsToInsert = uniqueTemplates.map(tpl => ({
        organization: organizationId,
        id: tpl.id || `tpl-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        name: tpl.name,
        moduleType: tpl.moduleType,
        language: tpl.language,
        status: tpl.status,
        isDefault: !!tpl.isDefault,
        family: tpl.family,
        preview: tpl.preview,
        config: tpl.config,
      }));
      await PDFTemplate.insertMany(docsToInsert);
    }

    // Return the fresh state
    const savedTemplates = await PDFTemplate.find({ organization: organizationId });

    res.json({
      success: true,
      data: {
        templates: normalizeTemplates(savedTemplates),
        exportNames: nextExportNames,
      },
    });
  } catch (error: any) {
    console.error("Error saving PDF templates:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to save PDF template settings" });
  }
};
