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
  cadence?: number; // steps per minute, from step detector sensor
  timestamp: number;
}

export interface ICompletedExercise {
  exerciseId: string;
  name: string;
  sets: ICompletedSet[];
  restTime?: number;
  notes?: string;
  gpsTrack?: IGpsPoint[];
  gpsPreview?: number[][]; // downsampled [[lat,lng], ...] for card preview
  totalDistance?: number; // km
}

export interface IKcalEstimate {
  kcal: number;
  lower: number;
  upper: number;
  methods: string[];
}

export interface IPr {
  exerciseId: string;
  type: string; // 'est1rm' | 'maxWeight' | 'bestSetVolume' | 'repMax' | 'longestDistance' | 'fastestPace:<min>:<max>'
  value: number;
  reps?: number;
}

export interface IWorkoutSession {
  _id?: string;
  templateId?: string; // Reference to WorkoutTemplate if based on template
  templateName?: string; // Snapshot of template name for history
  name: string;
  mode?: 'manual' | 'gps';
  activityType?: 'running' | 'walking' | 'cycling' | 'hiking';
  exercises: ICompletedExercise[];
  startTime: Date;
  endTime?: Date;
  duration?: number; // Duration in minutes
  totalVolume?: number; // Total weight × reps across all exercises
  totalDistance?: number; // Total distance across all cardio exercises
  gpsTrack?: IGpsPoint[]; // Top-level GPS track for GPS-only workouts
  gpsPreview?: number[][]; // Downsampled [[lat,lng], ...] for card preview
  gpsBbox?: { minLat: number; maxLat: number; minLng: number; maxLng: number }; // bbox over all GPS points, for segment-match prefiltering
  prs?: IPr[];
  kcalEstimate?: IKcalEstimate;
  // Fastest continuous K-km splits (one per integer km), computed from gpsTrack.
  // Cached so the "fastest Nk" dashboard card is a cheap min query.
  bestEfforts?: { km: number; seconds: number; startIdx: number; endIdx: number }[];
  // "Records earned by this run", persisted so they count toward the run's PR
  // total (badge / history / cards) beyond the completion screen. Distance PRs:
  // an all-time-fastest Nk on this run's board. Segment PRs: a personal best or
  // a KOM (crown) on a matched segment. Both are snapshots at save/snap time.
  bestEffortPrs?: { km: number; seconds: number; prevSeconds: number }[];
  segmentPrs?: {
    segmentId: string;
    segmentName: string;
    distance: number;
    elapsedSeconds: number;
    isPB: boolean;
    isKOM: boolean;
  }[];
  // The weather this run was performed in, sampled once at its average location and
  // mid-time (see $lib/server/weather). Stored rather than looked up on read: it is a
  // fact about a past hour, it must be readable offline, and re-asking would spend a
  // third-party call per page view to get the same answer.
  weather?: {
    temperatureC: number;
    humidity: number;
    code: number;
    condition: string;
    lat: number;
    lng: number;
    time: Date;
    source: string;
  };
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
  cadence: Number,
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
  gpsPreview: {
    type: [[Number]],
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
    mode: {
      type: String,
      enum: ['manual', 'gps'],
      default: 'manual'
    },
    activityType: {
      type: String,
      enum: ['running', 'walking', 'cycling', 'hiking']
    },
    exercises: {
      type: [CompletedExerciseSchema],
      default: []
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
    totalVolume: {
      type: Number,
      min: 0
    },
    totalDistance: {
      type: Number,
      min: 0
    },
    gpsTrack: {
      type: [GpsPointSchema],
      default: undefined
    },
    gpsPreview: {
      type: [[Number]],
      default: undefined
    },
    gpsBbox: {
      type: {
        minLat: { type: Number, required: true },
        maxLat: { type: Number, required: true },
        minLng: { type: Number, required: true },
        maxLng: { type: Number, required: true }
      },
      default: undefined,
      _id: false
    },
    prs: [{
      exerciseId: { type: String, required: true },
      type: { type: String, required: true },
      value: { type: Number, required: true },
      reps: Number,
      _id: false
    }],
    kcalEstimate: {
      type: {
        kcal: { type: Number, required: true },
        lower: { type: Number, required: true },
        upper: { type: Number, required: true },
        methods: { type: [String], required: true },
      },
      default: undefined,
      _id: false,
    },
    bestEfforts: {
      type: [{
        km: { type: Number, required: true },
        seconds: { type: Number, required: true },
        startIdx: { type: Number, required: true },
        endIdx: { type: Number, required: true },
        _id: false,
      }],
      default: undefined,
    },
    bestEffortPrs: {
      type: [{
        km: { type: Number, required: true },
        seconds: { type: Number, required: true },
        prevSeconds: { type: Number, required: true },
        _id: false,
      }],
      default: undefined,
    },
    segmentPrs: {
      type: [{
        segmentId: { type: String, required: true },
        segmentName: { type: String, required: true },
        distance: { type: Number, required: true },
        elapsedSeconds: { type: Number, required: true },
        isPB: { type: Boolean, required: true },
        isKOM: { type: Boolean, required: true },
        _id: false,
      }],
      default: undefined,
    },
    weather: {
      type: {
        temperatureC: { type: Number, required: true },
        humidity: { type: Number, required: true },
        // The provider's raw code, so a change to the condition mapping is a redeploy
        // rather than a refetch of every run ever recorded.
        code: { type: Number, required: true },
        condition: { type: String, required: true },
        lat: { type: Number, required: true },
        lng: { type: Number, required: true },
        time: { type: Date, required: true },
        source: { type: String, required: true },
        _id: false
      },
      default: undefined
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
// Segment backfill: GPS runs of a given activity, bbox-prefiltered by lat range.
WorkoutSessionSchema.index({ activityType: 1, 'gpsBbox.minLat': 1, 'gpsBbox.maxLat': 1 });

export const WorkoutSession: mongoose.Model<IWorkoutSession> = mongoose.models.WorkoutSession || mongoose.model("WorkoutSession", WorkoutSessionSchema);