import mongoose from 'mongoose';

/**
 * The calorie goal that was in force on one calendar day.
 *
 * The goal in `FitnessGoal` is the *current* one; adherence is a claim about the
 * past ("did I eat what I meant to on the 12th?"), so it has to be judged against
 * the number that was live back then. Reading the current goal instead makes every
 * historical day fail the moment the target moves — a cut→maintain switch would
 * reset a year of adherence to zero.
 *
 * One row per user per day. Written when food is first logged for a day, and
 * backfilled with the then-current goal for any logged day still missing one (see
 * $lib/server/dailyTargets), so a later goal change can't retroactively re-judge
 * days that were eaten under the old number.
 */
interface IDailyNutritionTarget {
  username: string;
  /** UTC-midnight of the *local* calendar day, same key as FoodLogEntry.date. */
  date: Date;
  dailyCalories: number;
}

const DailyNutritionTargetSchema = new mongoose.Schema<IDailyNutritionTarget>(
  {
    username: { type: String, required: true },
    date: { type: Date, required: true },
    dailyCalories: { type: Number, required: true, min: 500, max: 10000 },
  },
  { timestamps: true }
);

DailyNutritionTargetSchema.index({ username: 1, date: 1 }, { unique: true });

let _model: mongoose.Model<IDailyNutritionTarget>;
try { _model = mongoose.model<IDailyNutritionTarget>('DailyNutritionTarget'); }
catch { _model = mongoose.model<IDailyNutritionTarget>('DailyNutritionTarget', DailyNutritionTargetSchema); }
export const DailyNutritionTarget = _model;
export type { IDailyNutritionTarget };
