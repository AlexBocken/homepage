import mongoose from 'mongoose';

/**
 * Global barcode → BLS/USDA mappings.
 *
 * Open Food Facts entries are crowd-sourced and usually carry only the big four
 * macros, so a scanned product shows far less than the BLS/USDA record for the
 * same food (no micros, no fat or amino-acid splits). An override says "this
 * barcode is really this BLS/USDA entry", and every path that turns a barcode
 * into a food honours it: the scanner, text search, and the food detail page.
 *
 * Overrides are shared by everyone and any logged-in user may set one — the
 * /api/nutrition surface is login-gated but needs no group.
 *
 * Deliberately *not* applied when resolving diary leaves: a log entry that was
 * written as `off` stays on OFF's numbers, so past days never shift underneath
 * the user. Selecting an overridden barcode writes a `bls`/`usda` leaf instead,
 * so the mapping takes effect from that log forward.
 *
 * Many barcodes may point at one BLS/USDA entry (every size and flavour of a
 * product can share a record), hence the unique index on `barcode` alone.
 */
const BarcodeNutritionOverrideSchema = new mongoose.Schema(
	{
		/** The scanned code. Unique — one mapping per barcode. */
		barcode: { type: String, required: true },
		source: { type: String, enum: ['bls', 'usda'], required: true },
		/** Set when source is 'bls'. */
		blsCode: { type: String },
		/** Set when source is 'usda'. */
		fdcId: { type: Number },
		/** Resolved name at mapping time — for the admin list only, never for display. */
		targetName: { type: String },
		/** Authentik nickname of whoever set it, so a bad mapping can be traced. */
		createdByNickname: { type: String },
	},
	{ timestamps: true }
);

BarcodeNutritionOverrideSchema.index({ barcode: 1 }, { unique: true });

delete mongoose.models.BarcodeNutritionOverride;
export const BarcodeNutritionOverride = mongoose.model(
	'BarcodeNutritionOverride',
	BarcodeNutritionOverrideSchema
);
