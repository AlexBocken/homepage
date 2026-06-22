import mongoose from 'mongoose';

/**
 * Per-user spatial-frequency grid for auto-detecting segments. Each document is
 * one ~30 m cell + bearing octant; `runIds` is the set of the user's GPS runs
 * that passed through it (in that direction), so `count` = how often the user
 * repeats that bit of route. Popular contiguous cells get stitched into
 * suggested segments. Maintained incrementally on run save / snap / delete and
 * rebuildable in bulk.
 */
export interface ISegmentGridCell {
  _id?: string;
  userId: string;
  cellKey: string; // `${latGrid}:${lngGrid}:${octant}`
  lat: number; // representative coords (a contributing point), for preview/stitch
  lng: number;
  runIds: string[]; // distinct session ids touching this cell
  count: number; // = runIds.length, denormalized for indexed "popular" queries
  createdAt?: Date;
  updatedAt?: Date;
}

const SegmentGridCellSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, trim: true },
    cellKey: { type: String, required: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    runIds: { type: [String], default: [] },
    count: { type: Number, default: 0 }
  },
  { timestamps: true }
);

// One document per (user, cell); upserts key on this.
SegmentGridCellSchema.index({ userId: 1, cellKey: 1 }, { unique: true });
// "Popular cells for a user" scans.
SegmentGridCellSchema.index({ userId: 1, count: -1 });
// Cascade by run on delete/snap.
SegmentGridCellSchema.index({ userId: 1, runIds: 1 });

export const SegmentGridCell: mongoose.Model<ISegmentGridCell> =
  mongoose.models.SegmentGridCell ||
  mongoose.model<ISegmentGridCell>('SegmentGridCell', SegmentGridCellSchema);
