/**
 * Repair the per-100 g snapshots stored on food log entries and custom meals.
 *
 * A logged entry keeps its own copy of the food's nutrition rather than a pointer
 * to the table, so that editing or re-importing a source can never rewrite what a
 * diary says you ate. The cost is that a snapshot cannot benefit from a later fix
 * to the tables — which is what this script is for. It does two independent jobs,
 * each skippable, and both are idempotent.
 *
 * PHASE A — trace minerals (`--traces`)
 *   Copper, manganese, iodine, selenium, chromium and molybdenum were added to the
 *   importers after these entries were logged, so their snapshots have none of
 *   them. Every BLS/USDA-sourced snapshot is re-read from the regenerated tables
 *   and the missing trace keys are filled in. Nothing else is touched: an existing
 *   figure is left exactly as logged, even where the table now disagrees.
 *
 * PHASE B — Open Food Facts units (`--off-units`)
 *   OFF normalises every nutriment except energy to grams per 100 g, including the
 *   ones a label states in mg or µg. Until offPer100gToAppUnits() was introduced,
 *   OFF products were logged with those raw gram figures, so their micronutrients
 *   read a thousandth (minerals) or a millionth (µg vitamins) of the truth. Each
 *   affected snapshot is rescaled.
 *
 *   Whether a snapshot is already correct is decided by comparing it against the
 *   mirrored OFF document, not by guessing from magnitude: at ratio ~1 it is still
 *   in OFF's units and needs converting, at ~1000/1e6 it was written after the fix
 *   and is left alone. An entry whose product is no longer in the mirror cannot be
 *   judged that way and is reported instead — pass --force-off-legacy to convert
 *   those too, which is right only if they predate the fix.
 *
 * Run AFTER regenerating the tables Phase A reads:
 *   pnpm exec vite-node scripts/import-bls-nutrition.ts
 *   pnpm exec vite-node scripts/import-usda-nutrition.ts
 *
 * Dry run (default — prints the plan, writes nothing):
 *   pnpm exec vite-node scripts/backfill-nutrition-snapshots.ts
 * Apply:
 *   pnpm exec vite-node scripts/backfill-nutrition-snapshots.ts --apply
 * One phase only:
 *   pnpm exec vite-node scripts/backfill-nutrition-snapshots.ts --traces --apply
 * Against production (from the server, or through an SSH tunnel):
 *   MONGO_URL='mongodb://…' pnpm exec vite-node scripts/backfill-nutrition-snapshots.ts --apply
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import mongoose from 'mongoose';
import { BLS_DB } from '../src/lib/data/blsDb';
import { NUTRITION_DB } from '../src/lib/data/nutritionDb';
import { TRACE_MINERAL_KEYS } from '../src/lib/fitness/traceMinerals';
// The same scale table the app converts with, so the two cannot drift apart.
import { OFF_UNIT_SCALE, offPer100gToAppUnits } from '../src/lib/fitness/offUnits';

const APPLY = process.argv.includes('--apply');
const FORCE_OFF_LEGACY = process.argv.includes('--force-off-legacy');
// Naming a phase runs only that one; naming neither runs both.
const only = { traces: process.argv.includes('--traces'), offUnits: process.argv.includes('--off-units') };
const RUN_TRACES = only.traces || !only.offUnits;
const RUN_OFF_UNITS = only.offUnits || !only.traces;

function mongoUrl(): string {
	// An explicit env var wins, so the same script can be aimed at production
	// without editing the dev .env.
	if (process.env.MONGO_URL) return process.env.MONGO_URL;
	const envPath = resolve(import.meta.dirname ?? '.', '..', '.env');
	const m = readFileSync(envPath, 'utf-8').match(/^MONGO_URL="?([^"\n]+)"?/m);
	if (!m) {
		console.error('MONGO_URL not set and not found in .env');
		process.exit(1);
	}
	return m[1];
}

const blsByCode = new Map(BLS_DB.map(e => [e.blsCode, e]));
const usdaByFdcId = new Map(NUTRITION_DB.map(e => [e.fdcId, e]));

type Per100g = Record<string, number>;

/** The table figures for a snapshot's source, or null if it no longer resolves. */
function tableEntry(source: string, sourceId: string): Per100g | null {
	if (source === 'bls') return (blsByCode.get(sourceId)?.per100g as Per100g) ?? null;
	if (source === 'usda') return (usdaByFdcId.get(Number(sourceId))?.per100g as Per100g) ?? null;
	return null;
}

/** Trace keys the table has and the snapshot lacks, as a $set-shaped patch. */
function tracePatch(snapshot: Per100g, table: Per100g, prefix: string): Record<string, number> {
	const patch: Record<string, number> = {};
	for (const k of TRACE_MINERAL_KEYS) {
		if (typeof snapshot?.[k] === 'number') continue; // logged figure wins, always
		const v = table[k];
		if (typeof v === 'number') patch[`${prefix}${k}`] = v;
	}
	return patch;
}

