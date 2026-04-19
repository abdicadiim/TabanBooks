/**
 * Quote Model
 * Sales Quotes
 */

import mongoose, { Document, Schema } from "mongoose";

interface IQuoteItem {
  item?: mongoose.Types.ObjectId;
  lineItemId?: string;
  name?: string;
  description?: string;
  itemOrder?: number;
  productType?: string;
  bcyRate?: number;
  unit?: string;
  quantity: number;
  unitPrice: number;
  discountAmount?: number;
  discount?: number | string;
  taxId?: string;
  taxName?: string;
  taxType?: string;
  taxPercentage?: number;
  taxTreatmentCode?: string;
  locationId?: string;
  locationName?: string;
  tags?: Array<Record<string, any>>;
  taxRate?: number;
  taxAmount?: number;
  total: number;
}

export interface IQuote extends Document {
  organization: mongoose.Types.ObjectId;
  quoteNumber: string;
  customer: mongoose.Types.ObjectId;
  date: Date;
  expiryDate?: Date;
  referenceNumber?: string;
  salesperson?: mongoose.Types.ObjectId | null;
  salespersonName?: string;
  projectId?: mongoose.Types.ObjectId | null;
  projectName?: string;
  subject?: string;
  customSubject?: string;
  customBody?: string;
  items: IQuoteItem[];
  subtotal?: number;
  subTotal?: number;
  tax?: number;
  discount?: number;
  discountType?: "percent" | "amount";
  discountScope?: "entity_level" | "item_level";
  isDiscountBeforeTax?: boolean;
  discountAccount?: string;
  currencyId?: mongoose.Types.ObjectId | null;
  shippingCharges?: number;
  shippingChargeTax?: string;
  exchangeRate?: number;
  adjustment?: number;
  adjustmentDescription?: string;
  roundOff?: number;
  total: number;
  taxExclusive?: "Tax Exclusive" | "Tax Inclusive";
  currency?: string;
  locationId?: string;
  locationName?: string;
  placeOfSupply?: string;
  gstNo?: string;
  gstTreatment?: string;
  taxTreatment?: string;
  isReverseChargeApplied?: boolean;
  templateId?: string;
  templateName?: string;
  customFields?: Array<Record<string, any>>;
  contactPersonsAssociated?: Array<Record<string, any>>;
  billingAddress?: Record<string, any>;
  shippingAddress?: Record<string, any>;
  taxes?: Array<Record<string, any>>;
  pricePrecision?: number;
  tags?: Array<Record<string, any>>;
  acceptRetainer?: boolean;
  retainerPercentage?: number;
  isViewedByClient?: boolean;
  clientViewedTime?: Date;
  acceptedDate?: Date;
  declinedDate?: Date;
  status?: 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'declined' | 'expired' | 'converted' | 'pending_approval' | 'invoiced';
  approvalLevel?: number;
  approverHistory?: Array<{
    approver?: mongoose.Types.ObjectId;
    status?: "approved" | "rejected";
    comments?: string;
    date?: Date;
  }>;
  notes?: string;
  terms?: string;
  convertedToInvoice?: mongoose.Types.ObjectId;
  attachedFiles?: Array<{
    name: string;
    url: string;
    size?: number;
    mimeType?: string;
    documentId?: string;
    uploadedAt?: Date;
  }>;
  comments?: Array<{
    text: string;
    author?: string;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    timestamp?: Date;
  }>;
  createdAt?: Date;
  updatedAt?: Date;
}

const quoteItemSchema = new Schema<IQuoteItem>({
  item: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Item",
  },
  lineItemId: {
    type: String,
    trim: true,
  },
  name: String,
  description: String,
  itemOrder: Number,
  productType: String,
  bcyRate: Number,
  unit: String,
  quantity: {
    type: Number,
    required: true,
    min: 0,
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  taxRate: {
    type: Number,
    default: 0,
  },
  discountAmount: {
    type: Number,
    default: 0,
  },
  discount: {
    type: mongoose.Schema.Types.Mixed,
    default: 0,
  },
  taxId: {
    type: String,
    trim: true,
  },
  taxName: String,
  taxType: String,
  taxPercentage: Number,
  taxTreatmentCode: String,
  locationId: String,
  locationName: String,
  tags: [mongoose.Schema.Types.Mixed],
  taxAmount: {
    type: Number,
    default: 0,
  },
  total: {
    type: Number,
    required: true,
  },
});

