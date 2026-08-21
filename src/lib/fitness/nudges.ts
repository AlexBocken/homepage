/**
 * Nudges: how to finish a day from what is already on the plate.
 *
 * This replaces a solver that answered "what should I eat?" — a question needing
 * knowledge of someone's kitchen, which the app does not have. Its optimal answers
 * were combinations of up to three foods drawn partly from a curated pantry list,
 * so they were frequently unbuyable and the feature spent its credibility fast.
 *
 * The question here is narrower and answerable: "what small change to what you have
 * already logged gets the day closer?" A bigger portion of the rice already on the
 * plate costs nothing to act on. Only when no such adjustment helps does it fall
 * back to suggesting a staple, and then only foods this person eats routinely.
 *
 * The one exception is whole dishes — the site's own recipes and the meals this
 * person has assembled themselves. A dish whose portion lands every macro on target
 * is worth making, so those are pinned above the adjustments rather than ranked
 * against them. Anything short of that fit is not offered at all — see
 * `GREAT_FIT_COST`.
 *
 * Kept free of database and Svelte imports so the ranking rules can be tested.
 */

export type Macros = { calories: number; protein: number; fat: number; carbs: number };
export type Remaining = { kcal: number; protein: number; fat: number; carbs: number };

export type LoggedEntry = {
	id: string;
	name: string;
	amountGrams: number;
	per100g: Partial<Macros> | null | undefined;
	mealType?: string;
};

export type StapleFood = {
	name: string;
	source: string;
	sourceId: string;
	per100g: Partial<Macros> | null | undefined;
};

/** What a dish row needs to render beyond the numbers: where it can be looked up,
 *  a thumbnail, and what one serving weighs. Carried through untouched — the ranking
 *  never reads it. */
export type DishMeta = {
	/** A recipe links to its page under /rezepte; a custom meal to its own entry. */
	kind: 'recipe' | 'custom';
	/** Recipes: the German slug (`/rezepte/<slug>`). */
	slug?: string;
	/** Recipes: the English slug, when translated (`/recipes/<slug>`). */
	slugEn?: string;
	nameEn?: string;
	/** Thumbnail URL. */
	image?: string;
	/** Weight of one serving — a recipe's stated portion, a meal as assembled. */
	portionGrams?: number;
};

/** A whole dish: a recipe from the site's collection, or a meal the person built. */
export type DishFood = {
	name: string;
	/** `recipe` or `custom` — the source the food log logs it against. */
	source: string;
	/** The recipe's or meal's ObjectId. */
	sourceId: string;
	per100g: Partial<Macros> | null | undefined;
	meta: DishMeta;
};

/**
 * Nothing under this is worth surfacing. It is a relevance floor rather than a
 * precision one: "add 12 g of almonds" is arithmetically right and useless advice,
 * and a feature that says nothing beats one that says something trivial.
 */
export const MIN_DELTA_GRAMS = 50;
/** Beyond this a "nudge" is really a meal, and the portion stops being plausible. */
export const MAX_DELTA_GRAMS = 300;
/** A dish *is* a meal, so it gets a plate-sized ceiling rather than the snack-sized
 *  one that keeps a staple suggestion from turning into dinner. */
export const MAX_DISH_GRAMS = 450;
/** Suggestions land on 5 g so they read as instructions, not solver output. */
export const GRAM_STEP = 5;

/**
 * How far calories may exceed the remaining budget. Zero would be brittle — a 3 kcal
 * overshoot is not a real error — but a wide tolerance reintroduces the failure this
 * design exists to remove, where a macro gap gets closed by blowing the day's energy.
 */
const KCAL_OVERSHOOT = 25;

/** Fat is weighted up because it carries 9 kcal/g, so a gram of it moves the day
 *  more than a gram of protein or carbohydrate. Matches the previous solver. */
const W = { protein: 1, fat: 2, carbs: 1 };

