import mongoose from 'mongoose';

const RosaryStreakSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    length: { type: Number, required: true, default: 0 },
    lastPrayed: { type: String, default: null } // ISO date string (YYYY-MM-DD)
  },
  { timestamps: true }
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _model: any;
try { _model = mongoose.model("RosaryStreak"); } catch { _model = mongoose.model("RosaryStreak", RosaryStreakSchema); }
export const RosaryStreak = _model as mongoose.Model<any>;
