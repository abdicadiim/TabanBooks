import { Response } from "express";
import mongoose from "mongoose";
import Customer from "../models/Customer.js";
import Vendor from "../models/Vendor.js";
import type { AuthRequest } from "../middleware/auth.middleware.js";
import {
  mapContactEntityToApi,
  type ContactEntityType,
} from "../utils/contactPayload.js";

const buildOrganizationFilter = (organizationId: string): any => {
  const normalizedOrgId = String(organizationId || "").trim();
  if (!normalizedOrgId) return {};

  if (mongoose.Types.ObjectId.isValid(normalizedOrgId)) {
    return {
      $or: [
        { organization: new mongoose.Types.ObjectId(normalizedOrgId) },
        { organization: normalizedOrgId },
      ],
    };
  }

  return { organization: normalizedOrgId };
};

const escapeRegex = (value: string): string => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const removeUndefined = <T extends Record<string, any>>(value: T): T => {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined)
  ) as T;
};

const toTrimmedString = (value: unknown): string | undefined => {
  if (value === undefined || value === null) return undefined;
  const text = String(value).trim();
  return text ? text : undefined;
};

const toNumericValue = (value: unknown): number | undefined => {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(String(value).replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : undefined;
};

const getRegexFromQuery = (query: Record<string, any>, key: string): RegExp | undefined => {
  const contains = toTrimmedString(query[`${key}_contains`]);
  if (contains) return new RegExp(escapeRegex(contains), "i");

  const startsWith = toTrimmedString(query[`${key}_startswith`]);
  if (startsWith) return new RegExp(`^${escapeRegex(startsWith)}`, "i");

  const exact = toTrimmedString(query[key]);
  if (exact) return new RegExp(`^${escapeRegex(exact)}$`, "i");

  return undefined;
};

const getContainsRegex = (value: unknown): RegExp | undefined => {
  const text = toTrimmedString(value);
  return text ? new RegExp(escapeRegex(text), "i") : undefined;
};

const normalizeFilterStatus = (value: unknown): "active" | "inactive" | undefined => {
  const text = toTrimmedString(value)?.toLowerCase();
  if (!text) return undefined;
  if (text === "active" || text === "status.active") return "active";
  if (text === "inactive" || text === "status.inactive") return "inactive";
  return undefined;
};

const getSortMeta = (value: unknown): { responseKey: string; modelField: string } => {
  const normalized = toTrimmedString(value)?.toLowerCase() || "last_modified_time";

  switch (normalized) {
    case "contact_name":
      return { responseKey: "contact_name", modelField: "displayName" };
    case "first_name":
      return { responseKey: "first_name", modelField: "firstName" };
    case "last_name":
      return { responseKey: "last_name", modelField: "lastName" };
    case "email":
      return { responseKey: "email", modelField: "email" };
    case "created_time":
      return { responseKey: "created_time", modelField: "createdAt" };
    case "outstanding_receivable_amount":
      return { responseKey: "outstanding_receivable_amount", modelField: "receivables" };
    default:
      return { responseKey: "last_modified_time", modelField: "updatedAt" };
  }
};

const getSortOrder = (value: unknown): "asc" | "desc" => {
  const normalized = toTrimmedString(value)?.toLowerCase();
  return normalized === "asc" || normalized === "a" ? "asc" : "desc";
};

const buildContactsModelQuery = (
  organizationId: string,
  queryInput: Record<string, any>,
  contactType: ContactEntityType
): Record<string, any> => {
  const andConditions: any[] = [buildOrganizationFilter(organizationId)];

  const contactNameRegex = getRegexFromQuery(queryInput, "contact_name");
  if (contactNameRegex) {
    andConditions.push({
      $or: [
        { displayName: contactNameRegex },
        { name: contactNameRegex },
      ],
    });
  }

  const companyNameRegex = getRegexFromQuery(queryInput, "company_name");
  if (companyNameRegex) {
    andConditions.push({ companyName: companyNameRegex });
  }

  const firstNameRegex = getRegexFromQuery(queryInput, "first_name");
  if (firstNameRegex) {
    andConditions.push({ firstName: firstNameRegex });
  }

  const lastNameRegex = getRegexFromQuery(queryInput, "last_name");
  if (lastNameRegex) {
    andConditions.push({ lastName: lastNameRegex });
  }

  const emailRegex = getRegexFromQuery(queryInput, "email");
  if (emailRegex) {
    andConditions.push({
      $or: [
        { email: emailRegex },
        { "contactPersons.email": emailRegex },
      ],
    });
  }

  const phoneRegex = getRegexFromQuery(queryInput, "phone");
  if (phoneRegex) {
    andConditions.push({
      $or: [
        { workPhone: phoneRegex },
        { mobile: phoneRegex },
        { "billingAddress.phone": phoneRegex },
        { "shippingAddress.phone": phoneRegex },
        { "contactPersons.workPhone": phoneRegex },
        { "contactPersons.mobile": phoneRegex },
      ],
    });
  }

  const addressRegex = getRegexFromQuery(queryInput, "address");
  if (addressRegex) {
    andConditions.push({
      $or: [
        { "billingAddress.street1": addressRegex },
        { "billingAddress.street2": addressRegex },
        { "billingAddress.city": addressRegex },
        { "billingAddress.state": addressRegex },
        { "billingAddress.country": addressRegex },
        { "shippingAddress.street1": addressRegex },
        { "shippingAddress.street2": addressRegex },
        { "shippingAddress.city": addressRegex },
        { "shippingAddress.state": addressRegex },
        { "shippingAddress.country": addressRegex },
      ],
    });
  }

  const searchRegex = getContainsRegex(queryInput.search_text || queryInput.search);
  if (searchRegex) {
    andConditions.push({
      $or: [
        { displayName: searchRegex },
        { name: searchRegex },
        { companyName: searchRegex },
        { email: searchRegex },
        { notes: searchRegex },
        { remarks: searchRegex },
      ],
    });
  }

  const status = normalizeFilterStatus(queryInput.filter_by || queryInput.status);
  if (status) {
    andConditions.push({ status });
  }

  if (contactType === "customer") {
    const customerSubType = toTrimmedString(
      queryInput.customer_sub_type || queryInput.customerType
    )?.toLowerCase();
    if (customerSubType === "business" || customerSubType === "individual") {
      andConditions.push({ customerType: customerSubType });
    }
  }

  return andConditions.length === 1 ? andConditions[0] : { $and: andConditions };
};

const findContactEntity = async (
  contactId: string,
  organizationId: string,
  preferredType?: ContactEntityType
): Promise<{ entity: any; contactType: ContactEntityType } | null> => {
  const organizationFilter = buildOrganizationFilter(organizationId);
  const normalizedId = String(contactId || "").trim();
  const queries = preferredType
    ? [preferredType]
    : (["customer", "vendor"] as ContactEntityType[]);

  for (const contactType of queries) {
    let entity = null;

    if (mongoose.Types.ObjectId.isValid(normalizedId)) {
      entity =
        contactType === "customer"
          ? await Customer.findOne({ _id: normalizedId, ...organizationFilter })
          : await Vendor.findOne({ _id: normalizedId, ...organizationFilter });
    }

    if (!entity) {
      entity =
        contactType === "customer"
          ? await Customer.findOne({ id: normalizedId, ...organizationFilter })
          : await Vendor.findOne({ id: normalizedId, ...organizationFilter });
    }

    if (entity) {
      return { entity, contactType };
    }
  }

  return null;
};

const buildCustomerDocument = (body: Record<string, any>): Record<string, any> => {
  const openingBalance = toTrimmedString(body.openingBalance);

  return removeUndefined({
    displayName: body.displayName,
    name: body.name || body.displayName,
    customerType: body.customerSubType || body.customerType,
    salutation: body.salutation,
    firstName: body.firstName,
    lastName: body.lastName,
    companyName: body.companyName,
    email: body.email,
    workPhone: body.workPhone,
    mobile: body.mobile,
    websiteUrl: body.websiteUrl,
    xHandle: body.xHandle,
    skypeName: body.skypeName,
    facebook: body.facebook,
    contactNumber: body.contactNumber,
    customerNumber: body.contactNumber || body.customerNumber,
    customerLanguage: body.languageCode || body.customerLanguage,
    companyId: body.companyId,
    locationCode: body.locationCode,
    currency: body.currency,
    paymentTerms: body.paymentTerms,
    paymentTermsLabel: body.paymentTermsLabel,
    department: body.department,
    designation: body.designation,
    openingBalance,
    receivables: body.receivables ?? toNumericValue(openingBalance),
    enablePortal: body.enablePortal,
    customerOwner: body.ownerId || body.customerOwner,
    billingAddress: body.billingAddress,
    shippingAddress: body.shippingAddress,
    contactPersons: body.contactPersons,
    customFields: body.customFields,
    reportingTags: body.reportingTags,
    documents: body.documents,
    remarks: body.remarks,
    notes: body.notes,
    status: body.status,
    portalStatus: body.portalStatus,
    reviewRequested: body.reviewRequested,
    reviewRequestedAt: body.reviewRequestedAt,
    source: body.source,
    linkedVendorId: body.linkedVendorId,
    linkedVendorName: body.linkedVendorName,
  });
};

const buildVendorDocument = (body: Record<string, any>): Record<string, any> => {
  const openingBalance = toTrimmedString(body.openingBalance);

  return removeUndefined({
    displayName: body.displayName,
    name: body.name || body.displayName,
    vendorType: body.customerSubType || body.vendorType,
    salutation: body.salutation,
    firstName: body.firstName,
    lastName: body.lastName,
    companyName: body.companyName,
    email: body.email,
    workPhone: body.workPhone,
    mobile: body.mobile,
    websiteUrl: body.websiteUrl,
    xHandle: body.xHandle,
    skypeName: body.skypeName,
    facebook: body.facebook,
    contactNumber: body.contactNumber,
    vendorLanguage: body.languageCode || body.vendorLanguage,
    enableTDS: body.isTdsRegistered ?? body.enableTDS,
    companyId: body.companyId,
    locationCode: body.locationCode,
    currency: body.currency,
    paymentTerms: body.paymentTerms,
    paymentTermsLabel: body.paymentTermsLabel,
    department: body.department,
    designation: body.designation,
    openingBalance,
    payables: body.payables ?? toNumericValue(openingBalance),
    enablePortal: body.enablePortal,
    vendorOwner: body.ownerId || body.vendorOwner,
    billingAddress: body.billingAddress,
    shippingAddress: body.shippingAddress,
    contactPersons: body.contactPersons,
    customFields: body.customFields,
    reportingTags: body.reportingTags,
    documents: body.documents,
    remarks: body.remarks,
    notes: body.notes,
    status: body.status,
    portalStatus: body.portalStatus,
    source: body.source,
    linkedCustomerId: body.linkedCustomerId,
    linkedCustomerName: body.linkedCustomerName,
  });
};

const toSortableValue = (value: any): number | string => {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const timestamp = Date.parse(value);
    if (!Number.isNaN(timestamp)) return timestamp;
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return numeric;
    return value.toLowerCase();
  }

  return "";
};