function macro(per100g: Partial<Macros> | null | undefined, key: keyof Macros): number {
	const v = per100g?.[key];
	return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

/** Remaining gaps after eating `grams` of a food. Gaps may go negative (overshoot). */
export function remainingAfter(rem: Remaining, per100g: Partial<Macros> | null | undefined, grams: number): Remaining {
	const r = grams / 100;
	return {
		kcal: rem.kcal - macro(per100g, 'calories') * r,
		protein: rem.protein - macro(per100g, 'protein') * r,
		fat: rem.fat - macro(per100g, 'fat') * r,
		carbs: rem.carbs - macro(per100g, 'carbs') * r,
	};
}

/**
 * Overshoot counts against a suggestion, but less than an equal shortfall — going
 * 10 g over on protein is a smaller problem than being 10 g under.
 *
 * It cannot be free. Scoring shortfalls only makes overshoot costless, and the
 * ranking then happily blows past one target to close another: a protein gap gets
 * "solved" by 140 g of oats that overshoots carbohydrate by 64 g and still leaves
 * protein short, out-ranking the chicken already on the plate.
 */
const OVERSHOOT_WEIGHT = 0.6;

/**
 * How far a day is from its macro targets, in weighted grams.
 *
 * Calories are excluded — they are enforced as a hard constraint in `bestAmount`
 * rather than traded off against the macros.
 */
export function gapCost(rem: Remaining): number {
	const part = (gap: number, w: number) =>
		gap >= 0 ? gap * w : -gap * w * OVERSHOOT_WEIGHT;
	return part(rem.protein, W.protein) + part(rem.fat, W.fat) + part(rem.carbs, W.carbs);
}

/**
 * How much a suggestion must improve the day to be worth showing, in the same
 * weighted grams. Below this the advice is noise, and the caller hides the card —
 * a day that is already close does not need finishing.
 */
export const MIN_IMPROVEMENT = 5;

/**
 * How close a dish has to land before it is worth proposing at all.
 *
 * A staple is a spoonful of something already in the cupboard; a dish is a thing you
 * go and make, so "would help a bit" is not a good enough reason to put one on
 * screen. 12 weighted grams is exactly the point where every macro is within the 3 g
 * the card already calls hitting the target — so a dish only ever appears when it
 * reads as "hits every target", and when it does it keeps its place at the top of the
 * list regardless of how the bumps score.
 */
export const GREAT_FIT_COST = 12;

/** At most this many dishes, so the card stays a list of adjustments with the odd
 *  meal in it rather than a meal planner. */
export const DISH_SLOTS = 2;

export type Nudge = {
	kind: 'bump' | 'add';
	name: string;
	/** Grams to add — the delta for a bump, the portion for an add. */
	deltaGrams: number;
	/** Present on a bump: the entry to update and its new total. */
	entryId?: string;
	fromGrams?: number;
	toGrams?: number;
	/** Present on an add: what to log. */
	source?: string;
	sourceId?: string;
	per100g?: Partial<Macros> | null;
	/** Gaps left once this is applied — shown instead of a confidence score. */
	after: Remaining;
	/** How much of the weighted shortfall this closes, in grams. */
	improvement: number;
	/** Present on a dish row: how to look up and picture it. */
	dish?: DishMeta;
};

/**
 * Best gram amount of one food, or null if no amount qualifies.
 *
 * Scans in 5 g steps rather than solving in closed form. The search space is tiny,
 * quantised answers are the ones worth showing, and it removes the previous solver's
 * habit of computing an exact optimum and then discarding it for landing outside the
 * allowed range — here the range is the search.
 */
function bestAmount(
	rem: Remaining,
	per100g: Partial<Macros> | null | undefined,
	maxGrams: number,
): { grams: number; after: Remaining; improvement: number } | null {
	const kcalPer100 = macro(per100g, 'calories');
	// A food with no energy cannot be constrained by the calorie cap and would be
	// suggested in unbounded amounts.
	if (kcalPer100 <= 0) return null;

	const before = gapCost(rem);
	let best: { grams: number; after: Remaining; improvement: number } | null = null;

	for (let g = MIN_DELTA_GRAMS; g <= maxGrams; g += GRAM_STEP) {
		const after = remainingAfter(rem, per100g, g);
		if (after.kcal < -KCAL_OVERSHOOT) break; // more grams only overshoots further
		const improvement = before - gapCost(after);
		if (improvement < MIN_IMPROVEMENT) continue;
		if (!best || improvement > best.improvement) best = { grams: g, after, improvement };
	}
	return best;
}

/**
 * Rank the ways to close out a day.
 *
 * Bumps are preferred over adds at equal benefit: eating more of what is already on
 * the plate needs nothing the person does not have. An add has to be meaningfully
 * better to outrank a bump, which is what `ADD_PENALTY` encodes.
 *
 * Whole dishes — recipes and the person's own saved meals — are outside that
 * contest. They are only admitted when they land the day within `GREAT_FIT_COST`, and
 * one that does is pinned to the top instead of being scored against the bumps: a
 * dish that finishes the day exactly is the best answer the app has, and it would
 * otherwise lose to a rounding-error-sized bump that happens to score marginally
 * higher.
 *
 * Returns an empty array when nothing qualifies. That is a real answer — the caller
 * hides the component rather than inventing a suggestion.
 */
const ADD_PENALTY = 1.15;

export function buildNudges(
	rem: Remaining,
	logged: LoggedEntry[] | null | undefined,
	staples: StapleFood[] | null | undefined,
	limit = 5,
	dishes: DishFood[] | null | undefined = [],
): Nudge[] {
	// Nothing to close, or the day is already over budget.
	if (rem.kcal <= 0) return [];

	const out: Nudge[] = [];

	for (const e of logged ?? []) {
		const grams = e.amountGrams ?? 0;
		if (grams <= 0) continue;
		const best = bestAmount(rem, e.per100g, MAX_DELTA_GRAMS);
		if (!best) continue;
		out.push({
			kind: 'bump',
			name: e.name,
			entryId: e.id,
			fromGrams: grams,
			toGrams: grams + best.grams,
			deltaGrams: best.grams,
			after: best.after,
			improvement: best.improvement,
		});
	}

	for (const s of staples ?? []) {
		const best = bestAmount(rem, s.per100g, MAX_DELTA_GRAMS);
		if (!best) continue;
		out.push({
			kind: 'add',
			name: s.name,
			source: s.source,
			sourceId: s.sourceId,
			per100g: s.per100g ?? null,
			deltaGrams: best.grams,
			after: best.after,
			improvement: best.improvement / ADD_PENALTY,
		});
	}

	// Recipes and saved meals, admitted only as near-perfect fits.
	const pinned: Nudge[] = [];
	for (const d of dishes ?? []) {
		const best = bestAmount(rem, d.per100g, MAX_DISH_GRAMS);
		if (!best) continue;
		if (gapCost(best.after) > GREAT_FIT_COST) continue;
		pinned.push({
			kind: 'add',
			name: d.name,
			source: d.source,
			sourceId: d.sourceId,
			per100g: d.per100g ?? null,
			deltaGrams: best.grams,
			after: best.after,
			improvement: best.improvement,
			dish: d.meta,
		});
	}
	// Ranked by what they leave behind rather than by improvement: among dishes that
	// all qualify as great fits, the interesting difference is which lands closest,
	// not which had the most ground to make up. Recipes and meals share the slots —
	// both are a thing you go and make, and the better fit deserves the row.
	pinned.sort((a, b) => gapCost(a.after) - gapCost(b.after));
	const dishRows = pinned.slice(0, Math.min(DISH_SLOTS, limit));

	out.sort((a, b) => b.improvement - a.improvement);

	// One row per food: the same staple at two portion sizes is one idea, not two.
	// The pinned dishes seed the set, so a meal eaten often enough to be learned as a
	// staple cannot also arrive as one.
	const seen = new Set<string>(dishRows.map(n => `add:${n.source}:${n.sourceId}`));
	const deduped: Nudge[] = [];
	for (const n of out) {
		const key = n.kind === 'bump' ? `bump:${n.entryId}` : `add:${n.source}:${n.sourceId}`;
		if (seen.has(key)) continue;
		seen.add(key);
		deduped.push(n);
	}

	return [...dishRows, ...deduped.slice(0, limit - dishRows.length)];
}

/**
 * Foods eaten often enough to assume they are in the house.
 *
 * Counted by distinct days rather than entries, so a food eaten three times in one
 * day is not mistaken for a habit. The seed list covers a cold start, where there is
 * no history to learn from.
 */
export function learnStaples(
	entries: { name?: string; source?: string; sourceId?: string; date?: Date | string; per100g?: Partial<Macros> | null }[] | null | undefined,
	minDays = 3,
): { source: string; sourceId: string; name: string; days: number; per100g: Partial<Macros> | null }[] {
	const byFood = new Map<string, { source: string; sourceId: string; name: string; days: Set<string>; per100g: Partial<Macros> | null }>();

	for (const e of entries ?? []) {
		if (!e?.source || !e?.sourceId) continue;
		const key = `${e.source}:${e.sourceId}`;
		const day = e.date ? new Date(e.date).toISOString().slice(0, 10) : '';
		const prev = byFood.get(key);
		if (prev) {
			prev.days.add(day);
			// Keep the most recent per100g seen for this food.
			if (e.per100g) prev.per100g = e.per100g;
		} else {
			byFood.set(key, {
				source: e.source,
				sourceId: e.sourceId,
				name: e.name ?? '',
				days: new Set([day]),
				per100g: e.per100g ?? null,
			});
		}
	}

	return [...byFood.values()]
		.filter(f => f.days.size >= minDays)
		.map(f => ({ source: f.source, sourceId: f.sourceId, name: f.name, days: f.days.size, per100g: f.per100g }))
		.sort((a, b) => b.days - a.days);
}
