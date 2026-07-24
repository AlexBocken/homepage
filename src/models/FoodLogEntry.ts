import mongoose from 'mongoose';

/**
 * A diary entry is a set of *references* into the base tables, not a snapshot of
 * their numbers. Each component is a leaf (bls/usda/off) with a frozen amount; the
 * per-100 g nutrition is resolved live on read (see $lib/server/foodLogComponents),
 * so a fix to a source entry reaches every day it was logged. Recipes and custom
 * meals are decomposed into their leaves at log time — `loggedAs` remembers what the
 * row should still display as, and its `refId` links back to that meal/recipe.
 *
 * The top-level amount is derived (Σ component amounts) and deliberately not stored.
 */
interface ILeafRef {
  // 'frozen' is a migration-only fallback carrying an inline `per100g` snapshot for
  // entries whose meal/recipe was edited beyond reconstruction; see foodLogComponents.
  source: 'bls' | 'usda' | 'off' | 'frozen';
  sourceId: string;
  /** Grams of this leaf, frozen at log time. */
  amountGrams: number;
  /** Portion choices offered when this was logged, so editing can re-offer them. */
  portions?: { description: string; grams: number }[];
  /** The portion basis the user picked, if any. Never used for nutrition math. */
  selectedPortion?: { description: string; grams: number };
  /** Only for `frozen` leaves: the historical blended nutrition, stored inline
   *  because the composition it came from can no longer be resolved. */
  per100g?: Record<string, number>;
}

interface IFoodLogEntry {
  _id?: string;
  date: Date;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'water';
  name: string;
  /** The frozen composition. Always ≥1 leaf; a plain food is a single leaf, a
   *  meal/recipe its decomposition. */
  components: ILeafRef[];
  /** What the row was logged as, for its badge, detail link and "log again".
   *  `refId` is the meal/recipe ObjectId (absent for a plain food). */
  loggedAs: { kind: 'food' | 'custom' | 'recipe'; refId?: mongoose.Types.ObjectId };
  liquidMl?: number;
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const PortionSchema = new mongoose.Schema({
  description: { type: String, required: true },
  grams: { type: Number, required: true },
}, { _id: false });

const LeafRefSchema = new mongoose.Schema({
  source: { type: String, enum: ['bls', 'usda', 'off', 'frozen'], required: true },
  sourceId: { type: String, required: true },
  amountGrams: { type: Number, required: true, min: 0 },
  portions: { type: [PortionSchema], default: undefined },
  selectedPortion: { type: PortionSchema, default: undefined },
  // Inline nutrition for `frozen` leaves only (migration fallback). Mixed rather than
  // the full nutrient schema because it is an opaque historical blob, never edited.
  per100g: { type: mongoose.Schema.Types.Mixed, default: undefined },
}, { _id: false });

const LoggedAsSchema = new mongoose.Schema({
  kind: { type: String, enum: ['food', 'custom', 'recipe'], required: true },
  refId: { type: mongoose.Schema.Types.ObjectId },
}, { _id: false });

const FoodLogEntrySchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    mealType: { type: String, enum: ['breakfast', 'lunch', 'dinner', 'snack', 'water'], required: true },
    name: { type: String, required: true, trim: true },
    components: {
      type: [LeafRefSchema],
      required: true,
      validate: [(v: any[]) => Array.isArray(v) && v.length > 0, 'At least one component is required'],
    },
    loggedAs: { type: LoggedAsSchema, required: true },
    liquidMl: { type: Number, min: 0 },
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
);

FoodLogEntrySchema.index({ createdBy: 1, date: -1 });

let _model: mongoose.Model<IFoodLogEntry>;
try { _model = mongoose.model<IFoodLogEntry>('FoodLogEntry'); } catch { _model = mongoose.model<IFoodLogEntry>('FoodLogEntry', FoodLogEntrySchema); }
export const FoodLogEntry = _model;
export type { IFoodLogEntry, ILeafRef };
