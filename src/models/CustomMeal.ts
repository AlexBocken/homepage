import mongoose from 'mongoose';
import type { NutritionPer100g } from '$types/types';

/**
 * A custom meal is a named list of *references* into the base tables. Each
 * ingredient carries a frozen amount and portion choice; its nutrition is resolved
 * live from bls/usda/off on read (see $lib/server/foodLogComponents), so fixing a
 * source entry updates the meal everywhere — the editor and every future log — while
 * the composition the user built stays put. Logging a meal decomposes it into these
 * same leaves at log time.
 */
interface ICustomMealIngredient {
  name: string;
  source: 'bls' | 'usda' | 'off';
  sourceId: string;
  amountGrams: number;
  portions?: { description: string; grams: number }[];
  selectedPortion?: { description: string; grams: number };
  /** Resolved on read, never stored: the custom-meals API and resolveMeal() attach
   *  this from the live base tables so editors and lists can show nutrition. The
   *  schema has no per100g, so it is never persisted. */
  per100g?: NutritionPer100g;
}

interface ICustomMeal {
  _id?: string;
  name: string;
  ingredients: ICustomMealIngredient[];
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const PortionSchema = new mongoose.Schema({
  description: { type: String, required: true },
  grams: { type: Number, required: true },
}, { _id: false });

const IngredientSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  source: { type: String, enum: ['bls', 'usda', 'off'], required: true },
  sourceId: { type: String, required: true },
  amountGrams: { type: Number, required: true, min: 0 },
  portions: { type: [PortionSchema], default: undefined },
  selectedPortion: { type: PortionSchema, default: undefined },
}, { _id: false });

const CustomMealSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    ingredients: { type: [IngredientSchema], required: true, validate: [(v: any[]) => v.length > 0, 'At least one ingredient is required'] },
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
);

CustomMealSchema.index({ createdBy: 1 });

let _model: mongoose.Model<ICustomMeal>;
try { _model = mongoose.model<ICustomMeal>('CustomMeal'); } catch { _model = mongoose.model<ICustomMeal>('CustomMeal', CustomMealSchema); }
export const CustomMeal = _model;
export type { ICustomMeal, ICustomMealIngredient };
