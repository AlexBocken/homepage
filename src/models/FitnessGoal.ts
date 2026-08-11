import mongoose from 'mongoose';

const FitnessGoalSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    weeklyWorkouts: { type: Number, required: true, default: 4, min: 1, max: 14 },
    sex: { type: String, enum: ['male', 'female'], default: 'male' },
    heightCm: { type: Number, min: 100, max: 250 },
    birthYear: { type: Number, min: 1900, max: 2020 },
    activityLevel: { type: String, enum: ['sedentary', 'light', 'moderate', 'very_active'], default: 'light' },
    dailyCalories: { type: Number, min: 500, max: 10000 },
    proteinMode: { type: String, enum: ['fixed', 'per_kg'] },
    proteinTarget: { type: Number, min: 0 },
    fatPercent: { type: Number, min: 0, max: 100 },
    carbPercent: { type: Number, min: 0, max: 100 },
    shareSegments: { type: Boolean, default: true }, // cross-user segment leaderboards (opt-out)
    // Body-composition targets behind the arrival forecast on the body-trends
    // page. Each is optional and independent — you can chase a weight without
    // committing to a body-fat number — and one shared date carries the deadline,
    // since they describe the same body over the same stretch of time.
    targetWeightKg: { type: Number, min: 30, max: 300 },
    targetBodyFatPercent: { type: Number, min: 3, max: 60 },
    targetFatMassKg: { type: Number, min: 1, max: 150 },
    targetDate: { type: Date },
  },
  { timestamps: true }
);

interface IFitnessGoal {
  username: string;
  weeklyWorkouts: number;
  sex?: 'male' | 'female';
  heightCm?: number;
  birthYear?: number;
  activityLevel?: 'sedentary' | 'light' | 'moderate' | 'very_active';
  dailyCalories?: number;
  proteinMode?: 'fixed' | 'per_kg';
  proteinTarget?: number;
  fatPercent?: number;
  carbPercent?: number;
  shareSegments?: boolean;
  targetWeightKg?: number;
  targetBodyFatPercent?: number;
  targetFatMassKg?: number;
  targetDate?: Date;
}

let _model: mongoose.Model<IFitnessGoal>;
try { _model = mongoose.model<IFitnessGoal>("FitnessGoal"); } catch { _model = mongoose.model<IFitnessGoal>("FitnessGoal", FitnessGoalSchema); }
export const FitnessGoal = _model;
