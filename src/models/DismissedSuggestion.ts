import mongoose from 'mongoose';

/**
 * A segment suggestion the user dismissed, keyed by a coarse hash of the route
 * geometry (start/end/mid rounded to the grid + distance bucket) so the same
 * corridor stays dismissed across grid rebuilds even if a different run sources
 * it next time.
 */
export interface IDismissedSuggestion {
  _id?: string;
  userId: string;
  routeHash: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const DismissedSuggestionSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, trim: true },
    routeHash: { type: String, required: true }
  },
  { timestamps: true }
);

DismissedSuggestionSchema.index({ userId: 1, routeHash: 1 }, { unique: true });

export const DismissedSuggestion: mongoose.Model<IDismissedSuggestion> =
  mongoose.models.DismissedSuggestion ||
  mongoose.model<IDismissedSuggestion>('DismissedSuggestion', DismissedSuggestionSchema);
