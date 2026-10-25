import mongoose from 'mongoose';

export interface IShoppingItemCategory {
  normalizedName: string;
  originalName: string;
  category: string;
  icon: string | null;
  /**
   * 'manual' = set by a user in the edit dialog; these are the labels the
   * classifier trains on. 'auto' = an old cached guess (no longer written).
   */
  source: 'manual' | 'auto';
  /** e5 embedding of normalizedName, filled in by the classifier's training */
  embedding?: number[];
  /** Model that produced `embedding`; a different one means it gets recomputed */
  embeddingModel?: string;
}

const ShoppingItemCategorySchema = new mongoose.Schema(
  {
    normalizedName: { type: String, required: true, unique: true, index: true },
    originalName: { type: String, required: true },
    category: { type: String, required: true },
    icon: { type: String, default: null },
    source: { type: String, enum: ['manual', 'auto'], default: 'auto', index: true },
    embedding: { type: [Number], default: undefined },
    embeddingModel: { type: String },
  },
  { timestamps: true }
);

export const ShoppingItemCategory =
  mongoose.models.ShoppingItemCategory ||
  mongoose.model<IShoppingItemCategory>('ShoppingItemCategory', ShoppingItemCategorySchema);
