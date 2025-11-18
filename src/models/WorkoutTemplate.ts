import mongoose from 'mongoose';

export interface ISet {
  reps: number;
  weight?: number;
  rpe?: number; // Rate of Perceived Exertion (1-10)
}

export interface IExercise {
  name: string;
  sets: ISet[];
  restTime?: number; // Rest time in seconds, defaults to 120 (2 minutes)
}

export interface IWorkoutTemplate {
  _id?: string;
  name: string;
  description?: string;
  exercises: IExercise[];
  createdBy: string; // username/nickname of the person who created the template
  isPublic?: boolean; // whether other users can see/use this template
  createdAt?: Date;
  updatedAt?: Date;
}

const SetSchema = new mongoose.Schema({
  reps: {
    type: Number,
    required: true,
    min: 1,
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
  }
});

const ExerciseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  sets: {
    type: [SetSchema],
    required: true,
    validate: {
      validator: function(sets: ISet[]) {
        return sets.length > 0;
      },
      message: 'An exercise must have at least one set'
    }
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
    exercises: {
      type: [ExerciseSchema],
      required: true,
      validate: {
        validator: function(exercises: IExercise[]) {
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