import mongoose from 'mongoose';

export interface IActiveWorkoutSet {
  reps: number | null;
  weight: number | null;
  rpe: number | null;
  completed: boolean;
}

export interface IActiveWorkoutExercise {
  exerciseId: string;
  sets: IActiveWorkoutSet[];
  restTime: number;
}

export interface IActiveWorkout {
  _id?: string;
  userId: string;
  version: number;
  name: string;
  mode: 'manual' | 'gps';
  activityType: 'running' | 'walking' | 'cycling' | 'hiking' | null;
  templateId: string | null;
  exercises: IActiveWorkoutExercise[];
  paused: boolean;
  elapsed: number;
  savedAt: number;
  restStartedAt: number | null;
  restTotal: number;
  restExerciseIdx: number;
  restSetIdx: number;
  updatedAt?: Date;
}

const ActiveWorkoutSetSchema = new mongoose.Schema({
  reps: { type: Number, default: null },
  weight: { type: Number, default: null },
  rpe: { type: Number, default: null },
  completed: { type: Boolean, default: false }
}, { _id: false });

const ActiveWorkoutExerciseSchema = new mongoose.Schema({
  exerciseId: { type: String, required: true, trim: true },
  sets: { type: [ActiveWorkoutSetSchema], default: [] },
  restTime: { type: Number, default: 120 }
}, { _id: false });

const ActiveWorkoutSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    version: {
      type: Number,
      required: true,
      default: 1
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    mode: {
      type: String,
      enum: ['manual', 'gps'],
      default: 'manual'
    },
    activityType: {
      type: String,
      enum: ['running', 'walking', 'cycling', 'hiking'],
      default: null
    },
    templateId: {
      type: String,
      default: null
    },
    exercises: {
      type: [ActiveWorkoutExerciseSchema],
      default: []
    },
    paused: {
      type: Boolean,
      default: false
    },
    elapsed: {
      type: Number,
      default: 0
    },
    savedAt: {
      type: Number,
      default: () => Date.now()
    },
    restStartedAt: {
      type: Number,
      default: null
    },
    restTotal: {
      type: Number,
      default: 0
    },
    restExerciseIdx: {
      type: Number,
      default: -1
    },
    restSetIdx: {
      type: Number,
      default: -1
    }
  },
  {
    timestamps: true
  }
);

// Auto-delete after 24h of inactivity
ActiveWorkoutSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 86400 });

export const ActiveWorkout = mongoose.model<IActiveWorkout>('ActiveWorkout', ActiveWorkoutSchema);
