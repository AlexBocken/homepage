import mongoose from 'mongoose';

// Per-user visibility prefs for the fitness dashboard sections. All default on;
// users hide what they don't want from the stats-page "customize" panel.
const FitnessDashboardSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    simpleStats: { type: Boolean, default: true },
    streak: { type: Boolean, default: true },
    weight: { type: Boolean, default: true },
    bodyFat: { type: Boolean, default: true },
    dietStats: { type: Boolean, default: true },
    muscleBalance: { type: Boolean, default: true },
    bodyParts: { type: Boolean, default: true },
    segmentStat: { type: Boolean, default: true },
    fastestK: { type: Boolean, default: true },
    ownPeriod: { type: Boolean, default: true },
    sharedPeriods: { type: Boolean, default: true },
    // Up to two segments the segment-stat card tracks (Segment _ids). Not a
    // toggle, so handled explicitly by the API (outside DASHBOARD_KEYS).
    segmentStatIds: { type: [String], default: undefined },
    // Legacy single-segment field, kept for back-compat reads.
    segmentStatId: { type: String, default: '' },
    // Distance (km) for the "fastest Nk" card.
    fastestKm: { type: Number, default: 5 }
  },
  { timestamps: true }
);

export interface IFitnessDashboard {
  username: string;
  simpleStats: boolean;
  streak: boolean;
  weight: boolean;
  bodyFat: boolean;
  dietStats: boolean;
  muscleBalance: boolean;
  bodyParts: boolean;
  segmentStat: boolean;
  fastestK: boolean;
  ownPeriod: boolean;
  sharedPeriods: boolean;
  segmentStatIds?: string[];
  segmentStatId: string;
  fastestKm: number;
}

let _model: mongoose.Model<IFitnessDashboard>;
try {
  _model = mongoose.model<IFitnessDashboard>('FitnessDashboard');
} catch {
  _model = mongoose.model<IFitnessDashboard>('FitnessDashboard', FitnessDashboardSchema);
}
export const FitnessDashboard = _model;

/** Section keys, in dashboard order. */
export const DASHBOARD_KEYS = [
  'simpleStats',
  'segmentStat',
  'fastestK',
  'streak',
  'weight',
  'bodyFat',
  'dietStats',
  'muscleBalance',
  'bodyParts',
  'ownPeriod',
  'sharedPeriods'
] as const;
