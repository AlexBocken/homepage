import mongoose from 'mongoose';

interface IFoodLogEntry {
  _id?: string;
  date: Date;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'water';
  name: string;
  source: 'bls' | 'usda' | 'recipe' | 'custom' | 'off';
  sourceId?: string;
  amountGrams: number;
  per100g: {
    calories: number; protein: number; fat: number; saturatedFat: number;
    carbs: number; fiber: number; sugars: number;
    calcium: number; iron: number; magnesium: number; phosphorus: number;
    potassium: number; sodium: number; zinc: number;
    vitaminA: number; vitaminC: number; vitaminD: number; vitaminE: number;
    vitaminK: number; thiamin: number; riboflavin: number; niacin: number;
    vitaminB6: number; vitaminB12: number; folate: number; cholesterol: number;
    isoleucine?: number; leucine?: number; lysine?: number; methionine?: number;
    phenylalanine?: number; threonine?: number; tryptophan?: number; valine?: number;
    histidine?: number; alanine?: number; arginine?: number; asparticAcid?: number;
    cysteine?: number; glutamicAcid?: number; glycine?: number; proline?: number;
    serine?: number; tyrosine?: number;
  };
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const NutritionSnapshotSchema = new mongoose.Schema({
  calories: Number, protein: Number, fat: Number, saturatedFat: Number,
  carbs: Number, fiber: Number, sugars: Number,
  calcium: Number, iron: Number, magnesium: Number, phosphorus: Number,
  potassium: Number, sodium: Number, zinc: Number,
  vitaminA: Number, vitaminC: Number, vitaminD: Number, vitaminE: Number,
  vitaminK: Number, thiamin: Number, riboflavin: Number, niacin: Number,
  vitaminB6: Number, vitaminB12: Number, folate: Number, cholesterol: Number,
  isoleucine: Number, leucine: Number, lysine: Number, methionine: Number,
  phenylalanine: Number, threonine: Number, tryptophan: Number, valine: Number,
  histidine: Number, alanine: Number, arginine: Number, asparticAcid: Number,
  cysteine: Number, glutamicAcid: Number, glycine: Number, proline: Number,
  serine: Number, tyrosine: Number,
}, { _id: false });

const FoodLogEntrySchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    mealType: { type: String, enum: ['breakfast', 'lunch', 'dinner', 'snack', 'water'], required: true },
    name: { type: String, required: true, trim: true },
    source: { type: String, enum: ['bls', 'usda', 'recipe', 'custom', 'off'], required: true },
    sourceId: { type: String },
    amountGrams: { type: Number, required: true, min: 0 },
    per100g: { type: NutritionSnapshotSchema, required: true },
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
);

FoodLogEntrySchema.index({ createdBy: 1, date: -1 });

let _model: mongoose.Model<IFoodLogEntry>;
try { _model = mongoose.model<IFoodLogEntry>('FoodLogEntry'); } catch { _model = mongoose.model<IFoodLogEntry>('FoodLogEntry', FoodLogEntrySchema); }
export const FoodLogEntry = _model;
export type { IFoodLogEntry };
