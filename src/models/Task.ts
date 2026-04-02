import mongoose from 'mongoose';

export interface ITask {
  _id?: string;
  title: string;
  description?: string;
  assignees: string[];
  tags: string[];
  difficulty?: 'low' | 'medium' | 'high';
  refreshMode?: 'completion' | 'planned';
  isRecurring: boolean;
  frequency?: {
    type: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'custom';
    customDays?: number;
  };
  nextDueDate: Date;
  lastCompletedAt?: Date;
  lastCompletedBy?: string;
  createdBy: string;
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const TaskSchema = new mongoose.Schema(
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
    assignees: [{
      type: String,
      trim: true
    }],
    tags: [{
      type: String,
      trim: true,
      lowercase: true
    }],
    difficulty: {
      type: String,
      enum: ['low', 'medium', 'high']
    },
    refreshMode: {
      type: String,
      enum: ['completion', 'planned'],
      default: 'completion'
    },
    isRecurring: {
      type: Boolean,
      required: true,
      default: false
    },
    frequency: {
      type: {
        type: String,
        enum: ['daily', 'weekly', 'biweekly', 'monthly', 'custom']
      },
      customDays: {
        type: Number,
        min: 1
      }
    },
    nextDueDate: {
      type: Date,
      required: true
    },
    lastCompletedAt: {
      type: Date
    },
    lastCompletedBy: {
      type: String,
      trim: true
    },
    createdBy: {
      type: String,
      required: true,
      trim: true
    },
    active: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

TaskSchema.index({ active: 1, nextDueDate: 1 });
TaskSchema.index({ tags: 1 });

export const Task = mongoose.model<ITask>('Task', TaskSchema);
