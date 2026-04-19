/**
 * Customer Model
 * Customers (Sales module)
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

interface ICustomerComment {
  id?: string | number;
  text: string;
  author?: string;
  timestamp?: Date;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
}

export interface ICustomer extends Document {
  customerType: 'business' | 'individual';
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
  profileImage?: string;
  xHandle?: string;
  skypeName?: string;
  facebook?: string;
  customerNumber?: string;
  contactNumber?: string;
  customerLanguage?: string;
  taxRate?: string;
  exchangeRate?: number;
  companyId?: string;
  locationCode?: string;
  currency?: string;
  paymentTerms?: string;
  paymentTermsLabel?: string;
  department?: string;
  designation?: string;
  accountsReceivable?: string;
  openingBalance?: string;
  receivables?: number;
  unusedCredits?: number;
  linkedVendorId?: string | null;
  linkedVendorName?: string | null;
  enablePortal?: boolean;
  portalStatus?: 'enabled' | 'disabled' | 'invited';
  portalInvitationAcceptedDate?: Date;
  reviewRequested?: boolean;
  reviewRequestedAt?: Date;
  customerOwner?: string;
  organization?: mongoose.Types.ObjectId;
  billingAddress?: IAddress;
  shippingAddress?: IAddress;
  contactPersons?: IContactPerson[];
  documents?: Array<{
    documentId?: string;
    name: string;
    size?: string;
    url: string;
    uploadedAt?: Date;
  }>;
  customFields?: Record<string, any>;
  reportingTags?: string[];
  comments?: ICustomerComment[];
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

const customerCommentSchema = new Schema<ICustomerComment>({
  id: { type: mongoose.Schema.Types.Mixed },
  text: { type: String, required: true, trim: true },
  author: { type: String, default: 'You' },
  timestamp: { type: Date, default: Date.now },
  bold: { type: Boolean, default: false },
  italic: { type: Boolean, default: false },
  underline: { type: Boolean, default: false }
}, { _id: true });

const customerSchema = new Schema<ICustomer>({
  // Basic Information
  customerType: {
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
  profileImage: { type: String, default: '' }, // Base64 encoded image or URL

  // Social Media
  xHandle: { type: String, default: '' },
  skypeName: { type: String, default: '' },
  facebook: { type: String, default: '' },

  // Business Details
  customerNumber: { type: String, default: '' },
  contactNumber: { type: String, default: '' },
  customerLanguage: { type: String, default: 'english' },
  taxRate: { type: String, default: '' },
  exchangeRate: { type: Number, default: 1 },
  companyId: { type: String, default: '' },
  locationCode: { type: String, default: '' },
  currency: { type: String, default: 'USD' },
  paymentTerms: { type: String, default: 'due-on-receipt' },
  paymentTermsLabel: { type: String, default: '' },
  department: { type: String, default: '' },
  designation: { type: String, default: '' },

  // Financial Information
  accountsReceivable: { type: String, default: '' },
  openingBalance: { type: String, default: '0.00' },
  receivables: { type: Number, default: 0 },
  unusedCredits: { type: Number, default: 0 },
  linkedVendorId: { type: String, default: null },
  linkedVendorName: { type: String, default: null },

  // Portal Settings
  enablePortal: { type: Boolean, default: false },
  portalStatus: { type: String, enum: ['enabled', 'disabled', 'invited'], default: 'disabled' },
  portalInvitationAcceptedDate: { type: Date },
  reviewRequested: { type: Boolean, default: false },
  reviewRequestedAt: { type: Date },

  // Ownership
  customerOwner: { type: String, default: '' },
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
  documents: [{
    documentId: String,
    name: String,
    size: String,
    url: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  customFields: { type: mongoose.Schema.Types.Mixed, default: {} },
  reportingTags: [{ type: String }],
  comments: { type: [customerCommentSchema], default: [] },
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

// Pre-save hook to ensure name and displayName are always set
customerSchema.pre('save', function (next) {
  // If displayName is missing or empty, construct it
  if (!this.displayName || this.displayName.trim() === '') {
    const firstName = this.firstName || '';
    const lastName = this.lastName || '';
    const companyName = this.companyName || '';

    if (firstName || lastName) {
      this.displayName = `${firstName} ${lastName}`.trim();
    } else if (companyName) {
      this.displayName = companyName.trim();
    } else {
      this.displayName = 'Customer';
    }
  }

  // Ensure displayName is trimmed
  this.displayName = this.displayName.trim() || 'Customer';

  // name should always match displayName
  if (!this.name || this.name.trim() === '') {
    this.name = this.displayName;
  }
  this.name = this.name.trim() || this.displayName;

  next();
});

// Indexes for better query performance
customerSchema.index({ organization: 1, displayName: 1 });
customerSchema.index({ organization: 1, email: 1 });
customerSchema.index({ organization: 1, companyName: 1 });
customerSchema.index({ organization: 1, createdAt: -1 });
customerSchema.index({ organization: 1, status: 1 });
customerSchema.index({ organization: 1, customerNumber: 1 });
customerSchema.index({ organization: 1, customerType: 1 });
customerSchema.index({ displayName: 1 });
customerSchema.index({ email: 1 });
customerSchema.index({ companyName: 1 });
customerSchema.index({ organization: 1 });
customerSchema.index({ status: 1 });
customerSchema.index({ customerType: 1 });

// Virtual for full name
customerSchema.virtual('fullName').get(function () {
  if (this.customerType === 'individual') {
    return `${this.firstName} ${this.lastName}`.trim();
  }
  return this.companyName || this.displayName;
});

const Customer = mongoose.model<ICustomer>('Customer', customerSchema);

export default Customer;