export const listContacts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ code: 1, message: "Unauthorized" });
      return;
    }

    const contactType = toTrimmedString(req.query.contact_type)?.toLowerCase() as ContactEntityType | undefined;
    const page = Math.max(1, Number.parseInt(String(req.query.page || "1"), 10) || 1);
    const perPage = Math.min(
      200,
      Math.max(1, Number.parseInt(String(req.query.per_page || "10"), 10) || 10)
    );
    const sortMeta = getSortMeta(req.query.sort_column);
    const sortOrder = getSortOrder(req.query.sort_order);
    const queryInput = req.query as Record<string, any>;

    const modelsToQuery: ContactEntityType[] =
      contactType === "customer" || contactType === "vendor"
        ? [contactType]
        : ["customer", "vendor"];

    const contacts = [];

    for (const modelType of modelsToQuery) {
      const records =
        modelType === "customer"
          ? await Customer.find(
              buildContactsModelQuery(String(req.user.organizationId), queryInput, modelType)
            )
              .sort({ [sortMeta.modelField]: sortOrder === "asc" ? 1 : -1 })
              .lean()
          : await Vendor.find(
              buildContactsModelQuery(String(req.user.organizationId), queryInput, modelType)
            )
              .sort({ [sortMeta.modelField]: sortOrder === "asc" ? 1 : -1 })
              .lean();

      contacts.push(
        ...records.map((record: any) => mapContactEntityToApi(record, modelType))
      );
    }

    contacts.sort((left, right) => {
      const leftValue = toSortableValue(left[sortMeta.responseKey]);
      const rightValue = toSortableValue(right[sortMeta.responseKey]);

      if (leftValue < rightValue) return sortOrder === "asc" ? -1 : 1;
      if (leftValue > rightValue) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    const startIndex = (page - 1) * perPage;
    const paginatedContacts = contacts.slice(startIndex, startIndex + perPage);

    res.json({
      code: 0,
      message: "success",
      contacts: paginatedContacts,
      page_context: {
        page,
        per_page: perPage,
        has_more_page: startIndex + perPage < contacts.length,
        sort_column: sortMeta.responseKey,
        sort_order: sortOrder === "asc" ? "A" : "D",
      },
    });
  } catch (error: any) {
    console.error("[CONTACTS] Error listing contacts:", error);
    res.status(500).json({ code: 1, message: error.message || "Error listing contacts" });
  }
};

