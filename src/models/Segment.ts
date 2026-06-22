import mongoose from 'mongoose';

export interface ILatLng {
  lat: number;
  lng: number;
}

export interface IBbox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export interface ISegment {
  _id?: string;
  name: string;
  activityType: 'running' | 'walking' | 'cycling' | 'hiking';
  createdBy: string; // nickname of the creator
  public: boolean; // listed for everyone (false = creator's efforts only)

  // Geometry — all derived from the source run slice.
  points: number[][]; // simplified polyline [[lat,lng], ...]
  startPoint: ILatLng;
  endPoint: ILatLng;
  bbox: IBbox;
  distance: number; // km
  elevationGain: number; // m
  pointCount: number; // length of `points`

  // Provenance — where the segment was carved from.
  sourceSessionId: string;
  sourceExerciseIndex: number | null; // null = top-level gpsTrack
  sourceStartIdx: number;
  sourceEndIdx: number;

  createdAt?: Date;
  updatedAt?: Date;
}

const LatLngSchema = new mongoose.Schema(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  { _id: false }
);

const SegmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    activityType: {
      type: String,
      enum: ['running', 'walking', 'cycling', 'hiking'],
      required: true
    },
    createdBy: { type: String, required: true, trim: true },
    public: { type: Boolean, default: true },

    points: { type: [[Number]], required: true },
    startPoint: { type: LatLngSchema, required: true },
    endPoint: { type: LatLngSchema, required: true },
    bbox: {
      type: {
        minLat: { type: Number, required: true },
        maxLat: { type: Number, required: true },
        minLng: { type: Number, required: true },
        maxLng: { type: Number, required: true }
      },
      required: true,
      _id: false
    },
    distance: { type: Number, required: true, min: 0 },
    elevationGain: { type: Number, default: 0, min: 0 },
    pointCount: { type: Number, required: true, min: 2 },

    sourceSessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WorkoutSession',
      required: true
    },
    sourceExerciseIndex: { type: Number, default: null },
    sourceStartIdx: { type: Number, required: true },
    sourceEndIdx: { type: Number, required: true }
  },
  { timestamps: true }
);

// Candidate prefilter on run save: same activity + bbox lat-range overlap
// (lng is filtered in memory; segment volume is tiny).
SegmentSchema.index({ activityType: 1, 'bbox.minLat': 1, 'bbox.maxLat': 1 });
// "My segments" listing.
SegmentSchema.index({ createdBy: 1, createdAt: -1 });

export const Segment: mongoose.Model<ISegment> =
  mongoose.models.Segment || mongoose.model<ISegment>('Segment', SegmentSchema);
