import mongoose from 'mongoose';

interface ICustomMealIngredient {
  name: string;
  source: 'bls' | 'usda' | 'custom' | 'off';
  sourceId?: string;
  amountGrams: number;
  portions?: { description: string; grams: number }[];
  selectedPortion?: { description: string; grams: number };
  per100g: {
    calories: number; protein: number; fat: number; saturatedFat: number;
    carbs: number; fiber: number; sugars: number;
    calcium: number; iron: number; magnesium: number; phosphorus: number;
    potassium: number; sodium: number; zinc: number;
    // Trace minerals — optional, see $lib/fitness/traceMinerals.
    copper?: number; manganese?: number; iodine?: number;
    selenium?: number; chromium?: number; molybdenum?: number;
    vitaminA: number; vitaminC: number; vitaminD: number; vitaminE: number;
    vitaminK: number; thiamin: number; riboflavin: number; niacin: number;
    vitaminB6: number; vitaminB12: number; folate: number; cholesterol: number;
    // Fatty acids (g/100g) — see $lib/fitness/fattyAcids for how totals are derived.
    monounsaturatedFat?: number; polyunsaturatedFat?: number; transFat?: number;
    linoleicAcid?: number; alphaLinolenicAcid?: number; gammaLinolenicAcid?: number;
    arachidonicAcid?: number; epa?: number; dpa?: number; dha?: number;
    stearidonicAcid?: number; eicosadienoicAcid?: number; dihomoGammaLinolenicAcid?: number;
    omega3?: number; omega6?: number;
    isoleucine?: number; leucine?: number; lysine?: number; methionine?: number;
    phenylalanine?: number; threonine?: number; tryptophan?: number; valine?: number;
    histidine?: number; alanine?: number; arginine?: number; asparticAcid?: number;
    cysteine?: number; glutamicAcid?: number; glycine?: number; proline?: number;
    serine?: number; tyrosine?: number;
  };
}

interface ICustomMeal {
  _id?: string;
  name: string;
  ingredients: ICustomMealIngredient[];
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const NutritionSnapshotSchema = new mongoose.Schema({
  calories: Number, protein: Number, fat: Number, saturatedFat: Number,
  carbs: Number, fiber: Number, sugars: Number,
  calcium: Number, iron: Number, magnesium: Number, phosphorus: Number,
  potassium: Number, sodium: Number, zinc: Number,
  copper: Number, manganese: Number, iodine: Number,
  selenium: Number, chromium: Number, molybdenum: Number,
  vitaminA: Number, vitaminC: Number, vitaminD: Number, vitaminE: Number,
  vitaminK: Number, thiamin: Number, riboflavin: Number, niacin: Number,
  vitaminB6: Number, vitaminB12: Number, folate: Number, cholesterol: Number,
  monounsaturatedFat: Number, polyunsaturatedFat: Number, transFat: Number,
  linoleicAcid: Number, alphaLinolenicAcid: Number, gammaLinolenicAcid: Number,
  arachidonicAcid: Number, epa: Number, dpa: Number, dha: Number,
  stearidonicAcid: Number, eicosadienoicAcid: Number, dihomoGammaLinolenicAcid: Number,
  omega3: Number, omega6: Number,
  isoleucine: Number, leucine: Number, lysine: Number, methionine: Number,
  phenylalanine: Number, threonine: Number, tryptophan: Number, valine: Number,
  histidine: Number, alanine: Number, arginine: Number, asparticAcid: Number,
  cysteine: Number, glutamicAcid: Number, glycine: Number, proline: Number,
  serine: Number, tyrosine: Number,
}, { _id: false });

const PortionSchema = new mongoose.Schema({
  description: { type: String, required: true },
  grams: { type: Number, required: true },
}, { _id: false });

const IngredientSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  source: { type: String, enum: ['bls', 'usda', 'custom', 'off'], required: true },
  sourceId: { type: String },
  amountGrams: { type: Number, required: true, min: 0 },
  portions: { type: [PortionSchema], default: undefined },
  selectedPortion: { type: PortionSchema, default: undefined },
  per100g: { type: NutritionSnapshotSchema, required: true },
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