const quoteSchema = new Schema<IQuote>(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    quoteNumber: {
      type: String,
      required: true,
      unique: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    expiryDate: {
      type: Date,
    },
    items: [quoteItemSchema],
    referenceNumber: String,
    salesperson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Salesperson",
    },
    salespersonName: String,
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
    },
    projectName: String,
    subject: String,
    customSubject: String,
    customBody: String,

    // Financials
    subtotal: {
      type: Number,
      default: 0,
    },
    subTotal: { // Keep for backward compatibility
      type: Number,
      default: 0,
    },
    tax: {
      type: Number,
      default: 0,
    },
    discount: {
      type: Number,
      default: 0,
    },
    discountType: {
      type: String,
      enum: ["percent", "amount"],
      default: "percent",
    },
    discountScope: {
      type: String,
      enum: ["entity_level", "item_level"],
      default: "entity_level",
    },
    isDiscountBeforeTax: {
      type: Boolean,
      default: true,
    },
    discountAccount: {
      type: String,
      default: "General Income",
    },
    currencyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Currency",
    },
    shippingCharges: {
      type: Number,
      default: 0,
    },
    shippingChargeTax: {
      type: String,
      default: "",
      trim: true,
    },
    exchangeRate: {
      type: Number,
      default: 1,
    },
    adjustment: {
      type: Number,
      default: 0,
    },
    adjustmentDescription: {
      type: String,
      default: "",
    },
    roundOff: {
      type: Number,
      default: 0,
    },
    total: {
      type: Number,
      required: true,
    },
    taxExclusive: {
      type: String,
      enum: ["Tax Exclusive", "Tax Inclusive"],
      default: "Tax Exclusive",
    },
    currency: {
      type: String,
      default: "USD",
      uppercase: true,
    },
    locationId: {
      type: String,
      default: "",
    },
    locationName: {
      type: String,
      default: "",
    },
    placeOfSupply: {
      type: String,
      default: "",
    },
    gstNo: {
      type: String,
      default: "",
    },
    gstTreatment: {
      type: String,
      default: "",
    },
    taxTreatment: {
      type: String,
      default: "",
    },
    isReverseChargeApplied: {
      type: Boolean,
      default: false,
    },
    templateId: {
      type: String,
      default: "",
    },
    templateName: {
      type: String,
      default: "",
    },
    customFields: [mongoose.Schema.Types.Mixed],
    contactPersonsAssociated: [mongoose.Schema.Types.Mixed],
    billingAddress: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    shippingAddress: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    taxes: [mongoose.Schema.Types.Mixed],
    pricePrecision: {
      type: Number,
      default: 2,
    },
    tags: [mongoose.Schema.Types.Mixed],
    acceptRetainer: {
      type: Boolean,
      default: false,
    },
    retainerPercentage: {
      type: Number,
      default: 0,
    },
    isViewedByClient: {
      type: Boolean,
      default: false,
    },
    clientViewedTime: Date,
    acceptedDate: Date,
    declinedDate: Date,
    status: {
      type: String,
      enum: ["draft", "sent", "viewed", "accepted", "rejected", "declined", "expired", "converted", "pending_approval", "invoiced"],
      default: "draft",
    },
    approvalLevel: {
      type: Number,
      default: 0
    },
    approverHistory: [{
      approver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      },
      status: {
        type: String,
        enum: ["approved", "rejected"]
      },
      comments: String,
      date: {
        type: Date,
        default: Date.now
      }
    }],
    notes: String,
    terms: String,
    convertedToInvoice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
    },
    attachedFiles: [{
      name: String,
      url: String,
      size: Number,
      mimeType: String,
      documentId: String,
      uploadedAt: { type: Date, default: Date.now }
    }],
    comments: [{
      text: { type: String, required: true },
      author: { type: String, default: "User" },
      bold: { type: Boolean, default: false },
      italic: { type: Boolean, default: false },
      underline: { type: Boolean, default: false },
      timestamp: { type: Date, default: Date.now }
    }],
  },
  {
    timestamps: true,
  }
);

quoteSchema.index({ organization: 1, quoteNumber: 1 });
quoteSchema.index({ organization: 1, customer: 1 });
quoteSchema.index({ organization: 1, status: 1 });

const Quote = mongoose.model<IQuote>("Quote", quoteSchema);

export default Quote;
