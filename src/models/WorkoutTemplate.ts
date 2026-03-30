import mongoose from 'mongoose';

export interface ISet {
  reps?: number;
  weight?: number;
  rpe?: number; // Rate of Perceived Exertion (1-10)
  distance?: number; // km
  duration?: number; // minutes
}

export interface IExercise {
  exerciseId: string;
  name?: string;
  sets: ISet[];
  restTime?: number; // Rest time in seconds, defaults to 120 (2 minutes)
}

export interface IWorkoutTemplate {
  _id?: string;
  name: string;
  description?: string;
  mode?: 'manual' | 'gps';
  activityType?: 'running' | 'walking' | 'cycling' | 'hiking';
  intervalTemplateId?: string; // reference to an IntervalTemplate for GPS workouts
  exercises: IExercise[];
  createdBy: string; // username/nickname of the person who created the template
  isPublic?: boolean; // whether other users can see/use this template
  createdAt?: Date;
  updatedAt?: Date;
}

const SetSchema = new mongoose.Schema({
  reps: {
    type: Number,
    min: 0,
    max: 1000
  },
  weight: {
    type: Number,
    min: 0,
    max: 1000 // kg
  },
  rpe: {
    type: Number,
    min: 1,
    max: 10
  },
  distance: {
    type: Number,
    min: 0,
    max: 1000 // km
  },
  duration: {
    type: Number,
    min: 0,
    max: 6000 // minutes
  }
});

const ExerciseSchema = new mongoose.Schema({
  exerciseId: {
    type: String,
    required: true,
    trim: true
  },
  name: {
    type: String,
    trim: true
  },
  sets: {
    type: [SetSchema],
    default: []
  },
  restTime: {
    type: Number,
    default: 120, // 2 minutes in seconds
    min: 10,
    max: 600 // max 10 minutes rest
  }
});

const WorkoutTemplateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500
    },
    mode: {
      type: String,
      enum: ['manual', 'gps'],
      default: 'manual'
    },
    activityType: {
      type: String,
      enum: ['running', 'walking', 'cycling', 'hiking'],
      default: undefined
    },
    intervalTemplateId: {
      type: String,
      default: undefined
    },
    exercises: {
      type: [ExerciseSchema],
      required: true,
      validate: {
        validator: function(this: any, exercises: IExercise[]) {
          // GPS templates don't need exercises
          if (this.mode === 'gps') return true;
          return exercises.length > 0;
        },
        message: 'A workout template must have at least one exercise'
      }
    },
    createdBy: {
      type: String,
      required: true,
      trim: true
    },
    isPublic: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

WorkoutTemplateSchema.index({ createdBy: 1 });
WorkoutTemplateSchema.index({ name: 1, createdBy: 1 });

export const WorkoutTemplate = mongoose.model<IWorkoutTemplate>("WorkoutTemplate", WorkoutTemplateSchema);