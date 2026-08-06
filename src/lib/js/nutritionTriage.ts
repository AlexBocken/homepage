/**
 * Reading a recipe's nutrition mappings as a pile of work to get through.
 *
 * The editor's job is not to display mappings, it is to get every ingredient
 * confidently mapped and to say which ones still need a person. That means two
 * questions the stored mapping answers only indirectly:
 *
 * **What state is this line in** — done, needs you, or worth a second look. A
 * bare confidence percentage does not distinguish a 46% embedding guess from a
 * 100% alias hit, and it says nothing at all about the *other* place a mapping
 * goes wrong: the gram conversion. An ingredient matched perfectly whose unit
 * resolved by rough estimate is less trustworthy than a mediocre match measured
 * in grams.
 *
 * **How much of the dish is accounted for** — weighted by grams, not by row
 * count. "12 of 14 mapped" does not tell you those two are 40% of the pot. This
 * is the same principle `$lib/fitness/microCoverage` already applies to the food
 * diary, where coverage is weighted by calories rather than by entries.
 */
import { ingredientGrams, parseAmount } from '$lib/js/ingredientAmount';
import { parseAnchorRecipeRef } from '$lib/js/recipeRefs';

/** Below this, an automatic match is a guess worth confirming. */
export const UNSURE_CONFIDENCE = 0.6;

export type TriageState =
	/** Another recipe, counted whole. */
	| 'ref'
	/** Deliberately not counted. */
	| 'skipped'
	/** No match at all — nothing of this ingredient reaches the total. */
	| 'open'
	/** Matched, but on something worth checking. */
	| 'unsure'
	/** Matched and measured. */
	| 'ok';

/** How the gram weight of one unit was arrived at. */
export type TrustLevel =
	/** A conversion table, a density, a portion the source publishes, or typed by hand. */
	| 'ok'
	/** A generic guess for this kind of unit. */
	| 'weak'
	/** No conversion at all — the line contributes nothing, silently. */
	| 'none';

/**
 * Typed structurally rather than as `NutritionMapping` so a partial fixture, a
 * lean Mongo document and a `$state` proxy all satisfy it. Every field the cards
 * read is here — a narrower type just pushes casts into the components.
 */
export type Mapping = {
	sectionIndex?: number;
	ingredientIndex?: number;
	ingredientName?: string;
	ingredientNameDe?: string;
	source?: string;
	fdcId?: number;
	blsCode?: string;
	nutritionDbName?: string;
	matchMethod?: string;
	matchConfidence?: number;
	gramsPerUnit?: number;
	defaultAmount?: number;
	defaultAmountUsed?: boolean;
	unitConversionSource?: string;
	manuallyEdited?: boolean;
	/** A person looked at this row and said it is right. */
	confirmed?: boolean;
	excluded?: boolean;
	recipeRef?: string;
	recipeRefMultiplier?: number;
	per100g?: Record<string, number>;
};

export function trustLevel(mapping: Mapping): TrustLevel {
	if (!mapping.gramsPerUnit) return 'none';
	if (mapping.unitConversionSource === 'estimate') return 'weak';
	return 'ok';
}

/** True when nothing in the recipe line said how much, so one unit was assumed. */
export function amountAssumed(mapping: Mapping, amount: string | undefined): boolean {
	return !parseAmount(amount) && !mapping.excluded && !mapping.recipeRef;
}

/**
 * Which bucket a mapping belongs in.
 *
 * A hand-made match is never *unsure* — a person already looked at it. Everything
 * else that could be wrong lands in `unsure` rather than passing quietly: a weak
 * confidence, a gram figure that was guessed or missing, or an amount nobody
 * stated.
 *
 * `confirmed` is the way out of that list. Some doubts cannot be resolved by
 * re-matching — nobody wrote an amount on the line, or the unit only converts by
 * estimate — so without a way to say "checked, it is right" those rows warn
 * forever and the warnings stop meaning anything. The one thing it cannot
 * silence is a missing gram figure: that line contributes nothing to the recipe's
 * weight, and confirming it would be approving a hole in the sum rather than
 * accepting a rough number.
 */
export function triageState(mapping: Mapping, amount: string | undefined): TriageState {
	if (mapping.recipeRef) return 'ref';
	if (mapping.excluded) return 'skipped';
	if (!mapping.matchMethod || mapping.matchMethod === 'none') return 'open';

	if (!mapping.gramsPerUnit) return 'unsure';
	if (mapping.confirmed) return 'ok';

	const trust = trustLevel(mapping);
	if (trust !== 'ok') return 'unsure';
	if (amountAssumed(mapping, amount)) return 'unsure';
	if (mapping.manuallyEdited) return 'ok';
	if ((mapping.matchConfidence ?? 0) < UNSURE_CONFIDENCE) return 'unsure';
	return 'ok';
}

/**
 * Why this row is flagged, in the words the card shows next to the approve
 * button. Empty when the row is not `unsure`.
 */
export function unsureReasons(mapping: Mapping, amount: string | undefined): string[] {
	const reasons: string[] = [];
	if (!mapping.gramsPerUnit) reasons.push('kein Gewicht pro Einheit');
	else if (trustLevel(mapping) !== 'ok') reasons.push('Einheit nur geschätzt');
	if (amountAssumed(mapping, amount)) reasons.push('keine Menge angegeben');
	if (
		mapping.gramsPerUnit &&
		!mapping.manuallyEdited &&
		(mapping.matchConfidence ?? 0) < UNSURE_CONFIDENCE
	) {
		reasons.push('unsichere Zuordnung');
	}
	return reasons;
}

