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
    ownPeriod: { type: Boolean, default: true },
    sharedPeriods: { type: Boolean, default: true }
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
  ownPeriod: boolean;
  sharedPeriods: boolean;
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
  'streak',
  'weight',
  'bodyFat',
  'dietStats',
  'muscleBalance',
  'bodyParts',
  'ownPeriod',
  'sharedPeriods'
] as const;
