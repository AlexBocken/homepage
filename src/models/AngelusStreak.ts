import mongoose from 'mongoose';

const AngelusStreakSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    streak: { type: Number, required: true, default: 0 },
    lastComplete: { type: String, default: null }, // local YYYY-MM-DD of last fully-completed day
    lastCompleteTs: { type: Number, default: null }, // epoch ms for timezone-safe streak checks
    todayPrayed: { type: Number, required: true, default: 0 }, // bitmask: 1=morning, 2=noon, 4=evening
    todayDate: { type: String, default: null } // local YYYY-MM-DD
  },
  { timestamps: true }
);

interface IAngelusStreak {
  username: string;
  streak: number;
  lastComplete: string | null;
  lastCompleteTs: number | null;
  todayPrayed: number;
  todayDate: string | null;
}

let _model: mongoose.Model<IAngelusStreak>;
try { _model = mongoose.model<IAngelusStreak>("AngelusStreak"); } catch { _model = mongoose.model<IAngelusStreak>("AngelusStreak", AngelusStreakSchema); }
export const AngelusStreak = _model;
