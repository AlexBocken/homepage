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

let _model: mongoose.Model<IOpenFoodFact>;
try { _model = mongoose.model<IOpenFoodFact>('OpenFoodFact'); } catch { _model = mongoose.model<IOpenFoodFact>('OpenFoodFact', OpenFoodFactSchema); }
export const OpenFoodFact = _model;
export type { IOpenFoodFact };
