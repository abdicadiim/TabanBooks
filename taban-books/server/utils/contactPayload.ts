export type ContactEntityType = "customer" | "vendor";
export type ContactPayloadMode = "create" | "update";

const isRecord = (value: unknown): value is Record<string, any> => {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
};

const hasOwn = (value: Record<string, any>, key: string): boolean => {
  return Object.prototype.hasOwnProperty.call(value, key);
};

const toTrimmedString = (value: unknown): string | undefined => {
  if (value === null || value === undefined) return undefined;
  const text = String(value).trim();
  return text ? text : undefined;
};

const pickDefined = (...values: unknown[]): unknown => {
  for (const value of values) {
    if (value !== undefined && value !== null) {
      return value;
    }
  }

  return undefined;
};

const pickText = (...values: unknown[]): string | undefined => {
  for (const value of values) {
    const text = toTrimmedString(value);
    if (text) return text;
  }

  return undefined;
};

const normalizeBoolean = (value: unknown): boolean | undefined => {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return undefined;
    if (["true", "1", "yes", "y", "on"].includes(normalized)) return true;
    if (["false", "0", "no", "n", "off"].includes(normalized)) return false;
  }

  return undefined;
};

const normalizeStringNumber = (value: unknown): string | undefined => {
  if (value === undefined || value === null || value === "") return undefined;
  return String(value).trim();
};