type OffVerdict =
	| { kind: 'convert' }
	| { kind: 'already' }
	| { kind: 'nothing' }
	| { kind: 'unknown'; why: string };

/**
 * Decide whether a snapshot still holds OFF's raw grams by measuring it against the
 * mirrored product. A key that is zero on either side proves nothing — 0 × 1000 is
 * still 0 — so the first key that carries a real figure on both sides decides.
 */
function offVerdict(snapshot: Per100g, mirror: Per100g | null): OffVerdict {
	// A product that declares nothing scalable, or declares it all as zero, reads the
	// same in either convention — 0 × 1000 is 0. Nothing to do and nothing to judge.
	const hasScalable = Object.keys(OFF_UNIT_SCALE)
		.some(k => typeof snapshot?.[k] === 'number' && snapshot[k] !== 0);
	if (!hasScalable) return { kind: 'nothing' };

	if (!mirror) return { kind: 'unknown', why: 'product not in the local OFF mirror' };
	for (const [k, scale] of Object.entries(OFF_UNIT_SCALE)) {
		const a = snapshot?.[k];
		const b = mirror?.[k];
		if (typeof a !== 'number' || typeof b !== 'number' || a === 0 || b === 0) continue;
		const ratio = a / b;
		if (ratio > 0.5 && ratio < 2) return { kind: 'convert' };
		if (ratio > scale * 0.5 && ratio < scale * 2) return { kind: 'already' };
		return { kind: 'unknown', why: `${k} is ${ratio.toExponential(1)}× the mirror's figure` };
	}
	// Non-zero here but never alongside a non-zero mirror figure: the product changed
	// or the entry was hand-edited, so the scale cannot be established.
	return { kind: 'unknown', why: 'no micronutrient is non-zero in both the entry and the mirror' };
}

/**
 * The rescaled figures, or null when nothing in the snapshot needs scaling. Only
 * the keys that change are written: a zero is already the same in both conventions,
 * and rewriting untouched macros would churn every document for nothing.
 */
function offUnitPatch(snapshot: Per100g, prefix: string): Record<string, number> | null {
	const converted = offPer100gToAppUnits(snapshot);
	const patch: Record<string, number> = {};
	for (const k of Object.keys(OFF_UNIT_SCALE)) {
		const before = snapshot?.[k];
		if (typeof before !== 'number' || Number.isNaN(before) || before === 0) continue;
		patch[`${prefix}${k}`] = converted[k];
	}
	return Object.keys(patch).length > 0 ? patch : null;
}

