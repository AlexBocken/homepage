import mongoose from 'mongoose';

const FavoriteIngredientSchema = new mongoose.Schema(
  {
    source: { type: String, enum: ['bls', 'usda'], required: true },
    sourceId: { type: String, required: true },
    name: { type: String, required: true },
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
);

FavoriteIngredientSchema.index({ createdBy: 1, source: 1, sourceId: 1 }, { unique: true });

interface IFavoriteIngredient {
  source: 'bls' | 'usda';
  sourceId: string;
  name: string;
  createdBy: string;
}

let _model: mongoose.Model<IFavoriteIngredient>;
try { _model = mongoose.model<IFavoriteIngredient>("FavoriteIngredient"); } catch { _model = mongoose.model<IFavoriteIngredient>("FavoriteIngredient", FavoriteIngredientSchema); }
export const FavoriteIngredient = _model;
