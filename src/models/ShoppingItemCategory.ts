import mongoose from 'mongoose';

export interface IShoppingItemCategory {
  normalizedName: string;
  originalName: string;
  category: string;
  icon: string | null;
}

const ShoppingItemCategorySchema = new mongoose.Schema(
  {
    normalizedName: { type: String, required: true, unique: true, index: true },
    originalName: { type: String, required: true },
    category: { type: String, required: true },
    icon: { type: String, default: null },
  },
  { timestamps: true }
);

export const ShoppingItemCategory =
  mongoose.models.ShoppingItemCategory ||
  mongoose.model<IShoppingItemCategory>('ShoppingItemCategory', ShoppingItemCategorySchema);
