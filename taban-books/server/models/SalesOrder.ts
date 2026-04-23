/**
 * Sales Order Model
 * Customer sales orders
 */

import mongoose, { Document, Schema } from "mongoose";

interface ISalesOrderItem {
  item?: mongoose.Types.ObjectId;
  name?: string;
  description?: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface ISalesOrder extends Document {
  organization: mongoose.Types.ObjectId;
  orderNumber: string;
  customer: mongoose.Types.ObjectId;
  customerName?: string;
  customerEmail?: string;
  date: Date;
  expectedShipmentDate?: Date;
  referenceNumber?: string;
  paymentTerms?: string;
  deliveryMethod?: string;
  salesperson?: mongoose.Types.ObjectId | null;
  salespersonName?: string;
  warehouseLocation?: string;
  items: ISalesOrderItem[];
  subtotal?: number;
  total?: number;
  notes?: string;
  termsAndConditions?: string;
  status?: "draft" | "sent";
  attachedFiles?: Array<Record<string, any>>;
  createdAt?: Date;
  updatedAt?: Date;
}

const salesOrderItemSchema = new Schema<ISalesOrderItem>(
  {
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item",
    },
    name: String,
    description: String,
    quantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    rate: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    amount: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  { _id: false }
);

const salesOrderSchema = new Schema<ISalesOrder>(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    orderNumber: {
      type: String,
      required: true,
      trim: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    customerName: String,
    customerEmail: String,
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    expectedShipmentDate: Date,
    referenceNumber: {
      type: String,
      trim: true,
      default: "",
    },
    paymentTerms: {
      type: String,
      default: "Due on Receipt",
      trim: true,
    },
    deliveryMethod: {
      type: String,
      default: "",
      trim: true,
    },
    salesperson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Salesperson",
      default: null,
    },
    salespersonName: {
      type: String,
      default: "",
      trim: true,
    },
    warehouseLocation: {
      type: String,
      default: "Head Office",
      trim: true,
    },
    items: {
      type: [salesOrderItemSchema],
      default: [],
    },
    subtotal: {
      type: Number,
      default: 0,
    },
    total: {
      type: Number,
      default: 0,
    },
    notes: {
      type: String,
      default: "",
    },
    termsAndConditions: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["draft", "sent"],
      default: "draft",
    },
    attachedFiles: {
      type: [Schema.Types.Mixed],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

salesOrderSchema.index({ organization: 1, orderNumber: 1 }, { unique: true });
salesOrderSchema.index({ organization: 1, createdAt: -1 });
salesOrderSchema.index({ organization: 1, status: 1 });

const SalesOrder = mongoose.model<ISalesOrder>("SalesOrder", salesOrderSchema);

export default SalesOrder;
