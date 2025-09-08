import mongoose from 'mongoose';

export interface IPayment {
  _id?: string;
  title: string;
  description?: string;
  amount: number;
  currency: string;
  paidBy: string; // username/nickname of the person who paid
  date: Date;
  image?: string; // path to uploaded image
  category: 'groceries' | 'shopping' | 'travel' | 'restaurant' | 'utilities' | 'fun';
  splitMethod: 'equal' | 'full' | 'proportional';
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
      enum: ['CHF'] // For now only CHF as requested
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
      enum: ['groceries', 'shopping', 'travel', 'restaurant', 'utilities', 'fun'],
      default: 'groceries'
    },
    splitMethod: {
      type: String,
      required: true,
      enum: ['equal', 'full', 'proportional'],
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