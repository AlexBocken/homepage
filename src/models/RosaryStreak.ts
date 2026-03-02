import mongoose from 'mongoose';

const RosaryStreakSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    length: { type: Number, required: true, default: 0 },
    lastPrayed: { type: String, default: null } // ISO date string (YYYY-MM-DD)
  },
  { timestamps: true }
);

interface IRosaryStreak {
  username: string;
  length: number;
  lastPrayed: string | null;
}

let _model: mongoose.Model<IRosaryStreak>;
try { _model = mongoose.model<IRosaryStreak>("RosaryStreak"); } catch { _model = mongoose.model<IRosaryStreak>("RosaryStreak", RosaryStreakSchema); }
export const RosaryStreak = _model;
