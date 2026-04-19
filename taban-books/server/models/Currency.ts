/**
 * Currency Model
 * Currency Settings & Exchange Rates
 */

import mongoose, { Document, Schema } from "mongoose";

const exchangeRateSchema = new Schema({
  date: {
    type: Date,
    required: true,
  },
  rate: {
    type: Number,
    required: true,
    min: 0,
  },
});

export interface ICurrency extends Document {
  organization: mongoose.Types.ObjectId;
  code: string;
  name: string;
  symbol: string;
  isBaseCurrency: boolean;
  exchangeRates: Array<{
    date: Date;
    rate: number;
  }>;
  isActive: boolean;
}

const currencySchema = new Schema<ICurrency>(
  {
    organization: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    code: {
      type: String,
      required: true,
      uppercase: true,
      minlength: 3,
      maxlength: 50, // Increased to accommodate "AED - UAE DIRHAM"
    },
    name: {
      type: String,
      required: true,
    },
    symbol: {
      type: String,
      default: "$",
    },
    isBaseCurrency: {
      type: Boolean,
      default: false,
    },
    exchangeRates: [exchangeRateSchema],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

currencySchema.index({ organization: 1, code: 1 });
currencySchema.index({ organization: 1, isBaseCurrency: 1 });
currencySchema.index({ organization: 1, isActive: 1 });

const Currency = mongoose.model<ICurrency>("Currency", currencySchema);

export default Currency;

