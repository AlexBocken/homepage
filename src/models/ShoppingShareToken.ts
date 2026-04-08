import mongoose from 'mongoose';

export interface IShoppingShareToken {
  token: string;
  expiresAt: Date;
  createdBy: string;
}

const ShoppingShareTokenSchema = new mongoose.Schema(
  {
    token: { type: String, required: true, unique: true, index: true },
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
);

export const ShoppingShareToken =
  mongoose.models.ShoppingShareToken ||
  mongoose.model<IShoppingShareToken>('ShoppingShareToken', ShoppingShareTokenSchema);
