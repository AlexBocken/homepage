import mongoose from 'mongoose';
import { SEGMENT_ACTIVITIES, type SegmentActivity } from '$lib/fitness/segmentActivities';

export interface ISegmentEffort {
  _id?: string;
  segmentId: string;
  sessionId: string;
  userId: string; // run owner nickname
  activityType: SegmentActivity;

  elapsedSeconds: number; // interpolated end-crossing minus start-crossing
  distance: number; // km actually traversed for this effort
  elevationGain: number | null; // m

  startIdx: number; // index range within the session's track
  endIdx: number;
  exerciseIndex: number | null; // null = top-level gpsTrack

  date: Date; // when the effort happened (session.startTime)
  createdAt?: Date;
  updatedAt?: Date;
}

const SegmentEffortSchema = new mongoose.Schema(
  {
    segmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Segment',
      required: true
    },
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WorkoutSession',
      required: true
    },
    userId: { type: String, required: true, trim: true },
    // Always the segment's own activity, so it inherits the same two-value
    // domain — see `$lib/fitness/segmentActivities`.
    activityType: {
      type: String,
      enum: [...SEGMENT_ACTIVITIES],
      required: true
    },

    elapsedSeconds: { type: Number, required: true, min: 0 },
    distance: { type: Number, required: true, min: 0 },
    elevationGain: { type: Number, default: null },

    startIdx: { type: Number, required: true },
    endIdx: { type: Number, required: true },
    exerciseIndex: { type: Number, default: null },

    date: { type: Date, required: true }
  },
  { timestamps: true }
);

// Leaderboard: fastest-first scan within a segment.
SegmentEffortSchema.index({ segmentId: 1, elapsedSeconds: 1 });
// Personal best + effort history for one user on a segment.
SegmentEffortSchema.index({ segmentId: 1, userId: 1, elapsedSeconds: 1 });
// Cascade: find/delete all efforts for a run on edit/snap/delete.
SegmentEffortSchema.index({ sessionId: 1 });

export const SegmentEffort: mongoose.Model<ISegmentEffort> =
  mongoose.models.SegmentEffort ||
  mongoose.model<ISegmentEffort>('SegmentEffort', SegmentEffortSchema);
