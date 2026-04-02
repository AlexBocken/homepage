import mongoose from 'mongoose';

/**
 * Global nutrition overwrites — manually map ingredient names to BLS/USDA entries.
 * Checked during nutrition generation before embedding search.
 * Can also mark ingredients as excluded (skipped).
 */
const NutritionOverwriteSchema = new mongoose.Schema({
  // The normalized ingredient name this overwrite matches (German, lowercase)
  ingredientNameDe: { type: String, required: true },
  // Optional English name for display
  ingredientNameEn: { type: String },
  // What to map to
  source: { type: String, enum: ['bls', 'usda', 'skip'], required: true },
  fdcId: { type: Number },
  blsCode: { type: String },
  nutritionDbName: { type: String },
  // Whether this ingredient should be excluded from nutrition calculation
  excluded: { type: Boolean, default: false },
}, { timestamps: true });

NutritionOverwriteSchema.index({ ingredientNameDe: 1 }, { unique: true });

delete mongoose.models.NutritionOverwrite;
export const NutritionOverwrite = mongoose.model('NutritionOverwrite', NutritionOverwriteSchema);
