import mongoose from 'mongoose';

export interface ICaseMathSkillLevel {
  level: number;
  /** When the skill reached this level; only later attempts count toward the next move. */
  since: Date;
}

/** Per-user case-math levels, one document per user. */
export interface ICaseMathProgress {
  username: string;
  skills: Map<string, ICaseMathSkillLevel>;
}

const SkillLevelSchema = new mongoose.Schema<ICaseMathSkillLevel>(
  {
    level: { type: Number, required: true, min: 1, max: 5 },
    since: { type: Date, required: true }
  },
  { _id: false }
);

const CaseMathProgressSchema = new mongoose.Schema<ICaseMathProgress>(
  {
    username: { type: String, required: true, unique: true },
    skills: { type: Map, of: SkillLevelSchema, default: {} }
  },
  { timestamps: true }
);

let _model: mongoose.Model<ICaseMathProgress>;
try { _model = mongoose.model<ICaseMathProgress>('CaseMathProgress'); } catch { _model = mongoose.model<ICaseMathProgress>('CaseMathProgress', CaseMathProgressSchema); }
export const CaseMathProgress = _model;
