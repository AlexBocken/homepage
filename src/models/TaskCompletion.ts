import mongoose from 'mongoose';

export interface ITaskCompletion {
  _id?: string;
  taskId: mongoose.Types.ObjectId;
  taskTitle: string;
  completedBy: string;
  completedAt: Date;
  stickerId?: string;
  tags: string[];
}

const TaskCompletionSchema = new mongoose.Schema(
  {
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      required: true
    },
    taskTitle: {
      type: String,
      required: true,
      trim: true
    },
    completedBy: {
      type: String,
      required: true,
      trim: true
    },
    completedAt: {
      type: Date,
      required: true,
      default: Date.now
    },
    stickerId: {
      type: String,
      trim: true
    },
    tags: [{
      type: String,
      trim: true,
      lowercase: true
    }]
  }
);

TaskCompletionSchema.index({ completedBy: 1 });
TaskCompletionSchema.index({ taskId: 1 });
TaskCompletionSchema.index({ completedAt: -1 });

export const TaskCompletion = mongoose.model<ITaskCompletion>('TaskCompletion', TaskCompletionSchema);