async function main() {
	console.log('=== Backfill nutrition snapshots ===');
	console.log(`Phases: ${[RUN_TRACES && 'trace minerals', RUN_OFF_UNITS && 'OFF units'].filter(Boolean).join(' + ')}`);
	console.log(APPLY ? 'MODE: APPLY (writing)\n' : 'MODE: dry run (pass --apply to write)\n');

	await mongoose.connect(mongoUrl(), { serverSelectionTimeoutMS: 10000 });
	const db = mongoose.connection.db!;
	const logs = db.collection('foodlogentries');
	const meals = db.collection('custommeals');
	const off = db.collection('openfoodfacts');

	// ---------------------------------------------------------------- phase A
	if (RUN_TRACES) {
		console.log('--- Trace minerals ---');
		let entriesPatched = 0, entriesUnresolved = 0, keysAdded = 0;
		const unresolved = new Map<string, number>();

		for (const e of await logs.find({ source: { $in: ['bls', 'usda'] } }).toArray()) {
			const table = tableEntry(e.source, String(e.sourceId ?? ''));
			if (!table) {
				entriesUnresolved++;
				unresolved.set(`${e.source}:${e.sourceId}`, (unresolved.get(`${e.source}:${e.sourceId}`) ?? 0) + 1);
				continue;
			}
			const patch = tracePatch(e.per100g ?? {}, table, 'per100g.');
			if (Object.keys(patch).length === 0) continue;
			entriesPatched++;
			keysAdded += Object.keys(patch).length;
			if (APPLY) await logs.updateOne({ _id: e._id }, { $set: patch });
		}
		console.log(`  Food log entries: ${entriesPatched} patched, ${keysAdded} figures added`);
		if (entriesUnresolved > 0) {
			console.log(`  ${entriesUnresolved} entries reference a food no longer in the tables:`);
			for (const [ref, n] of [...unresolved].sort((a, b) => b[1] - a[1]).slice(0, 10)) {
				console.log(`    - ${ref} (${n} ${n === 1 ? 'entry' : 'entries'})`);
			}
		}

		// Custom meal ingredients carry their own snapshots, and the diary aggregates
		// them at log time — so a meal patched here improves everything logged from it
		// from now on, while entries already logged from it are handled above.
		let mealsPatched = 0, ingredientsPatched = 0;
		for (const meal of await meals.find({}).toArray()) {
			const patch: Record<string, number> = {};
			(meal.ingredients ?? []).forEach((ing: any, i: number) => {
				const table = tableEntry(ing?.source, String(ing?.sourceId ?? ''));
				if (!table) return;
				const p = tracePatch(ing.per100g ?? {}, table, `ingredients.${i}.per100g.`);
				if (Object.keys(p).length === 0) return;
				ingredientsPatched++;
				Object.assign(patch, p);
			});
			if (Object.keys(patch).length === 0) continue;
			mealsPatched++;
			if (APPLY) await meals.updateOne({ _id: meal._id }, { $set: patch });
		}
		console.log(`  Custom meals: ${mealsPatched} patched (${ingredientsPatched} ingredients)\n`);
	}

	// ---------------------------------------------------------------- phase B
	if (RUN_OFF_UNITS) {
		console.log('--- Open Food Facts units ---');
		const mirrorCache = new Map<string, Per100g | null>();
		const mirrorFor = async (barcode: string): Promise<Per100g | null> => {
			if (!mirrorCache.has(barcode)) {
				const doc = await off.findOne({ barcode }, { projection: { per100g: 1 } });
				mirrorCache.set(barcode, (doc?.per100g as Per100g) ?? null);
			}
			return mirrorCache.get(barcode) ?? null;
		};

		let converted = 0, already = 0, nothing = 0;
		const review: string[] = [];

		for (const e of await logs.find({ source: 'off' }).toArray()) {
			const verdict = offVerdict(e.per100g ?? {}, await mirrorFor(String(e.sourceId ?? '')));
			if (verdict.kind === 'already') { already++; continue; }
			if (verdict.kind === 'nothing') { nothing++; continue; }
			if (verdict.kind === 'unknown' && !FORCE_OFF_LEGACY) {
				review.push(`"${e.name}" (${e.sourceId}) — ${verdict.why}`);
				continue;
			}
			const patch = offUnitPatch(e.per100g ?? {}, 'per100g.');
			if (!patch) { nothing++; continue; }
			converted++;
			if (APPLY) await logs.updateOne({ _id: e._id }, { $set: patch });
		}
		console.log(`  Food log entries: ${converted} rescaled, ${already} already correct, ${nothing} with no micronutrients`);
		if (review.length) {
			console.log(`  ${review.length} could not be judged (pass --force-off-legacy to rescale them anyway):`);
			for (const r of review.slice(0, 20)) console.log(`    - ${r}`);
		}

		let mealsConverted = 0;
		const mealReview: string[] = [];
		for (const meal of await meals.find({ 'ingredients.source': 'off' }).toArray()) {
			const patch: Record<string, number> = {};
			for (const [i, ing] of (meal.ingredients ?? []).entries()) {
				if (ing?.source !== 'off') continue;
				const verdict = offVerdict(ing.per100g ?? {}, await mirrorFor(String(ing.sourceId ?? '')));
				if (verdict.kind === 'already' || verdict.kind === 'nothing') continue;
				if (verdict.kind === 'unknown' && !FORCE_OFF_LEGACY) {
					mealReview.push(`${meal.name} / "${ing.name}" — ${verdict.why}`);
					continue;
				}
				Object.assign(patch, offUnitPatch(ing.per100g ?? {}, `ingredients.${i}.per100g.`) ?? {});
			}
			if (Object.keys(patch).length === 0) continue;
			mealsConverted++;
			if (APPLY) await meals.updateOne({ _id: meal._id }, { $set: patch });
		}
		console.log(`  Custom meals: ${mealsConverted} rescaled`);
		if (mealReview.length) {
			console.log(`  ${mealReview.length} meal ingredients could not be judged:`);
			for (const r of mealReview.slice(0, 20)) console.log(`    - ${r}`);
		}

		// An entry logged from a custom meal stores the aggregate, which mixes an OFF
		// ingredient's units with the others' — there is no per-ingredient trace left
		// in it to rescale. Rescaling the meal above fixes everything logged from it
		// afterwards; these need re-logging.
		const affectedMeals = await meals.distinct('_id', { 'ingredients.source': 'off' });
		const staleCustom = affectedMeals.length
			? await logs.countDocuments({ source: 'custom', sourceId: { $in: affectedMeals.map(String) } })
			: 0;
		if (staleCustom > 0) {
			console.log(`\n  NOTE: ${staleCustom} entries logged from a meal containing OFF ingredients hold a`);
			console.log('  blended aggregate that cannot be rescaled key by key. Re-log them to pick up');
			console.log('  the corrected meal.');
		}
		console.log();
	}

	await mongoose.disconnect();
	if (!APPLY) console.log('Dry run — nothing was written. Re-run with --apply.');
}

main().catch(err => {
	console.error('Backfill failed:', err);
	process.exit(1);
});
