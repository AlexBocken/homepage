import mongoose from 'mongoose';

const AngelusStreakSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    streak: { type: Number, required: true, default: 0 },
    lastComplete: { type: String, default: null }, // YYYY-MM-DD of last fully-completed day
    todayPrayed: { type: Number, required: true, default: 0 }, // bitmask: 1=morning, 2=noon, 4=evening
    todayDate: { type: String, default: null } // YYYY-MM-DD
  },
  { timestamps: true }
);

interface IAngelusStreak {
  username: string;
  streak: number;
  lastComplete: string | null;
  todayPrayed: number;
  todayDate: string | null;
}

let _model: mongoose.Model<IAngelusStreak>;
try { _model = mongoose.model<IAngelusStreak>("AngelusStreak"); } catch { _model = mongoose.model<IAngelusStreak>("AngelusStreak", AngelusStreakSchema); }
export const AngelusStreak = _model;
