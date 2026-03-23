import mongoose from 'mongoose';

const FitnessGoalSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    weeklyWorkouts: { type: Number, required: true, default: 4, min: 1, max: 14 },
    sex: { type: String, enum: ['male', 'female'], default: 'male' },
    heightCm: { type: Number, min: 100, max: 250 }
  },
  { timestamps: true }
);

interface IFitnessGoal {
  username: string;
  weeklyWorkouts: number;
  sex?: 'male' | 'female';
  heightCm?: number;
}

let _model: mongoose.Model<IFitnessGoal>;
try { _model = mongoose.model<IFitnessGoal>("FitnessGoal"); } catch { _model = mongoose.model<IFitnessGoal>("FitnessGoal", FitnessGoalSchema); }
export const FitnessGoal = _model;