export const createContact = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ code: 1, message: "Unauthorized" });
      return;
    }

    const contactType = (req.body.contactType || "customer") as ContactEntityType;
    const document =
      contactType === "customer"
        ? buildCustomerDocument(req.body)
        : buildVendorDocument(req.body);

    const created =
      contactType === "customer"
        ? await Customer.create({
            ...document,
            organization: req.user.organizationId,
            createdBy: req.user.userId,
          })
        : await Vendor.create({
            ...document,
            organization: req.user.organizationId,
            createdBy: req.user.userId,
          });

    res.status(201).json({
      code: 0,
      message: "Contact created successfully.",
      contact: mapContactEntityToApi(created.toObject(), contactType),
    });
  } catch (error: any) {
    console.error("[CONTACTS] Error creating contact:", error);
    res.status(400).json({ code: 1, message: error.message || "Error creating contact" });
  }
};

export const getContact = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ code: 1, message: "Unauthorized" });
      return;
    }

    const preferredType = toTrimmedString(req.query.contact_type)?.toLowerCase() as ContactEntityType | undefined;
    const found = await findContactEntity(
      req.params.contact_id,
      String(req.user.organizationId),
      preferredType
    );

    if (!found) {
      res.status(404).json({ code: 1, message: "Contact not found" });
      return;
    }

    res.json({
      code: 0,
      message: "success",
      contact: mapContactEntityToApi(found.entity.toObject(), found.contactType),
    });
  } catch (error: any) {
    console.error("[CONTACTS] Error fetching contact:", error);
    res.status(500).json({ code: 1, message: error.message || "Error fetching contact" });
  }
};

