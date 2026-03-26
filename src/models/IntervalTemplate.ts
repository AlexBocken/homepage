import mongoose from 'mongoose';

export interface IIntervalStep {
  label: string;
  durationType: 'distance' | 'time';
  durationValue: number; // meters (distance) or seconds (time)
}

export interface IIntervalTemplate {
  _id?: string;
  name: string;
  steps: IIntervalStep[];
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const IntervalStepSchema = new mongoose.Schema({
  label: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  durationType: {
    type: String,
    required: true,
    enum: ['distance', 'time']
  },
  durationValue: {
    type: Number,
    required: true,
    min: 1
  }
});

const IntervalTemplateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    steps: {
      type: [IntervalStepSchema],
      required: true,
      validate: {
        validator: function(steps: IIntervalStep[]) {
          return steps.length > 0;
        },
        message: 'An interval template must have at least one step'
      }
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

IntervalTemplateSchema.index({ createdBy: 1 });

export const IntervalTemplate = mongoose.model<IIntervalTemplate>("IntervalTemplate", IntervalTemplateSchema);
