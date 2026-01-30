import mongoose from 'mongoose';

const RosaryStreakSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    length: { type: Number, required: true, default: 0 },
    lastPrayed: { type: String, default: null } // ISO date string (YYYY-MM-DD)
  },
  { timestamps: true }
);

export const RosaryStreak = mongoose.models.RosaryStreak || mongoose.model("RosaryStreak", RosaryStreakSchema);
