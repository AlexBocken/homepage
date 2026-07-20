import mongoose from 'mongoose';

interface IOpenFoodFact {
  barcode: string;
  name: string;
  nameDe?: string;
  brands?: string;
  category?: string;
  nutriscore?: string;
  productQuantityG?: number;
  serving?: { description: string; grams: number };
  per100g: {
    calories: number; protein: number; fat: number; saturatedFat?: number;
    carbs: number; fiber?: number; sugars?: number;
    calcium?: number; iron?: number; magnesium?: number; phosphorus?: number;
    potassium?: number; sodium?: number; zinc?: number;
    vitaminA?: number; vitaminC?: number; vitaminD?: number; vitaminE?: number;
    vitaminK?: number; thiamin?: number; riboflavin?: number; niacin?: number;
    vitaminB6?: number; vitaminB12?: number; folate?: number; cholesterol?: number;
    // Fatty acids (g/100g). OFF publishes omega3/omega6 as totals far more often
    // than it publishes the individual acids, so both forms are stored and the
    // read path prefers the breakdown when it exists.
    monounsaturatedFat?: number; polyunsaturatedFat?: number; transFat?: number;
    linoleicAcid?: number; alphaLinolenicAcid?: number; gammaLinolenicAcid?: number;
    arachidonicAcid?: number; epa?: number; dpa?: number; dha?: number;
    stearidonicAcid?: number; eicosadienoicAcid?: number; dihomoGammaLinolenicAcid?: number;
    omega3?: number; omega6?: number;
  };
}

const ServingSchema = new mongoose.Schema({
  description: String,
  grams: Number,
}, { _id: false });

const Per100gSchema = new mongoose.Schema({
  calories: Number, protein: Number, fat: Number, saturatedFat: Number,
  carbs: Number, fiber: Number, sugars: Number,
  calcium: Number, iron: Number, magnesium: Number, phosphorus: Number,
  potassium: Number, sodium: Number, zinc: Number,
  vitaminA: Number, vitaminC: Number, vitaminD: Number, vitaminE: Number,
  vitaminK: Number, thiamin: Number, riboflavin: Number, niacin: Number,
  vitaminB6: Number, vitaminB12: Number, folate: Number, cholesterol: Number,
  monounsaturatedFat: Number, polyunsaturatedFat: Number, transFat: Number,
  linoleicAcid: Number, alphaLinolenicAcid: Number, gammaLinolenicAcid: Number,
  arachidonicAcid: Number, epa: Number, dpa: Number, dha: Number,
  stearidonicAcid: Number, eicosadienoicAcid: Number, dihomoGammaLinolenicAcid: Number,
  omega3: Number, omega6: Number,
}, { _id: false });

const OpenFoodFactSchema = new mongoose.Schema({
  barcode: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  nameDe: String,
  brands: String,
  category: String,
  nutriscore: String,
  productQuantityG: Number,
  serving: ServingSchema,
  per100g: { type: Per100gSchema, required: true },
}, { collection: 'openfoodfacts' });

OpenFoodFactSchema.index({ name: 'text', nameDe: 'text', brands: 'text' });

let _model: mongoose.Model<IOpenFoodFact>;
try { _model = mongoose.model<IOpenFoodFact>('OpenFoodFact'); } catch { _model = mongoose.model<IOpenFoodFact>('OpenFoodFact', OpenFoodFactSchema); }
export const OpenFoodFact = _model;
export type { IOpenFoodFact };
