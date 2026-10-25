import mongoose from 'mongoose';

/**
 * One answered case-math question. The question itself isn't stored: it is
 * regenerated from (skill, level, seed), so only what was typed and how long it
 * took need keeping.
 */
export interface ICaseMathAttempt {
  username: string;
  sessionId: mongoose.Types.ObjectId;
  mode: 'daily' | 'free';
  /** Local YYYY-MM-DD, from the session (weekly trends group on it). */
  date: string;
  skill: string;
  level: number;
  seed: number;
  given: string;
  correct: boolean;
  relErr: number | null;
  ms: number;
  createdAt: Date;
}

const CaseMathAttemptSchema = new mongoose.Schema<ICaseMathAttempt>({
  username: { type: String, required: true },
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'CaseMathSession', required: true },
  mode: { type: String, enum: ['daily', 'free'], required: true },
  date: { type: String, required: true },
  skill: { type: String, required: true },
  level: { type: Number, required: true, min: 1, max: 5 },
  seed: { type: Number, required: true },
  given: { type: String, default: '' },
  correct: { type: Boolean, required: true },
  relErr: { type: Number, default: null },
  ms: { type: Number, required: true, min: 0 },
  createdAt: { type: Date, required: true, default: Date.now }
});

CaseMathAttemptSchema.index({ username: 1, createdAt: -1 });
CaseMathAttemptSchema.index({ username: 1, skill: 1, createdAt: -1 });

let _model: mongoose.Model<ICaseMathAttempt>;
try { _model = mongoose.model<ICaseMathAttempt>('CaseMathAttempt'); } catch { _model = mongoose.model<ICaseMathAttempt>('CaseMathAttempt', CaseMathAttemptSchema); }
export const CaseMathAttempt = _model;
