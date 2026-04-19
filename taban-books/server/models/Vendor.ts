/**
 * Vendor Model
 * Vendors (Purchases module) - Similar structure to Customer
 */

import mongoose, { Document, Schema } from "mongoose";

interface IContactPerson {
  salutation?: string;
  firstName: string;
  lastName: string;
  email?: string;
  workPhone?: string;
  mobile?: string;
  designation?: string;
  department?: string;
  skypeName?: string;
  isPrimary?: boolean;
  enablePortal?: boolean;
  hasPortalAccess?: boolean;
}

interface IAddress {
  attention?: string;
  country?: string;
  street1?: string;
  street2?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  phone?: string;
  fax?: string;
}

interface IVendorComment {
  id?: string | number;
  text: string;
  author?: string;
  date?: Date;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
}

export interface IVendor extends Document {
  id?: string;
  vendorType: 'business' | 'individual';
  salutation?: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  displayName: string;
  name: string;
  email?: string;
  workPhone?: string;
  mobile?: string;
  websiteUrl?: string;
  xHandle?: string;
  skypeName?: string;
  facebook?: string;
  contactNumber?: string;
  vendorLanguage?: string;
  taxRate?: string;
  enableTDS?: boolean;
  companyId?: string;
  locationCode?: string;
  currency?: string;
  paymentTerms?: string;
  paymentTermsLabel?: string;
  department?: string;
  designation?: string;
  accountsPayable?: string;
  openingBalance?: string;
  payables?: number;
  unusedCredits?: number;
  linkedCustomerId?: string | null;
  linkedCustomerName?: string | null;
  enablePortal?: boolean;
  portalStatus?: 'enabled' | 'disabled' | 'invited';
  portalInvitationAcceptedDate?: Date;
  vendorOwner?: string;
  organization?: mongoose.Types.ObjectId;
  billingAddress?: IAddress;
  shippingAddress?: IAddress;
  contactPersons?: IContactPerson[];
  documents?: Array<{
    id?: string | number;
    name: string;
    url: string;
    size?: number;
    type?: string;
    uploadedAt?: Date;
  }>;
  comments?: IVendorComment[];
  customFields?: Record<string, any>;
  reportingTags?: string[];
  remarks?: string;
  notes?: string;
  status?: 'active' | 'inactive';
  source?: string;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  fullName?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const contactPersonSchema = new Schema<IContactPerson>({
  salutation: { type: String, default: '' },
  firstName: { type: String, required: true },
  lastName: { type: String, default: '' },
  email: { type: String, default: '' },
  workPhone: { type: String, default: '' },
  mobile: { type: String, default: '' },
  designation: { type: String, default: '' },
  department: { type: String, default: '' },
  skypeName: { type: String, default: '' },
  isPrimary: { type: Boolean, default: false },
  enablePortal: { type: Boolean, default: false },
  hasPortalAccess: { type: Boolean, default: false }
}, { _id: true });

const addressSchema = new Schema<IAddress>({
  attention: { type: String, default: '' },
  country: { type: String, default: '' },
  street1: { type: String, default: '' },
  street2: { type: String, default: '' },
  city: { type: String, default: '' },
  state: { type: String, default: '' },
  zipCode: { type: String, default: '' },
  phone: { type: String, default: '' },
  fax: { type: String, default: '' }
}, { _id: false });

const vendorDocumentSchema = new Schema({
  id: { type: mongoose.Schema.Types.Mixed },
  name: { type: String, required: true },
  url: { type: String, required: true },
  size: { type: Number, default: 0 },
  type: { type: String, default: '' },
  uploadedAt: { type: Date, default: Date.now }
}, { _id: false });

const vendorCommentSchema = new Schema<IVendorComment>({
  id: { type: mongoose.Schema.Types.Mixed },
  text: { type: String, required: true },
  author: { type: String, default: 'You' },
  date: { type: Date, default: Date.now },
  bold: { type: Boolean, default: false },
  italic: { type: Boolean, default: false },
  underline: { type: Boolean, default: false }
}, { _id: false });

const vendorSchema = new Schema<IVendor>({
  // ID field for legacy timestamp-based IDs (from localStorage migration)
  id: { type: String, default: null, index: true },

  // Basic Information
  vendorType: {
    type: String,
    enum: ['business', 'individual'],
    default: 'business'
  },
  salutation: { type: String, default: '' },
  firstName: { type: String, default: '' },
  lastName: { type: String, default: '' },
  companyName: { type: String, default: '' },
  displayName: { type: String, required: true },
  name: { type: String, required: true }, // Alias for displayName for compatibility

  // Contact Information
  email: { type: String, default: '' },
  workPhone: { type: String, default: '' },
  mobile: { type: String, default: '' },
  websiteUrl: { type: String, default: '' },

  // Social Media
  xHandle: { type: String, default: '' },
  skypeName: { type: String, default: '' },
  facebook: { type: String, default: '' },
  contactNumber: { type: String, default: '' },

  // Business Details
  vendorLanguage: { type: String, default: 'english' },
  taxRate: { type: String, default: '' },
  enableTDS: { type: Boolean, default: false },
  companyId: { type: String, default: '' },
  locationCode: { type: String, default: '' },
  currency: { type: String, default: 'USD' },
  paymentTerms: { type: String, default: 'net_30' },
  paymentTermsLabel: { type: String, default: '' },
  department: { type: String, default: '' },
  designation: { type: String, default: '' },

  // Financial Information
  accountsPayable: { type: String, default: '' },
  openingBalance: { type: String, default: '0.00' },
  payables: { type: Number, default: 0 },
  unusedCredits: { type: Number, default: 0 },
  linkedCustomerId: { type: String, default: null },
  linkedCustomerName: { type: String, default: null },

  // Portal Settings
  enablePortal: { type: Boolean, default: false },
  portalStatus: { type: String, enum: ['enabled', 'disabled', 'invited'], default: 'disabled' },
  portalInvitationAcceptedDate: { type: Date },

  // Ownership
  vendorOwner: { type: String, default: '' },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: false
  },

  // Addresses
  billingAddress: { type: addressSchema, default: {} },
  shippingAddress: { type: addressSchema, default: {} },

  // Additional Data
  contactPersons: [contactPersonSchema],
  documents: [vendorDocumentSchema],
  comments: [vendorCommentSchema],
  customFields: { type: mongoose.Schema.Types.Mixed, default: {} },
  reportingTags: [{ type: String }],
  remarks: { type: String, default: '' },
  notes: { type: String, default: '' },

  // Status
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  source: { type: String, default: '' },

  // Audit Fields
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
vendorSchema.index({ organization: 1, displayName: 1 });
vendorSchema.index({ organization: 1, email: 1 });
vendorSchema.index({ organization: 1, companyName: 1 });
vendorSchema.index({ organization: 1, status: 1 });
vendorSchema.index({ organization: 1, createdAt: -1 });

// Legacy single indices (can keep or remove, keeping for safety)
vendorSchema.index({ displayName: 1 });
vendorSchema.index({ email: 1 });
vendorSchema.index({ companyName: 1 });
vendorSchema.index({ organization: 1 });
vendorSchema.index({ status: 1 });
vendorSchema.index({ vendorType: 1 });

// Virtual for full name
vendorSchema.virtual('fullName').get(function () {
  if (this.vendorType === 'individual') {
    return `${this.firstName} ${this.lastName}`.trim();
  }
  return this.companyName || this.displayName;
});

const Vendor = mongoose.model<IVendor>("Vendor", vendorSchema);

export default Vendor;