export type IngredientLine = { name: string; unit?: string; amount?: string };

export type MapperRow =
	| {
			kind: 'ingredient';
			key: string;
			/** Position in the recipe, 1-based, for the card's number. */
			index: number;
			mapping: Mapping;
			line: IngredientLine;
			state: TriageState;
			/** What this line contributes to the pot, in grams. */
			grams: number;
			/** What it would contribute if it were mapped — the coverage denominator. */
			nominalGrams: number;
	  }
	| {
			kind: 'base';
			key: string;
			index: number;
			/** Present for an anchor reference, absent for a `type: 'reference'` section. */
			mapping?: Mapping;
			slug: string;
			state: 'ref';
			grams: number;
			nominalGrams: number;
	  };

/**
 * Every card the mapper shows, in the order the recipe lists them.
 *
 * Driven by the ingredient sections rather than by the mapping array, because the
 * sections are what the user sees above and because a `type: 'reference'` section
 * has no mapping at all — base recipes were invisible in the old table for
 * exactly that reason. The mapping indices are the raw section and item indices
 * `generateNutritionMappings` writes, so nothing has to be re-derived.
 */
export function buildRows(ingredients: any[], mappings: Mapping[]): MapperRow[] {
	const byIndex = new Map(
		(mappings ?? []).map((m) => [`${m.sectionIndex}-${m.ingredientIndex}`, m])
	);
	const rows: MapperRow[] = [];
	let index = 0;

	(ingredients ?? []).forEach((section: any, si: number) => {
		if (section?.type === 'reference') {
			const ref = section.baseRecipeRef;
			const slug = (typeof ref === 'object' ? ref?.short_name : undefined) || section.labelOverride || '';
			rows.push({
				kind: 'base',
				key: `base-${si}`,
				index: ++index,
				slug,
				state: 'ref',
				grams: 0,
				nominalGrams: 0,
			});
			return;
		}
		for (const [ii, item] of (section?.list ?? []).entries()) {
			const mapping = byIndex.get(`${si}-${ii}`);
			if (!mapping) continue;
			index++;

			// The stored `recipeRef` is authoritative — it is what a manual override
			// writes — but almost no mapping has one: the anchor branch of the matcher
			// is newer than most of them, so a line like
			// `<a href=mayonnaise>Mayonnaise</a> mit mehr Senf` carries whatever food
			// the embedder guessed instead. The link in the name is the recipe's own
			// statement of what it points at, so read it rather than trusting the
			// mapping to have caught up.
			//
			// A link that is *not* a recipe — an external URL, a downloadable file —
			// parses to nothing and leaves the line an ordinary ingredient, which is
			// what a sentence with a citation in it is.
			const slug = mapping.recipeRef || parseAnchorRecipeRef(item?.name || '') || '';
			if (slug) {
				rows.push({
					kind: 'base',
					key: `base-${si}-${ii}`,
					index,
					mapping,
					slug,
					state: 'ref',
					grams: 0,
					nominalGrams: 0,
				});
				continue;
			}
			rows.push({
				kind: 'ingredient',
				key: `${si}-${ii}`,
				index,
				mapping,
				line: item,
				state: triageState(mapping, item?.amount),
				grams: ingredientGrams(mapping, item?.amount),
				// What it weighs regardless of whether it resolved, so an unmapped
				// 500 g of flour weighs on the coverage bar as heavily as it does in
				// the pot. Zero when the unit could not be converted — an unknown
				// weight cannot be a share of anything.
				nominalGrams: ingredientGrams(mapping, item?.amount, 1, { includeExcluded: true }),
			});
		}
	});

	return rows;
}

export type Coverage = {
	/** Grams whose nutrition is actually known. */
	coveredGrams: number;
	/** Grams the recipe is made of, as far as the units could be read. */
	totalGrams: number;
	counts: Record<TriageState, number>;
};

/**
 * How much of the dish is accounted for, by weight.
 *
 * A skipped line counts in the denominator: choosing not to map the 500 g of
 * water a stock is boiled in is legitimate, but the resulting figures still
 * describe only part of what is in the pot, and saying so is the point.
 *
 * Base recipes are passed in separately, with the grams they contribute, because
 * they come from a database lookup the client does not do.
 */
export function coverageOf(
	rows: MapperRow[],
	baseGrams: { grams: number; covered: number }[] = [],
): Coverage {
	const counts: Record<TriageState, number> = { ref: 0, skipped: 0, open: 0, unsure: 0, ok: 0 };
	let coveredGrams = 0;
	let totalGrams = 0;

	for (const row of rows) {
		counts[row.state]++;
		if (row.kind !== 'ingredient') continue;
		totalGrams += row.nominalGrams;
		if (row.state === 'ok' || row.state === 'unsure') coveredGrams += row.grams;
	}

	for (const base of baseGrams) {
		totalGrams += base.grams;
		coveredGrams += base.covered;
	}

	return { coveredGrams, totalGrams, counts };
}
