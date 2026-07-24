import mongoose from 'mongoose';

interface IFoodLogEntry {
  _id?: string;
  date: Date;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'water';
  name: string;
  source: 'bls' | 'usda' | 'recipe' | 'custom' | 'off';
  sourceId?: string;
  /**
   * The canonical consumed amount. Every nutrition figure derives from this and
   * `per100g` — `selectedPortion` is only a display lens over it (see
   * $lib/fitness/portions).
   */
  amountGrams: number;
  /** Portion choices offered when this was logged, so editing can re-offer them. */
  portions?: { description: string; grams: number }[];
  /** The portion basis the user picked, if any. Never used for nutrition math. */
  selectedPortion?: { description: string; grams: number };
  per100g: {
    calories: number; protein: number; fat: number; saturatedFat: number;
    carbs: number; fiber: number; sugars: number;
    calcium: number; iron: number; magnesium: number; phosphorus: number;
    potassium: number; sodium: number; zinc: number;
    // Trace minerals. Optional: no source carries all six, and an absent key means
    // "not measured" — see $lib/fitness/traceMinerals.
    copper?: number; manganese?: number; iodine?: number;
    selenium?: number; chromium?: number; molybdenum?: number;
    vitaminA: number; vitaminC: number; vitaminD: number; vitaminE: number;
    vitaminK: number; thiamin: number; riboflavin: number; niacin: number;
    vitaminB6: number; vitaminB12: number; folate: number; cholesterol: number;
    // Fatty acids (g/100g). Individual acids are stored as measured; omega-3 and
    // omega-6 totals are summed on read ($lib/fitness/fattyAcids), except for OFF
    // records that publish only a total — those land in omega3/omega6.
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
  liquidMl?: number;
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

const FoodLogEntrySchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    mealType: { type: String, enum: ['breakfast', 'lunch', 'dinner', 'snack', 'water'], required: true },
    name: { type: String, required: true, trim: true },
    source: { type: String, enum: ['bls', 'usda', 'recipe', 'custom', 'off'], required: true },
    sourceId: { type: String },
    amountGrams: { type: Number, required: true, min: 0 },
    portions: { type: [PortionSchema], default: undefined },
    selectedPortion: { type: PortionSchema, default: undefined },
    per100g: { type: NutritionSnapshotSchema, required: true },
    liquidMl: { type: Number, min: 0 },
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
);

FoodLogEntrySchema.index({ createdBy: 1, date: -1 });

let _model: mongoose.Model<IFoodLogEntry>;
try { _model = mongoose.model<IFoodLogEntry>('FoodLogEntry'); } catch { _model = mongoose.model<IFoodLogEntry>('FoodLogEntry', FoodLogEntrySchema); }
export const FoodLogEntry = _model;
export type { IFoodLogEntry };
