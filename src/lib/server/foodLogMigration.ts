/**
 * One-time migration from snapshot food-log entries to reference (component) form.
 *
 * Old shape: each FoodLogEntry stored a blended `per100g` snapshot plus a flat
 * `source`/`sourceId`/`amountGrams`; each CustomMeal ingredient stored its own
 * `per100g`. New shape: entries hold `components` (leaf refs) + `loggedAs`, and meal
 * ingredients hold only references — nutrition is resolved live.
 *
 * Both passes are idempotent (a converted document is detected and skipped) and
 * orphan-safe (an entry whose meal/recipe was deleted is reported and left exactly
 * as it was, never dropped). Meal/recipe entries are rebuilt from the *current*
 * definition — the per-ingredient breakdown was never stored, so a meal edited since
 * it was logged shifts to its current composition; that is reported per entry.
 *
 * Shared by the admin endpoint and the CLI wrapper so both convert identically.
 */

import { FoodLogEntry } from '$models/FoodLogEntry';
import { CustomMeal } from '$models/CustomMeal';
import { Recipe } from '$models/Recipe';
import { foodLeaf, mealLeaves, recipeLeaves, resolveLeaves, type LeafRef, type LeafSource } from '$lib/server/foodLogComponents';

export type EntryFailure = { id: string; name: string; source: string; reason: string };

/** A meal/recipe entry decomposes correctly only if the leaves reproduce the logged
 *  calories. Beyond this relative gap the meal/recipe was edited past reconstruction,
 *  so the old snapshot is frozen inline rather than silently rewriting history. */
const FREEZE_THRESHOLD = 0.1;

export type MigrationReport = {
	entries: {
		total: number;
		alreadyConverted: number;
		converted: number;
		/** Of `converted`, how many kept a frozen snapshot because their meal/recipe
		 *  had been edited beyond faithful reconstruction. */
		frozen: number;
		frozenDetail: { id: string; name: string; oldCal: number; newCal: number }[];
		failures: EntryFailure[];
	};
	meals: {
		total: number;
		alreadyConverted: number;
		converted: number;
		flagged: { id: string; name: string; reason: string }[];
	};
	applied: boolean;
};

const LEAF_SOURCES: LeafSource[] = ['bls', 'usda', 'off'];

/** Build the reference form of one legacy entry, or a reason it can't be resolved.
 *  Exported so a verification pass can decompose without writing. */
export async function legacyEntryComponents(
	e: any,
): Promise<{ components: LeafRef[]; loggedAs: { kind: 'food' | 'custom' | 'recipe'; refId?: any } } | { reason: string }> {
	const amount = e.amountGrams ?? 0;
	if (amount <= 0) return { reason: 'non-positive amount' };
	const src = e.source;

	if (src === 'bls' || src === 'usda' || src === 'off') {
		if (!e.sourceId) return { reason: 'food entry has no sourceId' };
		return {
			components: foodLeaf(
				{ source: src, sourceId: String(e.sourceId), portions: e.portions, selectedPortion: e.selectedPortion },
				amount,
			),
			loggedAs: { kind: 'food' },
		};
	}

	if (src === 'custom') {
		if (!e.sourceId) return { reason: 'custom entry has no meal id' };
		const meal = await CustomMeal.findById(e.sourceId).lean();
		if (!meal) return { reason: `custom meal ${e.sourceId} was deleted` };
		const components = await mealLeaves(meal, amount);
		if (!components.length) return { reason: 'custom meal resolved to no ingredients' };
		return { components, loggedAs: { kind: 'custom', refId: (meal as any)._id } };
	}

	if (src === 'recipe') {
		if (!e.sourceId) return { reason: 'recipe entry has no recipe id' };
		const query = /^[0-9a-fA-F]{24}$/.test(String(e.sourceId)) ? { _id: e.sourceId } : { short_name: e.sourceId };
		const recipe = await Recipe.findOne(query).select('short_name ingredients nutritionMappings').lean();
		if (!recipe) return { reason: `recipe ${e.sourceId} not found` };
		const components = await recipeLeaves(recipe, amount);
		if (!components.length) return { reason: 'recipe resolved to no ingredients' };
		return { components, loggedAs: { kind: 'recipe', refId: (recipe as any)._id } };
	}

	return { reason: `unknown source "${src}"` };
}

/**
 * Convert every legacy food-log entry (one without `components`). Returns a report;
 * writes only when `apply` is true.
 */
