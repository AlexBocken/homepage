import mongoose from 'mongoose';

export interface IWorkoutSchedule {
  _id?: string;
  userId: string;
  templateOrder: string[]; // array of WorkoutTemplate _id strings in rotation order
  position: number; // index of the next template to suggest in the rotation
  createdAt?: Date;
  updatedAt?: Date;
}

const WorkoutScheduleSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    templateOrder: {
      type: [String],
      default: []
    },
    position: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

export const WorkoutSchedule = mongoose.model<IWorkoutSchedule>('WorkoutSchedule', WorkoutScheduleSchema);
