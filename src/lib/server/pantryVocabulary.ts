/**
 * The pantry search's view of the recipes: which cleaned ingredient keys exist,
 * which cover which, and what every recipe needs. Built from the ingredient
 * *text* ($lib/js/pantryNames), not from the nutrition mappings — those point
 * the same food at BLS in one recipe and USDA in another.
 *
 * Merging names is where it can go wrong, so every merge has to be confirmed
 * by the English translation at the same position in the recipe:
 * - plurals — "zwiebeln" folds into "zwiebel" (onions/onion), but "kirschen"
 *   stays apart from "kirsch" (cherries/kirsch);
 * - kinds — "ruchmehl" covers "mehl" (… flour/flour), but "knoblauch" does not
 *   cover "lauch" (garlic/leek);
 * - plus what $lib/data/pantryOverrides adds or forbids by hand.
 *
 * Pure — the cached, database-backed copy is `$lib/server/pantryIndex`.
 */
import { cleanIngredientLine, displayLabel, englishHead } from '$lib/js/pantryNames';
import { sectionRepeatCheck } from '$lib/js/recipeRefs';
import { DEFAULT_BASICS, DERIVED_SUFFIXES, EXTRA_COVERS, NOT_COVERS } from '$lib/data/pantryOverrides';
import type { PantryIndex, PantryNeed, PantryRecipe } from '$lib/js/pantryMatch';

const PLURAL_SUFFIXES = ['nen', 'en', 'er', 'n', 'e', 's'];
/** A compound ending this short ("ei" in "brei") is too likely a coincidence. */
const MIN_PARENT_LENGTH = 3;

type Line = { de: string[]; en: string[]; optional: boolean; ref: string | null };

export type PantrySource = {
	_id: unknown;
	short_name: string;
	ingredients?: any[];
	translations?: { en?: { ingredients?: any[] } };
};

/** The lines of one ingredient list (a section, or a reference section's extra
 *  items), German and English side by side. */
function readLines(list: any[] | undefined, enList: any[] | undefined, isRepeat: (name: string) => boolean): Line[] {
	const out: Line[] = [];
	(list ?? []).forEach((item, i) => {
		if (!item?.name || isRepeat(item.name)) return;
		const de = cleanIngredientLine(item.name, 'de');
		if (de.keys.length === 0) return;
		const enName = enList?.[i]?.name;
		const en = enName ? cleanIngredientLine(enName, 'en').keys : [];
		out.push({ de: de.keys, en, optional: de.optional, ref: de.ref });
	});
	return out;
}

/** Every line of a recipe, and the base recipes its reference sections include. */
function readRecipe(doc: PantrySource) {
	const lines: Line[] = [];
	const bases: string[] = [];
	const sections = doc.ingredients ?? [];
	const enSections = doc.translations?.en?.ingredients ?? [];
	const isSectionRepeat = sectionRepeatCheck(sections);
	sections.forEach((section: any, si: number) => {
		const en = enSections[si];
		const isRepeat = (name: string) => isSectionRepeat(name, section?.name);
		if (section?.type === 'reference') {
			if (section.baseRecipeRef && section.includeIngredients !== false) bases.push(String(section.baseRecipeRef));
			lines.push(...readLines(section.itemsBefore, en?.itemsBefore, isRepeat));
			lines.push(...readLines(section.itemsAfter, en?.itemsAfter, isRepeat));
			return;
		}
		lines.push(...readLines(section?.list, en?.list, isRepeat));
	});
	return { lines, bases };
}

/** The most frequent entry of a count map. */
function top(counts: Map<string, number> | undefined): string | undefined {
	let best: string | undefined;
	let bestCount = 0;
	for (const [value, count] of counts ?? []) {
		if (count > bestCount) {
			best = value;
			bestCount = count;
		}
	}
	return best;
}

