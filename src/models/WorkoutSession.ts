import mongoose from 'mongoose';

export interface ICompletedSet {
  reps?: number;
  weight?: number;
  rpe?: number; // Rate of Perceived Exertion (1-10)
  distance?: number; // km
  duration?: number; // minutes
  completed: boolean;
  notes?: string;
}

export interface IGpsPoint {
  lat: number;
  lng: number;
  altitude?: number;
  speed?: number;
  timestamp: number;
}

export interface ICompletedExercise {
  exerciseId: string;
  name: string;
  sets: ICompletedSet[];
  restTime?: number;
  notes?: string;
  gpsTrack?: IGpsPoint[];
  totalDistance?: number; // km
}

export interface IWorkoutSession {
  _id?: string;
  templateId?: string; // Reference to WorkoutTemplate if based on template
  templateName?: string; // Snapshot of template name for history
  name: string;
  exercises: ICompletedExercise[];
  startTime: Date;
  endTime?: Date;
  duration?: number; // Duration in minutes
  notes?: string;
  createdBy: string; // username/nickname of the person who performed the workout
  createdAt?: Date;
  updatedAt?: Date;
}

const CompletedSetSchema = new mongoose.Schema({
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
  },
  completed: {
    type: Boolean,
    default: false
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 200
  }
});

const GpsPointSchema = new mongoose.Schema({
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  altitude: Number,
  speed: Number,
  timestamp: { type: Number, required: true }
}, { _id: false });

const CompletedExerciseSchema = new mongoose.Schema({
  exerciseId: {
    type: String,
    required: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  sets: {
    type: [CompletedSetSchema],
    required: true
  },
  restTime: {
    type: Number,
    default: 120, // 2 minutes in seconds
    min: 10,
    max: 600 // max 10 minutes rest
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 500
  },
  gpsTrack: {
    type: [GpsPointSchema],
    default: undefined
  },
  totalDistance: {
    type: Number,
    min: 0
  }
});

const WorkoutSessionSchema = new mongoose.Schema(
  {
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WorkoutTemplate'
    },
    templateName: {
      type: String,
      trim: true
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    exercises: {
      type: [CompletedExerciseSchema],
      required: true,
      validate: {
        validator: function(exercises: ICompletedExercise[]) {
          return exercises.length > 0;
        },
        message: 'A workout session must have at least one exercise'
      }
    },
    startTime: {
      type: Date,
      required: true,
      default: Date.now
    },
    endTime: {
      type: Date
    },
    duration: {
      type: Number, // in minutes
      min: 0
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 1000
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

WorkoutSessionSchema.index({ createdBy: 1, startTime: -1 });
WorkoutSessionSchema.index({ templateId: 1 });

export const WorkoutSession = mongoose.models.WorkoutSession as mongoose.Model<IWorkoutSession> ?? mongoose.model<IWorkoutSession>("WorkoutSession", WorkoutSessionSchema);