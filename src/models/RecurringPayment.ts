import mongoose from 'mongoose';

export interface IRecurringPayment {
  _id?: string;
  title: string;
  description?: string;
  amount: number; // Amount in the original currency
  currency: string; // Original currency code
  paidBy: string; // username/nickname of the person who paid
  category: 'groceries' | 'shopping' | 'travel' | 'restaurant' | 'utilities' | 'fun' | 'settlement';
  splitMethod: 'equal' | 'full' | 'proportional' | 'personal_equal';
  splits: Array<{
    username: string;
    amount?: number; // Amount in original currency
    proportion?: number;
    personalAmount?: number; // Amount in original currency
  }>;
  frequency: 'daily' | 'weekly' | 'monthly' | 'custom';
  cronExpression?: string; // For custom frequencies using cron syntax
  isActive: boolean;
  nextExecutionDate: Date;
  lastExecutionDate?: Date;
  startDate: Date;
  endDate?: Date; // Optional end date for the recurring payments
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const RecurringPaymentSchema = new mongoose.Schema(
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
    paidBy: {
      type: String,
      required: true,
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
    splits: [{
      username: {
        type: String,
        required: true,
        trim: true
      },
      amount: {
        type: Number
      },
      proportion: {
        type: Number,
        min: 0,
        max: 1
      },
      personalAmount: {
        type: Number,
        min: 0
      }
    }],
    frequency: {
      type: String,
      required: true,
      enum: ['daily', 'weekly', 'monthly', 'custom']
    },
    cronExpression: {
      type: String,
      validate: {
        validator: function(value: string) {
          // Only validate if frequency is custom
          if (this.frequency === 'custom') {
            return value != null && value.trim().length > 0;
          }
          return true;
        },
        message: 'Cron expression is required when frequency is custom'
      }
    },
    isActive: {
      type: Boolean,
      default: true
    },
    nextExecutionDate: {
      type: Date,
      required: true
    },
    lastExecutionDate: {
      type: Date
    },
    startDate: {
      type: Date,
      required: true,
      default: Date.now
    },
    endDate: {
      type: Date
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

// Index for efficiently finding payments that need to be executed
RecurringPaymentSchema.index({ nextExecutionDate: 1, isActive: 1 });

export const RecurringPayment = mongoose.model<IRecurringPayment>("RecurringPayment", RecurringPaymentSchema);