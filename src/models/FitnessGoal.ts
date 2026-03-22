import mongoose from 'mongoose';

const FitnessGoalSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    weeklyWorkouts: { type: Number, required: true, default: 4, min: 1, max: 14 }
  },
  { timestamps: true }
);

interface IFitnessGoal {
  username: string;
  weeklyWorkouts: number;
}

let _model: mongoose.Model<IFitnessGoal>;
try { _model = mongoose.model<IFitnessGoal>("FitnessGoal"); } catch { _model = mongoose.model<IFitnessGoal>("FitnessGoal", FitnessGoalSchema); }
export const FitnessGoal = _model;
