/**
 * "What can I cook with what I have?" — the matching half of the pantry
 * search, run in the browser so the results follow every chip you toggle.
 *
 * The server ($lib/server/pantryIndex) sends what every recipe needs, as
 * cleaned ingredient keys ($lib/js/pantryNames), and which keys cover which:
 * Ruchmehl covers "Mehl", Zitrone covers "Zitronensaft", Ei covers "Dotter".
 * This module decides, for a set of keys you have, what each recipe is still
 * missing.
 */

/** One thing you can have, with its labels in both languages. */
export type PantryItem = { key: string; de: string; en: string; count: number };

/** One required ingredient line: any of `any` will do. `ref` is the id of a
 *  recipe the line links to — making that recipe also satisfies the line. */
export type PantryNeed = { any: string[]; ref?: string };

export type PantryRecipe = {
	id: string;
	needs: PantryNeed[];
	/** Base recipes whose ingredients this one includes (reference sections). */
	bases: string[];
};

export type PantryIndex = {
	items: PantryItem[];
	/** key → every key that having it also satisfies (transitively closed). */
	covers: Record<string, string[]>;
	recipes: PantryRecipe[];
	/** The default basics, as keys present in `items`. */
	basics: string[];
};

export type PantryMatch = {
	id: string;
	/** Keys of the lines nothing you have satisfies, in recipe order. */
	missing: string[];
	/** Lines satisfied by your own items (not the basics) — what ranks a match. */
	used: number;
	/** Required lines in total. */
	needs: number;
};

/** Base recipes and linked recipes nest at most this deep. */
const MAX_DEPTH = 2;

/** Everything `have` satisfies: the keys themselves and all they cover. */
export function satisfied(index: Pick<PantryIndex, 'covers'>, have: Iterable<string>): Set<string> {
	const out = new Set<string>();
	for (const key of have) {
		out.add(key);
		for (const covered of index.covers[key] ?? []) out.add(covered);
	}
	return out;
}

/**
 * What each recipe is missing, given what you have (`have`, basics included)
 * and which of it is your own selection (`mine`, for ranking).
 */
export function matchRecipes(
	index: Pick<PantryIndex, 'covers' | 'recipes'>,
	have: Iterable<string>,
	mine: Iterable<string>,
): Map<string, PantryMatch> {
	const ok = satisfied(index, have);
	const own = satisfied(index, mine);
	const byId = new Map(index.recipes.map((r) => [r.id, r]));

	/** The required lines of a recipe, its base recipes' included. */
	const linesOf = (recipe: PantryRecipe, depth: number): PantryNeed[] => {
		const lines = [...recipe.needs];
		if (depth < MAX_DEPTH) {
			for (const baseId of recipe.bases) {
				const base = byId.get(baseId);
				if (base && base !== recipe) lines.push(...linesOf(base, depth + 1));
			}
		}
		return lines;
	};

	const cookable = new Map<string, boolean>();
	const canMake = (id: string, depth: number): boolean => {
		if (depth > MAX_DEPTH) return false;
		const known = cookable.get(id);
		if (known !== undefined) return known;
		cookable.set(id, false); // a cycle is not a way to make something
		const recipe = byId.get(id);
		const result = !!recipe && linesOf(recipe, 0).every((line) => isMet(line, depth + 1));
		cookable.set(id, result);
		return result;
	};

	const isMet = (line: PantryNeed, depth: number): boolean =>
		line.any.some((k) => ok.has(k)) || (!!line.ref && canMake(line.ref, depth));

	const out = new Map<string, PantryMatch>();
	for (const recipe of index.recipes) {
		const lines = linesOf(recipe, 0);
		const missing: string[] = [];
		let used = 0;
		for (const line of lines) {
			if (line.any.some((k) => own.has(k))) used++;
			if (!isMet(line, 1) && line.any[0] && !missing.includes(line.any[0])) missing.push(line.any[0]);
		}
		out.set(recipe.id, { id: recipe.id, missing, used, needs: lines.length });
	}
	return out;
}

/** Best first: uses most of what you picked, then needs the least. */
export function compareMatches(a: PantryMatch, b: PantryMatch): number {
	return b.used - a.used || a.needs - b.needs;
}
