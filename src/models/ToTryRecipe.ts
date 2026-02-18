import mongoose from 'mongoose';

const ToTryRecipeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    links: [
      {
        url: { type: String, required: true },
        label: { type: String, default: '' }
      }
    ],
    notes: { type: String, default: '' },
    addedBy: { type: String, required: true }
  },
  { timestamps: true }
);

export const ToTryRecipe = mongoose.model('ToTryRecipe', ToTryRecipeSchema);