export function buildPantryIndex(docs: PantrySource[]): PantryIndex {
	const recipes = docs.map((doc) => ({ doc, ...readRecipe(doc) }));

	// ── Raw vocabulary, with the English name seen at the same position ──
	const count = new Map<string, number>();
	const english = new Map<string, Map<string, number>>();
	for (const { lines } of recipes) {
		for (const line of lines) {
			line.de.forEach((key, i) => {
				count.set(key, (count.get(key) ?? 0) + 1);
				// Alternatives pair up only when both languages list the same number.
				const en = line.en.length === line.de.length ? line.en[i] : i === 0 ? line.en[0] : undefined;
				if (!en) return;
				const seen = english.get(key) ?? english.set(key, new Map()).get(key)!;
				seen.set(en, (seen.get(en) ?? 0) + 1);
			});
		}
	}
	const head = (key: string) => {
		const en = top(english.get(key));
		return en ? englishHead(en) : undefined;
	};
	const sameKind = (a: string, b: string) => {
		const ha = head(a);
		return !!ha && ha === head(b);
	};

	// ── Plurals fold into their singular ──
	const canon = new Map<string, string>();
	for (const key of count.keys()) {
		for (const suffix of PLURAL_SUFFIXES) {
			const base = key.slice(0, -suffix.length);
			if (key.endsWith(suffix) && base.length >= 2 && count.has(base) && sameKind(key, base)) {
				canon.set(key, base);
				break;
			}
		}
	}
	const resolve = (key: string): string => {
		let k = key;
		for (let i = 0; i < 5 && canon.has(k); i++) k = canon.get(k)!;
		return k;
	};

	const merged = new Map<string, number>();
	const mergedEnglish = new Map<string, Map<string, number>>();
	for (const [key, n] of count) {
		const k = resolve(key);
		merged.set(k, (merged.get(k) ?? 0) + n);
		const into = mergedEnglish.get(k) ?? mergedEnglish.set(k, new Map()).get(k)!;
		for (const [en, m] of english.get(key) ?? []) into.set(en, (into.get(en) ?? 0) + m);
	}
	const keys = [...merged.keys()];
	const mergedHead = (key: string) => {
		const en = top(mergedEnglish.get(key));
		return en ? englishHead(en) : undefined;
	};

	// ── Which key covers which ──
	const forbidden = new Set(NOT_COVERS.map(([a, b]) => `${a}\u0000${b}`));
	const edges = new Map<string, Set<string>>();
	const addEdge = (have: string, needed: string) => {
		if (have === needed || forbidden.has(`${have}\u0000${needed}`)) return;
		(edges.get(have) ?? edges.set(have, new Set()).get(have)!).add(needed);
	};
	for (const child of keys) {
		for (const parent of keys) {
			if (parent.length < MIN_PARENT_LENGTH || child.length <= parent.length) continue;
			const isKind = child.includes(' ') ? child.endsWith(` ${parent}`) : child.endsWith(parent);
			if (!isKind) continue;
			const hc = mergedHead(child);
			if (hc && hc === mergedHead(parent)) addEdge(child, parent);
		}
		for (const suffix of DERIVED_SUFFIXES) {
			if (!child.endsWith(suffix)) continue;
			const stem = child.slice(0, -suffix.length);
			const base = [stem, stem.replace(/n$/, ''), stem.replace(/en$/, ''), stem.replace(/s$/, '')]
				.map(resolve)
				.find((k) => k.length >= MIN_PARENT_LENGTH && merged.has(k));
			if (base) addEdge(base, child);
		}
	}
	for (const [have, needed] of EXTRA_COVERS) {
		const h = resolve(have);
		const n = resolve(needed);
		if (merged.has(h) && merged.has(n)) addEdge(h, n);
	}

	const covers: Record<string, string[]> = {};
	for (const key of edges.keys()) {
		const seen = new Set<string>();
		const queue = [...edges.get(key)!];
		while (queue.length) {
			const next = queue.pop()!;
			if (seen.has(next) || next === key) continue;
			seen.add(next);
			queue.push(...(edges.get(next) ?? []));
		}
		covers[key] = [...seen];
	}

	// ── What each recipe needs ──
	const bySlug = new Map(docs.map((d) => [d.short_name, String(d._id)]));
	const refId = (slug: string) =>
		bySlug.get(slug) ?? bySlug.get(slug.replace(/_/g, '-')) ?? bySlug.get(slug.replace(/-/g, '_'));
	const pantryRecipes: PantryRecipe[] = recipes.map(({ doc, lines, bases }) => {
		const needs: PantryNeed[] = [];
		for (const line of lines) {
			if (line.optional) continue;
			const any = [...new Set(line.de.map(resolve))];
			const ref = line.ref ? refId(line.ref) : undefined;
			needs.push(ref && ref !== String(doc._id) ? { any, ref } : { any });
		}
		return { id: String(doc._id), needs, bases };
	});

	const items = keys
		.map((key) => {
			const en = top(mergedEnglish.get(key));
			return { key, de: displayLabel(key), en: en ? displayLabel(en) : displayLabel(key), count: merged.get(key)! };
		})
		.sort((a, b) => b.count - a.count || a.key.localeCompare(b.key, 'de'));
	// Two keys can share a translation (Frischhefe and Trockenhefe are both
	// "yeast" in the recipes). Chips have to be told apart, so the German name
	// goes alongside.
	const enCount = new Map<string, number>();
	for (const item of items) enCount.set(item.en, (enCount.get(item.en) ?? 0) + 1);
	for (const item of items) if (enCount.get(item.en)! > 1 && item.en !== item.de) item.en = `${item.en} (${item.de})`;

	const basics = [...new Set(DEFAULT_BASICS.map(resolve))].filter((k) => merged.has(k));

	return { items, covers, recipes: pantryRecipes, basics };
}