export async function convertFoodLogEntries(apply: boolean): Promise<MigrationReport['entries']> {
	// lean() returns the raw stored fields (source/sourceId/per100g) even though the
	// model no longer declares them, which is exactly what the rebuild reads.
	const legacy = await FoodLogEntry.find({ components: { $exists: false } }).lean() as any[];
	const converted = await FoodLogEntry.countDocuments({ components: { $exists: true } });

	const failures: EntryFailure[] = [];
	const frozenDetail: { id: string; name: string; oldCal: number; newCal: number }[] = [];
	let done = 0;

	for (const e of legacy) {
		const built = await legacyEntryComponents(e);
		if ('reason' in built) {
			failures.push({ id: String(e._id), name: e.name ?? '', source: e.source ?? '?', reason: built.reason });
			continue;
		}

		let components = built.components;

		// A plain food reproduces its base entry exactly, so it always converts and is
		// meant to track live base-table values. A meal/recipe, though, is rebuilt from
		// its *current* definition; if that no longer yields the logged calories the
		// meal was edited since, and decomposing would rewrite that day — so freeze the
		// old snapshot inline instead.
		if (built.loggedAs.kind !== 'food') {
			const resolved = await resolveLeaves(components);
			const newCal = resolved.reduce((s, c) => s + (c.per100g?.calories ?? 0) * c.amountGrams / 100, 0);
			const oldCal = (e.per100g?.calories ?? 0) * (e.amountGrams ?? 0) / 100;
			if (oldCal > 1 && Math.abs(newCal - oldCal) / oldCal > FREEZE_THRESHOLD) {
				components = [{
					source: 'frozen',
					sourceId: String(e.sourceId ?? built.loggedAs.refId ?? ''),
					amountGrams: e.amountGrams,
					per100g: e.per100g,
				}];
				frozenDetail.push({ id: String(e._id), name: e.name ?? '', oldCal: Math.round(oldCal), newCal: Math.round(newCal) });
			}
		}

		if (apply) {
			await FoodLogEntry.updateOne(
				{ _id: e._id },
				{
					$set: { components, loggedAs: built.loggedAs },
					$unset: { source: '', sourceId: '', amountGrams: '', per100g: '', portions: '', selectedPortion: '' },
				},
			);
		}
		done++;
	}

	return {
		total: legacy.length + converted,
		alreadyConverted: converted,
		converted: done,
		frozen: frozenDetail.length,
		frozenDetail,
		failures,
	};
}

/**
 * Drop the `per100g` snapshot from every custom-meal ingredient. Ingredients that
 * aren't a clean bls/usda/off reference (a legacy nested meal, a missing id) are
 * flagged rather than converted, so a follow-up can look at them.
 */
export async function convertCustomMeals(apply: boolean): Promise<MigrationReport['meals']> {
	const meals = await CustomMeal.find({}).lean() as any[];
	const flagged: { id: string; name: string; reason: string }[] = [];
	let done = 0;
	let already = 0;

	for (const m of meals) {
		const ingredients: any[] = m.ingredients ?? [];
		const hasSnapshot = ingredients.some(i => i && typeof i.per100g === 'object');
		if (!hasSnapshot) { already++; continue; }

		for (const i of ingredients) {
			if (!i?.sourceId) flagged.push({ id: String(m._id), name: m.name ?? '', reason: `ingredient "${i?.name ?? '?'}" has no sourceId` });
			else if (!LEAF_SOURCES.includes(i.source)) flagged.push({ id: String(m._id), name: m.name ?? '', reason: `ingredient "${i?.name}" has source "${i.source}"` });
		}

		if (apply) {
			// Drop per100g from every ingredient subdocument in one update.
			await CustomMeal.updateOne({ _id: m._id }, { $unset: { 'ingredients.$[].per100g': '' } });
		}
		done++;
	}

	return { total: meals.length, alreadyConverted: already, converted: done, flagged };
}

/** Run both passes. Dry-run unless `apply` is true. */
export async function migrateFoodLogToReferences(apply: boolean): Promise<MigrationReport> {
	// Meals first so their ingredient snapshots are gone before (unrelated) entry
	// conversion; entry rebuild reads only ingredient references, so order is safe.
	const meals = await convertCustomMeals(apply);
	const entries = await convertFoodLogEntries(apply);
	return { entries, meals, applied: apply };
}
