import Joi from "joi";

const textField = (max: number) => Joi.string().trim().max(max).allow("", null);
const phoneField = Joi.string().trim().max(50).allow("", null);
const emailField = Joi.string().trim().email({ tlds: { allow: false } }).max(254).allow("", null);
const flexibleNumberField = Joi.alternatives().try(
  Joi.number(),
  Joi.string().trim().allow("", null)
);

const addressSchema = Joi.object({
  attention: textField(100),
  country: textField(100),
  street1: textField(500),
  street2: textField(255),
  city: textField(100),
  state: textField(100),
  zipCode: textField(100),
  phone: phoneField,
  fax: phoneField,
}).unknown(true);

const contactPersonSchema = Joi.object({
  _id: Joi.string().trim().allow("", null),
  salutation: textField(50),
  firstName: textField(100),
  lastName: textField(100),
  email: emailField,
  workPhone: phoneField,
  mobile: phoneField,
  designation: textField(100),
  department: textField(100),
  skypeName: textField(100),
  isPrimary: Joi.boolean(),
  enablePortal: Joi.boolean(),
  hasPortalAccess: Joi.boolean(),
})
  .custom((value, helpers) => {
    const hasContactContent = [
      value.firstName,
      value.lastName,
      value.email,
      value.workPhone,
      value.mobile,
      value.designation,
      value.department,
      value.skypeName,
      value.salutation,
      value._id,
    ].some((entry) => entry !== undefined && entry !== null && String(entry).trim() !== "");

    if (hasContactContent && !String(value.firstName || "").trim()) {
      return helpers.error("any.invalid");
    }

    return value;
  })
  .messages({
    "any.invalid": "Contact person firstName is required when contact details are provided.",
  })
  .unknown(true);

const documentSchema = Joi.object({
  documentId: Joi.string().trim().allow("", null),
  id: Joi.alternatives().try(Joi.string().trim(), Joi.number()).allow("", null),
  name: textField(255),
  size: Joi.alternatives().try(Joi.string().trim(), Joi.number()).allow("", null),
  type: textField(100),
  url: Joi.string().trim().max(5000).allow("", null),
  uploadedAt: Joi.alternatives().try(Joi.date(), Joi.string().trim()).allow("", null),
}).unknown(true);

const customFieldsSchema = Joi.alternatives().try(
  Joi.object().unknown(true),
  Joi.array().items(
    Joi.object({
      index: Joi.number().integer().min(1).max(10),
      label: textField(100),
      value: Joi.alternatives().try(Joi.string().trim(), Joi.number(), Joi.boolean(), Joi.object().unknown(true), Joi.array()),
    }).unknown(true)
  )
);

const sharedContactSchema = {
  displayName: textField(200),
  name: textField(200),
  salutation: textField(50),
  firstName: textField(100),
  lastName: textField(100),
  companyName: textField(200),
  email: emailField,
  workPhone: phoneField,
  mobile: phoneField,
  websiteUrl: Joi.string().trim().max(500).allow("", null),
  xHandle: textField(100),
  skypeName: textField(100),
  facebook: textField(100),
  companyId: textField(200),
  locationCode: textField(100),
  currency: textField(10),
  paymentTerms: flexibleNumberField,
  paymentTermsLabel: textField(200),
  department: textField(100),
  designation: textField(100),
  openingBalance: flexibleNumberField,
  receivables: Joi.number(),
  payables: Joi.number(),
  enablePortal: Joi.boolean(),
  notes: Joi.string().trim().max(5000).allow("", null),
  remarks: Joi.string().trim().max(5000).allow("", null),
  contactNumber: textField(200),
  status: Joi.string().trim().valid("active", "inactive"),
  billingAddress: addressSchema,
  shippingAddress: addressSchema,
  contactPersons: Joi.array().items(contactPersonSchema),
  customFields: customFieldsSchema,
  reportingTags: Joi.array().items(Joi.string().trim().max(200)),
  documents: Joi.array().items(documentSchema),
  portalStatus: Joi.string().trim().valid("enabled", "disabled", "invited"),
  reviewRequested: Joi.boolean(),
  reviewRequestedAt: Joi.alternatives().try(Joi.date(), Joi.string().trim()).allow("", null),
  linkedVendorId: Joi.string().trim().allow("", null),
  linkedVendorName: textField(200),
  linkedCustomerId: Joi.string().trim().allow("", null),
  linkedCustomerName: textField(200),
  source: textField(200),
};

export const customerCreateSchema = Joi.object({
  ...sharedContactSchema,
  displayName: textField(200).required(),
  customerType: Joi.string().trim().valid("business", "individual"),
  customerLanguage: textField(10),
  customerOwner: textField(200),
  customerNumber: textField(200),
  accountsReceivable: textField(200),
}).unknown(true);

export const customerUpdateSchema = Joi.object({
  ...sharedContactSchema,
  customerType: Joi.string().trim().valid("business", "individual"),
  customerLanguage: textField(10),
  customerOwner: textField(200),
  customerNumber: textField(200),
  accountsReceivable: textField(200),
}).unknown(true);

export const vendorCreateSchema = Joi.object({
  ...sharedContactSchema,
  displayName: textField(200).required(),
  vendorType: Joi.string().trim().valid("business", "individual"),
  vendorLanguage: textField(10),
  vendorOwner: textField(200),
  accountsPayable: textField(200),
  enableTDS: Joi.boolean(),
}).unknown(true);

export const vendorUpdateSchema = Joi.object({
  ...sharedContactSchema,
  vendorType: Joi.string().trim().valid("business", "individual"),
  vendorLanguage: textField(10),
  vendorOwner: textField(200),
  accountsPayable: textField(200),
  enableTDS: Joi.boolean(),
}).unknown(true);

export const unifiedContactCreateSchema = Joi.object({
  ...sharedContactSchema,
  displayName: textField(200).required(),
  contactType: Joi.string().trim().valid("customer", "vendor").default("customer"),
  customerSubType: Joi.string().trim().valid("business", "individual"),
  languageCode: textField(10),
  ownerId: textField(200),
  isTdsRegistered: Joi.boolean(),
}).unknown(true);

export const unifiedContactUpdateSchema = Joi.object({
  ...sharedContactSchema,
  contactType: Joi.string().trim().valid("customer", "vendor"),
  customerSubType: Joi.string().trim().valid("business", "individual"),
  languageCode: textField(10),
  ownerId: textField(200),
  isTdsRegistered: Joi.boolean(),
}).unknown(true);

export const contactPersonCreateSchema = Joi.object({
  customerId: Joi.string().trim().required(),
  salutation: textField(50),
  firstName: textField(100).required(),
  lastName: textField(100),
  email: emailField,
  workPhone: phoneField,
  mobile: phoneField,
  designation: textField(100),
  department: textField(100),
  skypeName: textField(100),
  isPrimary: Joi.boolean(),
  enablePortal: Joi.boolean(),
  hasPortalAccess: Joi.boolean(),
}).unknown(true);
