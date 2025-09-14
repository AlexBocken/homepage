import mongoose from 'mongoose';

export interface IExchangeRate {
  _id?: string;
  fromCurrency: string; // e.g., "USD"
  toCurrency: string; // Always "CHF" for our use case
  rate: number;
  date: string; // Date in YYYY-MM-DD format
  createdAt?: Date;
  updatedAt?: Date;
}

const ExchangeRateSchema = new mongoose.Schema(
  {
    fromCurrency: {
      type: String,
      required: true,
      uppercase: true,
      trim: true
    },
    toCurrency: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      default: 'CHF'
    },
    rate: {
      type: Number,
      required: true,
      min: 0
    },
    date: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/
    }
  },
  {
    timestamps: true
  }
);

// Create compound index for efficient lookups
ExchangeRateSchema.index({ fromCurrency: 1, toCurrency: 1, date: 1 }, { unique: true });

export const ExchangeRate = mongoose.model<IExchangeRate>("ExchangeRate", ExchangeRateSchema);