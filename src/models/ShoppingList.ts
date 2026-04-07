import mongoose from 'mongoose';

export interface IShoppingItem {
  id: string;
  name: string;
  category: string;
  icon: string | null;
  checked: boolean;
  addedBy: string;
  checkedBy?: string;
  addedAt: Date;
}

export interface IShoppingList {
  _id?: string;
  version: number;
  items: IShoppingItem[];
  updatedAt?: Date;
}

const ShoppingItemSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true, trim: true },
  category: { type: String, default: 'Sonstiges' },
  icon: { type: String, default: null },
  checked: { type: Boolean, default: false },
  addedBy: { type: String, required: true, trim: true },
  checkedBy: { type: String, default: null },
  addedAt: { type: Date, default: () => new Date() }
}, { _id: false });

const ShoppingListSchema = new mongoose.Schema(
  {
    version: { type: Number, required: true, default: 0 },
    items: { type: [ShoppingItemSchema], default: [] }
  },
  { timestamps: true }
);

export const ShoppingList = mongoose.model<IShoppingList>('ShoppingList', ShoppingListSchema);
