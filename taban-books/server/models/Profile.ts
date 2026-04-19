/**
 * Profile Model
 * Organization Profile Settings
 */

import mongoose, { Document, Schema } from "mongoose";

interface IAddress {
  street?: string;
  street1?: string;
  street2?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  phone?: string;
  fax?: string;
}

export interface IProfile extends Document {
  organization: mongoose.Types.ObjectId;
  name?: string;
  industry?: string;
  logo?: string;
  address?: IAddress;
  phone?: string;
  email?: string;
  website?: string;
  taxId?: string;
  currency?: string;
  baseCurrency?: string;
  fiscalYear?: string;
  fiscalYearStart?: Date;
  reportBasis?: "Accrual" | "Cash";
  orgLanguage?: string;
  commLanguage?: string;
  timeZone?: string;
  dateFormat?: string;
  dateSeparator?: string;
  companyIdType?: string;
  companyIdValue?: string;
  additionalFields?: any[];
  paymentStubAddress?: string;
  showPaymentStubAddress?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const addressSchema = new Schema<IAddress>({
  street: String,
  street1: String,
  street2: String,
  city: String,
  state: String,
  zipCode: String,
  country: String,
  phone: String,
  fax: String,
}, { _id: false });

const profileSchema = new Schema<IProfile>(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      unique: true,
    },
    name: {
      type: String,
      trim: true,
    },
    industry: {
      type: String,
      trim: true,
      default: "",
    },
    logo: {
      type: String,
      default: "",
    },
    address: {
      type: addressSchema,
      default: {},
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },
    website: {
      type: String,
      trim: true,
      default: "",
    },
    taxId: {
      type: String,
      trim: true,
      default: "",
    },
    currency: {
      type: String,
      default: "SOS",
    },
    baseCurrency: {
      type: String,
      default: "SOS",
    },
    fiscalYear: {
      type: String,
      default: "January - December",
    },
    fiscalYearStart: {
      type: Date,
      default: () => new Date(new Date().getFullYear(), 0, 1),
    },
    reportBasis: {
      type: String,
      enum: ["Accrual", "Cash"],
      default: "Accrual",
    },
    orgLanguage: {
      type: String,
      default: "English",
    },
    commLanguage: {
      type: String,
      default: "English",
    },
    timeZone: {
      type: String,
      default: "(GMT 3:00) Eastern African Time (Africa/Mogadishu)",
    },
    dateFormat: {
      type: String,
      default: "dd-MM-yyyy",
    },
    dateSeparator: {
      type: String,
      default: "-",
    },
    companyIdType: {
      type: String,
      default: "Company ID",
    },
    companyIdValue: {
      type: String,
      default: "",
    },
    additionalFields: {
      type: [Object],
      default: [],
    },
    paymentStubAddress: {
      type: String,
      default: "",
    },
    showPaymentStubAddress: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// organization index is already handled by unique: true in schema definition

const Profile = mongoose.model<IProfile>("Profile", profileSchema);

export default Profile;
