import mongoose from 'mongoose';

const UserFavoritesSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Recipe' }] // Recipe MongoDB ObjectIds
  },
  { timestamps: true }
);

export const UserFavorites = mongoose.model("UserFavorites", UserFavoritesSchema);