const normalizeNumericValue = (value: unknown): number | undefined => {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(String(value).replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : undefined;
};

const hasAnyTextValue = (value: Record<string, any>): boolean => {
  return Object.values(value).some((entry) => {
    if (typeof entry === "boolean") return entry;
    return entry !== undefined && entry !== null && String(entry).trim() !== "";
  });
};

const cleanupUndefined = <T extends Record<string, any>>(value: T): T => {
  const entries = Object.entries(value).filter(([, entry]) => entry !== undefined);
  return Object.fromEntries(entries) as T;
};

const normalizeCurrencyCode = (value: unknown): string | undefined => {
  const text = toTrimmedString(value);
  if (!text) return undefined;

  const firstToken = text.split(" - ")[0]?.trim() || text;
  const compactToken = firstToken.split(" ")[0]?.trim() || firstToken;
  return compactToken.toUpperCase();
};

const deriveDisplayName = (payload: Record<string, any>): string | undefined => {
  const directName = pickText(
    payload.displayName,
    payload.display_name,
    payload.contact_name,
    payload.name
  );

  if (directName) return directName;

  const companyName = pickText(payload.companyName, payload.company_name);
  const firstName = pickText(payload.firstName, payload.first_name);
  const lastName = pickText(payload.lastName, payload.last_name);
  const combinedName = [firstName, lastName].filter(Boolean).join(" ").trim();

  return combinedName || companyName;
};

const shouldSetDerivedDisplayName = (
  payload: Record<string, any>,
  mode: ContactPayloadMode
): boolean => {
  if (mode === "create") return true;

  return [
    "displayName",
    "display_name",
    "contact_name",
    "name",
    "companyName",
    "company_name",
    "firstName",
    "first_name",
    "lastName",
    "last_name",
  ].some((key) => hasOwn(payload, key));
};

const normalizeAddress = (
  payload: Record<string, any>,
  prefix: "billing" | "shipping"
): Record<string, any> | undefined => {
  const nestedAddress = isRecord(payload[`${prefix}Address`])
    ? payload[`${prefix}Address`]
    : isRecord(payload[`${prefix}_address`])
      ? payload[`${prefix}_address`]
      : {};

  const normalizedAddress = cleanupUndefined({
    attention: pickText(payload[`${prefix}Attention`], nestedAddress.attention),
    country: pickText(payload[`${prefix}Country`], nestedAddress.country),
    street1: pickText(
      payload[`${prefix}Street1`],
      nestedAddress.street1,
      nestedAddress.address
    ),
    street2: pickText(payload[`${prefix}Street2`], nestedAddress.street2),
    city: pickText(payload[`${prefix}City`], nestedAddress.city),
    state: pickText(payload[`${prefix}State`], nestedAddress.state, nestedAddress.state_code),
    zipCode: pickText(payload[`${prefix}ZipCode`], nestedAddress.zipCode, nestedAddress.zip),
    phone: pickText(payload[`${prefix}Phone`], nestedAddress.phone),
    fax: pickText(payload[`${prefix}Fax`], nestedAddress.fax),
  });

  return hasAnyTextValue(normalizedAddress) ? normalizedAddress : undefined;
};

const normalizeContactPerson = (value: unknown): Record<string, any> | undefined => {
  if (!isRecord(value)) return undefined;

  const isPrimary = normalizeBoolean(
    pickDefined(value.isPrimary, value.is_primary_contact, value.isPrimaryContact)
  );
  const enablePortal = normalizeBoolean(
    pickDefined(value.enablePortal, value.enable_portal)
  );
  const hasPortalAccess = normalizeBoolean(
    pickDefined(value.hasPortalAccess, value.enablePortal, value.enable_portal)
  );

  const normalized = cleanupUndefined({
    _id: pickText(value._id, value.id, value.contact_person_id),
    salutation: pickText(value.salutation),
    firstName: pickText(value.firstName, value.first_name),
    lastName: pickText(value.lastName, value.last_name),
    email: pickText(value.email),
    workPhone: pickText(value.workPhone, value.phone),
    mobile: pickText(value.mobile),
    designation: pickText(value.designation),
    department: pickText(value.department),
    skypeName: pickText(value.skypeName, value.skype),
    ...(isPrimary !== undefined ? { isPrimary } : {}),
    ...(enablePortal !== undefined ? { enablePortal } : {}),
    ...(hasPortalAccess !== undefined ? { hasPortalAccess } : {}),
  });

  return hasAnyTextValue(normalized) ? normalized : undefined;
};

const normalizeContactPersons = (payload: Record<string, any>): Array<Record<string, any>> | undefined => {
  const rawValue = Array.isArray(payload.contactPersons)
    ? payload.contactPersons
    : Array.isArray(payload.contact_persons)
      ? payload.contact_persons
      : undefined;

  if (!rawValue) return undefined;

  const contactPersons = rawValue
    .map(normalizeContactPerson)
    .filter((entry): entry is Record<string, any> => Boolean(entry));

  return contactPersons;
};

const normalizeCustomFields = (payload: Record<string, any>): unknown => {
  if (hasOwn(payload, "customFields")) return payload.customFields;
  if (hasOwn(payload, "custom_fields")) return payload.custom_fields;
  return undefined;
};

const normalizeReportingTags = (payload: Record<string, any>): string[] | undefined => {
  if (Array.isArray(payload.reportingTags)) {
    const reportingTags = payload.reportingTags
      .map((entry) => toTrimmedString(entry))
      .filter((entry): entry is string => Boolean(entry));

    return reportingTags;
  }

  if (!Array.isArray(payload.tags)) {
    return undefined;
  }

  const reportingTags = payload.tags
    .map((entry: any) => {
      if (typeof entry === "string" || typeof entry === "number") {
        return String(entry).trim();
      }

      if (isRecord(entry)) {
        return (
          pickText(entry.tag_option_id, entry.tag_id, entry.id, entry.name) || ""
        );
      }

      return "";
    })
    .filter(Boolean);

  return reportingTags;
};

const normalizeStatus = (payload: Record<string, any>): "active" | "inactive" | undefined => {
  const rawStatus = pickText(payload.status, payload.filter_by);

  if (rawStatus) {
    const normalizedStatus = rawStatus.toLowerCase();
    if (normalizedStatus === "active" || normalizedStatus === "status.active") return "active";
    if (normalizedStatus === "inactive" || normalizedStatus === "status.inactive") return "inactive";
  }

  const isActive = normalizeBoolean(payload.isActive);
  if (isActive !== undefined) {
    return isActive ? "active" : "inactive";
  }

  return undefined;
};

const normalizeContactType = (payload: Record<string, any>): ContactEntityType | undefined => {
  const rawType = pickText(payload.contactType, payload.contact_type);
  if (!rawType) return undefined;
  const normalizedType = rawType.toLowerCase();
  if (normalizedType === "customer" || normalizedType === "vendor") {
    return normalizedType;
  }

  return undefined;
};

const normalizeBasePayload = (
  payload: Record<string, any>,
  mode: ContactPayloadMode
): Record<string, any> => {
  const displayName = shouldSetDerivedDisplayName(payload, mode)
    ? deriveDisplayName(payload)
    : undefined;

  const openingBalance = normalizeStringNumber(
    pickDefined(payload.openingBalance, payload.opening_balance_amount)
  );

  const normalized = cleanupUndefined({
    ...payload,
    ...(displayName ? { displayName, name: displayName } : {}),
    salutation: pickText(payload.salutation),
    firstName: pickText(payload.firstName, payload.first_name),
    lastName: pickText(payload.lastName, payload.last_name),
    companyName: pickText(payload.companyName, payload.company_name),
    email: pickText(payload.email),
    workPhone: pickText(payload.workPhone, payload.phone),
    mobile: pickText(payload.mobile),
    websiteUrl: pickText(payload.websiteUrl, payload.website),
    xHandle: pickText(payload.xHandle, payload.twitter, payload.x, payload.xSocial),
    skypeName: pickText(payload.skypeName, payload.skype),
    facebook: pickText(payload.facebook),
    companyId: pickText(payload.companyId, payload.company_id),
    locationCode: pickText(payload.locationCode, payload.location_code),
    currency: normalizeCurrencyCode(
      pickDefined(payload.currency, payload.currency_code)
    ),
    paymentTerms: normalizeStringNumber(
      pickDefined(payload.paymentTerms, payload.payment_terms)
    ),
    paymentTermsLabel: pickText(payload.paymentTermsLabel, payload.payment_terms_label),
    department: pickText(payload.department),
    designation: pickText(payload.designation),
    openingBalance,
    receivables: normalizeNumericValue(payload.receivables),
    payables: normalizeNumericValue(payload.payables),
    enablePortal: normalizeBoolean(
      pickDefined(payload.enablePortal, payload.is_portal_enabled)
    ),
    notes: pickText(payload.notes, payload.remarks),
    remarks: pickText(payload.remarks),
    contactNumber: pickText(payload.contactNumber, payload.contact_number),
    status: normalizeStatus(payload),
    billingAddress: normalizeAddress(payload, "billing"),
    shippingAddress: normalizeAddress(payload, "shipping"),
    contactPersons: normalizeContactPersons(payload),
    customFields: normalizeCustomFields(payload),
    reportingTags: normalizeReportingTags(payload),
  });

  return normalized;
};

export const normalizeCustomerPayload = (
  body: unknown,
  mode: ContactPayloadMode = "create"
): Record<string, any> => {
  const payload = isRecord(body) ? body : {};
  const contactType = normalizeContactType(payload);
  const companyName = pickText(payload.companyName, payload.company_name);
  const normalized = normalizeBasePayload(payload, mode);
  const rawCustomerType = pickText(
    payload.customerType,
    payload.customer_type,
    payload.customerSubType,
    payload.customer_sub_type
  );
  const shouldInferCustomerType =
    mode === "create" ||
    hasOwn(payload, "companyName") ||
    hasOwn(payload, "company_name") ||
    hasOwn(payload, "contact_type");

  return cleanupUndefined({
    ...normalized,
    customerType: rawCustomerType?.toLowerCase()
      || (shouldInferCustomerType
        ? (contactType === "customer" || companyName ? "business" : "individual")
        : undefined),
    customerLanguage: pickText(
      payload.customerLanguage,
      payload.languageCode,
      payload.language_code
    ),
    customerOwner: pickText(payload.customerOwner, payload.ownerId, payload.owner_id),
    customerNumber: pickText(
      payload.customerNumber,
      payload.contactNumber,
      payload.contact_number
    ),
    receivables:
      normalized.receivables ??
      normalizeNumericValue(
        pickDefined(payload.openingBalance, payload.opening_balance_amount)
      ),
  });
};

export const normalizeVendorPayload = (
  body: unknown,
  mode: ContactPayloadMode = "create"
): Record<string, any> => {
  const payload = isRecord(body) ? body : {};
  const companyName = pickText(payload.companyName, payload.company_name);
  const normalized = normalizeBasePayload(payload, mode);
  const rawVendorType = pickText(payload.vendorType, payload.vendor_type);
  const shouldInferVendorType =
    mode === "create" ||
    hasOwn(payload, "companyName") ||
    hasOwn(payload, "company_name");

  return cleanupUndefined({
    ...normalized,
    vendorType: rawVendorType?.toLowerCase()
      || (shouldInferVendorType ? (companyName ? "business" : "individual") : undefined),
    vendorLanguage: pickText(
      payload.vendorLanguage,
      payload.languageCode,
      payload.language_code
    ),
    vendorOwner: pickText(payload.vendorOwner, payload.ownerId, payload.owner_id),
    enableTDS: normalizeBoolean(
      pickDefined(payload.enableTDS, payload.is_tds_registered)
    ),
    payables:
      normalized.payables ??
      normalizeNumericValue(
        pickDefined(payload.openingBalance, payload.opening_balance_amount)
      ),
  });
};

export const normalizeUnifiedContactPayload = (
  body: unknown,
  mode: ContactPayloadMode = "create"
): Record<string, any> => {
  const payload = isRecord(body) ? body : {};
  const normalized = normalizeBasePayload(payload, mode);
  const contactType = normalizeContactType(payload) || (mode === "create" ? "customer" : undefined);

  return cleanupUndefined({
    ...normalized,
    contactType,
    customerSubType: pickText(
      payload.customerSubType,
      payload.customer_sub_type,
      payload.customerType,
      payload.customer_type,
      payload.vendorType,
      payload.vendor_type
    )?.toLowerCase(),
    languageCode: pickText(
      payload.languageCode,
      payload.language_code,
      payload.customerLanguage,
      payload.vendorLanguage
    ),
    ownerId: pickText(
      payload.ownerId,
      payload.owner_id,
      payload.customerOwner,
      payload.vendorOwner
    ),
    isTdsRegistered: normalizeBoolean(
      pickDefined(payload.isTdsRegistered, payload.is_tds_registered, payload.enableTDS)
    ),
  });
};

export const normalizeContactPersonPayload = (body: unknown): Record<string, any> => {
  const payload = isRecord(body) ? body : {};
  const normalizedContactPerson = normalizeContactPerson(payload) || {};

  return cleanupUndefined({
    ...payload,
    customerId: pickText(payload.customerId, payload.customer_id, payload.contactId, payload.contact_id),
    ...normalizedContactPerson,
  });
};

const mapAddressToApi = (value: unknown): Record<string, any> | undefined => {
  if (!isRecord(value)) return undefined;

  const address = cleanupUndefined({
    attention: pickText(value.attention),
    address: pickText(value.street1, value.address),
    street2: pickText(value.street2),
    city: pickText(value.city),
    state: pickText(value.state),
    state_code: pickText(value.state),
    zip: pickText(value.zipCode, value.zip),
    country: pickText(value.country),
    fax: pickText(value.fax),
    phone: pickText(value.phone),
  });

  return hasAnyTextValue(address) ? address : undefined;
};

const mapContactPersonToApi = (value: unknown): Record<string, any> | undefined => {
  if (!isRecord(value)) return undefined;

  const contactPerson = cleanupUndefined({
    contact_person_id: pickText(value._id, value.id, value.contact_person_id),
    salutation: pickText(value.salutation),
    first_name: pickText(value.firstName, value.first_name),
    last_name: pickText(value.lastName, value.last_name),
    email: pickText(value.email),
    phone: pickText(value.workPhone, value.phone),
    mobile: pickText(value.mobile),
    designation: pickText(value.designation),
    department: pickText(value.department),
    skype: pickText(value.skypeName, value.skype),
    is_primary_contact:
      normalizeBoolean(
        pickDefined(value.isPrimary, value.is_primary_contact, value.isPrimaryContact)
      ) ?? false,
    enable_portal:
      normalizeBoolean(
        pickDefined(value.enablePortal, value.enable_portal, value.hasPortalAccess)
      ) ?? false,
  });

  return hasAnyTextValue(contactPerson) ? contactPerson : undefined;
};

export const mapContactEntityToApi = (
  entity: Record<string, any>,
  contactType: ContactEntityType
): Record<string, any> => {
  const contactPersons = Array.isArray(entity.contactPersons)
    ? entity.contactPersons
        .map(mapContactPersonToApi)
        .filter((entry): entry is Record<string, any> => Boolean(entry))
    : [];

  return cleanupUndefined({
    id: pickText(entity._id, entity.id),
    contact_id: pickText(entity._id, entity.id),
    contact_name: pickText(entity.displayName, entity.name),
    company_name: pickText(entity.companyName),
    contact_type: contactType,
    customer_sub_type:
      pickText(entity.customerType, entity.vendorType) || undefined,
    contact_number: pickText(entity.contactNumber, entity.customerNumber),
    website: pickText(entity.websiteUrl),
    language_code: pickText(entity.customerLanguage, entity.vendorLanguage),
    email: pickText(entity.email),
    phone: pickText(entity.workPhone),
    mobile: pickText(entity.mobile),
    first_name: pickText(entity.firstName),
    last_name: pickText(entity.lastName),
    status: pickText(entity.status) || "active",
    payment_terms: entity.paymentTerms,
    payment_terms_label: pickText(entity.paymentTermsLabel),
    currency_code: normalizeCurrencyCode(entity.currency),
    notes: pickText(entity.notes),
    remarks: pickText(entity.remarks),
    facebook: pickText(entity.facebook),
    twitter: pickText(entity.xHandle),
    is_portal_enabled: Boolean(entity.enablePortal),
    owner_id: pickText(entity.customerOwner, entity.vendorOwner),
    billing_address: mapAddressToApi(entity.billingAddress),
    shipping_address: mapAddressToApi(entity.shippingAddress),
    contact_persons: contactPersons,
    custom_fields: entity.customFields,
    created_time: entity.createdAt,
    last_modified_time: entity.updatedAt,
  });
};