export const updateContact = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ code: 1, message: "Unauthorized" });
      return;
    }

    const preferredType = toTrimmedString(req.body.contactType)?.toLowerCase() as ContactEntityType | undefined;
    const found = await findContactEntity(
      req.params.contact_id,
      String(req.user.organizationId),
      preferredType
    );

    if (!found) {
      res.status(404).json({ code: 1, message: "Contact not found" });
      return;
    }

    const nextData =
      found.contactType === "customer"
        ? buildCustomerDocument(req.body)
        : buildVendorDocument(req.body);

    if (nextData.billingAddress && typeof nextData.billingAddress === "object") {
      nextData.billingAddress = {
        ...(found.entity.billingAddress?.toObject?.() || found.entity.billingAddress || {}),
        ...nextData.billingAddress,
      };
    }

    if (nextData.shippingAddress && typeof nextData.shippingAddress === "object") {
      nextData.shippingAddress = {
        ...(found.entity.shippingAddress?.toObject?.() || found.entity.shippingAddress || {}),
        ...nextData.shippingAddress,
      };
    }

    Object.assign(found.entity, nextData, { updatedBy: req.user.userId });
    await found.entity.save();

    res.json({
      code: 0,
      message: "Contact updated successfully.",
      contact: mapContactEntityToApi(found.entity.toObject(), found.contactType),
    });
  } catch (error: any) {
    console.error("[CONTACTS] Error updating contact:", error);
    res.status(400).json({ code: 1, message: error.message || "Error updating contact" });
  }
};

export const deleteContact = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ code: 1, message: "Unauthorized" });
      return;
    }

    const found = await findContactEntity(
      req.params.contact_id,
      String(req.user.organizationId)
    );

    if (!found) {
      res.status(404).json({ code: 1, message: "Contact not found" });
      return;
    }

    await found.entity.deleteOne();

    res.json({
      code: 0,
      message: "The contact has been deleted.",
    });
  } catch (error: any) {
    console.error("[CONTACTS] Error deleting contact:", error);
    res.status(500).json({ code: 1, message: error.message || "Error deleting contact" });
  }
};

const updateContactStatus = async (
  req: AuthRequest,
  res: Response,
  status: "active" | "inactive"
): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ code: 1, message: "Unauthorized" });
      return;
    }

    const found = await findContactEntity(
      req.params.contact_id,
      String(req.user.organizationId)
    );

    if (!found) {
      res.status(404).json({ code: 1, message: "Contact not found" });
      return;
    }

    found.entity.status = status;
    found.entity.updatedBy = req.user.userId;
    await found.entity.save();

    res.json({
      code: 0,
      message:
        status === "active"
          ? "The contact has been marked as active."
          : "The contact has been marked as inactive.",
    });
  } catch (error: any) {
    console.error("[CONTACTS] Error updating contact status:", error);
    res.status(500).json({ code: 1, message: error.message || "Error updating contact status" });
  }
};

export const markContactActive = async (req: AuthRequest, res: Response): Promise<void> => {
  await updateContactStatus(req, res, "active");
};

export const markContactInactive = async (req: AuthRequest, res: Response): Promise<void> => {
  await updateContactStatus(req, res, "inactive");
};
