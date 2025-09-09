import mongoose from 'mongoose';

export interface IPaymentSplit {
  _id?: string;
  paymentId: mongoose.Schema.Types.ObjectId;
  username: string; // username/nickname of the person who owes/is owed
  amount: number; // amount this person owes (positive) or is owed (negative)
  proportion?: number; // for proportional splits, the proportion (e.g., 0.5 for 50%)
  personalAmount?: number; // for personal_equal splits, the personal portion for this user
  settled: boolean; // whether this split has been settled
  settledAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const PaymentSplitSchema = new mongoose.Schema(
  {
    paymentId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Payment',
      required: true 
    },
    username: { 
      type: String, 
      required: true,
      trim: true 
    },
    amount: { 
      type: Number, 
      required: true 
    },
    proportion: { 
      type: Number,
      min: 0,
      max: 1 
    },
    personalAmount: {
      type: Number,
      min: 0
    },
    settled: { 
      type: Boolean, 
      default: false 
    },
    settledAt: { 
      type: Date 
    }
  },
  { 
    timestamps: true 
  }
);

PaymentSplitSchema.index({ paymentId: 1, username: 1 }, { unique: true });

export const PaymentSplit = mongoose.model<IPaymentSplit>("PaymentSplit", PaymentSplitSchema);