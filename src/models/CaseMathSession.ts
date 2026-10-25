import mongoose from 'mongoose';

/** A finished case-math sitting: the daily set, or a stretch of free drilling. */
export interface ICaseMathSession {
  username: string;
  mode: 'daily' | 'free';
  /** Local YYYY-MM-DD the session was done on (streaks and the heatmap key on it). */
  date: string;
  count: number;
  correct: number;
  durationMs: number;
  /** Skills whose level changed: skill id → [before, after]. */
  levelChanges: Map<string, [number, number]>;
  createdAt: Date;
}

const CaseMathSessionSchema = new mongoose.Schema<ICaseMathSession>(
  {
    username: { type: String, required: true },
    mode: { type: String, enum: ['daily', 'free'], required: true },
    date: { type: String, required: true },
    count: { type: Number, required: true },
    correct: { type: Number, required: true },
    durationMs: { type: Number, required: true },
    levelChanges: { type: Map, of: [Number], default: {} }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

CaseMathSessionSchema.index({ username: 1, date: -1 });

let _model: mongoose.Model<ICaseMathSession>;
try { _model = mongoose.model<ICaseMathSession>('CaseMathSession'); } catch { _model = mongoose.model<ICaseMathSession>('CaseMathSession', CaseMathSessionSchema); }
export const CaseMathSession = _model;
