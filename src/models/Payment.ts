import mongoose from 'mongoose';

export interface IPayment {
  _id?: string;
  title: string;
  description?: string;
  amount: number; // Always in CHF (converted if necessary)
  currency: string; // Currency code (CHF if no conversion, foreign currency if converted)
  originalAmount?: number; // Amount in foreign currency (only if currency != CHF)
  exchangeRate?: number; // Exchange rate used for conversion (only if currency != CHF)
  paidBy: string; // username/nickname of the person who paid
  date: Date;
  image?: string; // path to uploaded image
  category: 'groceries' | 'shopping' | 'travel' | 'restaurant' | 'utilities' | 'fun' | 'settlement';
  splitMethod: 'equal' | 'full' | 'proportional' | 'personal_equal';
  createdBy: string; // username/nickname of the person who created the payment
  createdAt?: Date;
  updatedAt?: Date;
}

const PaymentSchema = new mongoose.Schema(
  {
    title: { 
      type: String, 
      required: true,
      trim: true 
    },
    description: { 
      type: String,
      trim: true 
    },
    amount: { 
      type: Number, 
      required: true,
      min: 0 
    },
    currency: { 
      type: String, 
      required: true, 
      default: 'CHF',
      uppercase: true
    },
    originalAmount: {
      type: Number,
      required: false,
      min: 0
    },
    exchangeRate: {
      type: Number,
      required: false,
      min: 0
    },
    paidBy: { 
      type: String, 
      required: true,
      trim: true 
    },
    date: { 
      type: Date, 
      required: true,
      default: Date.now 
    },
    image: { 
      type: String,
      trim: true 
    },
    category: {
      type: String,
      required: true,
      enum: ['groceries', 'shopping', 'travel', 'restaurant', 'utilities', 'fun', 'settlement'],
      default: 'groceries'
    },
    splitMethod: {
      type: String,
      required: true,
      enum: ['equal', 'full', 'proportional', 'personal_equal'],
      default: 'equal'
    },
    createdBy: { 
      type: String, 
      required: true,
      trim: true 
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

PaymentSchema.virtual('splits', {
  ref: 'PaymentSplit',
  localField: '_id',
  foreignField: 'paymentId'
});

export const Payment = mongoose.model<IPayment>("Payment", PaymentSchema);