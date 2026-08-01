/**
 * Filter + ranking state for the recipe listing.
 *
 * Factory pattern (see searchFilter.svelte.ts): `createRecipeBrowse()` owns the
 * runes and hands back getters, so the page, the filter rail and the grid all
 * read one source of truth.
 *
 * The ordering is the point of the page. Season-first is not a sort the way
 * A–Z is a sort — it answers "what will I lose if I don't cook it this week",
 * so within the in-season set the narrowest window comes first. Wild garlic
 * with six days left outranks a squash that will still be there in November.
 *
 * Import without the .ts extension:
 *   import { createRecipeBrowse } from '$lib/js/recipeBrowse.svelte'
 */
import { SvelteSet } from 'svelte/reactivity';
import { activeSeasonWindow, recipeOverlapsMonth, type SeasonWindow } from './seasonRange';
import {
	MACRO_FILTER_DEFAULTS,
	MACRO_KCAL_CEILING,
	MACRO_PRESETS,
	isMacroFilterActive,
	matchesMacroFilter,
	type MacroFilter,
	type MacroPresetKey,
	type RecipeMacros
} from './recipeMacros';

export type RecipeSort = 'season' | 'alpha' | 'shuffle';

export type BrowseRecipe = {
	_id: string;
	name: string;
	short_name: string;
	category?: string;
	tags?: string[];
	icon?: string;
	description?: string;
	isFavorite?: boolean;
	macros?: RecipeMacros | null;
	seasonRanges?: unknown[];
};

/** A recipe plus what the listing works out about it, computed once per load. */
export type RankedRecipe = {
	recipe: BrowseRecipe;
	window: SeasonWindow | null;
	sortName: string;
};

/** Names carry markup and soft hyphens; neither belongs in a sort key. */
function plainName(name: string): string {
	return (name || '').replace(/<[^>]*>/g, '').replace(/&shy;|­/g, '');
}

export function normalizeSearchText(s: string): string {
	return s
		.toLowerCase()
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.replace(/&shy;|­/g, '');
}

export function createRecipeBrowse(
	getRecipes: () => BrowseRecipe[],
	getToday: () => Date = () => new Date()
) {
	let query = $state('');
	let category = $state<string | null>(null);
	const tags = new SvelteSet<string>();
	const months = new SvelteSet<number>();
	let inSeasonOnly = $state(false);
	let favoritesOnly = $state(false);
	let sort = $state<RecipeSort>('season');
	const macro = $state<MacroFilter>({ ...MACRO_FILTER_DEFAULTS });

	// Season maths runs once per recipe per load, not once per keystroke: it
	// resolves liturgical anchors across three years and is the most expensive
	// thing on the page.
	const decorated = $derived.by<RankedRecipe[]>(() => {
		const today = getToday();
		return getRecipes().map((recipe) => ({
			recipe,
			window: activeSeasonWindow(recipe as { seasonRanges?: never }, today),
			sortName: plainName(recipe.name)
		}));
	});

	// Normalised search text, cached per recipe object. Rebuilding it on every
	// keystroke is what makes a 250-recipe live search feel slow.
	const searchIndex = new WeakMap<object, string>();
	function searchStringFor(recipe: BrowseRecipe): string {
		const cached = searchIndex.get(recipe);
		if (cached !== undefined) return cached;
		const raw = [recipe.name || '', recipe.description || '', ...(recipe.tags || [])].join(' ');
		const norm = normalizeSearchText(raw);
		searchIndex.set(recipe, norm);
		return norm;
	}

	const terms = $derived(
		normalizeSearchText(query.trim())
			.split(' ')
			.filter((t) => t.length > 0)
	);

	function matchesQuery(entry: RankedRecipe): boolean {
		if (terms.length === 0) return true;
		const haystack = searchStringFor(entry.recipe);
		return terms.every((t) => haystack.includes(t));
	}

	function matchesCategory(entry: RankedRecipe): boolean {
		return !category || entry.recipe.category === category;
	}

	function matchesTags(entry: RankedRecipe): boolean {
		if (tags.size === 0) return true;
		const own = entry.recipe.tags || [];
		for (const t of tags) if (!own.includes(t)) return false;
		return true;
	}

	function matchesSeason(entry: RankedRecipe): boolean {
		if (inSeasonOnly && !entry.window) return false;
		if (months.size === 0) return true;
		for (const m of months) {
			if (recipeOverlapsMonth(entry.recipe as { seasonRanges?: never }, m)) return true;
		}
		return false;
	}

	function matchesFavorites(entry: RankedRecipe): boolean {
		return !favoritesOnly || !!entry.recipe.isFavorite;
	}

	function matchesMacros(entry: RankedRecipe): boolean {
		return matchesMacroFilter(entry.recipe.macros, macro);
	}

	/** Every predicate except one — the basis for honest facet counts. */
	function passesExcept(entry: RankedRecipe, skip: 'category' | 'tags' | 'none'): boolean {
		if (!matchesQuery(entry)) return false;
		if (skip !== 'category' && !matchesCategory(entry)) return false;
		if (skip !== 'tags' && !matchesTags(entry)) return false;
		if (!matchesSeason(entry)) return false;
		if (!matchesFavorites(entry)) return false;
		if (!matchesMacros(entry)) return false;
		return true;
	}

	const filtered = $derived(decorated.filter((e) => passesExcept(e, 'none')));

	function byName(a: RankedRecipe, b: RankedRecipe) {
		return a.sortName.localeCompare(b.sortName, 'de');
	}

	/** Narrowest window first, then the one closing soonest. */
	function byUrgency(a: RankedRecipe, b: RankedRecipe) {
		const aw = a.window!;
		const bw = b.window!;
		if (aw.lengthDays !== bw.lengthDays) return aw.lengthDays - bw.lengthDays;
		if (aw.daysLeft !== bw.daysLeft) return aw.daysLeft - bw.daysLeft;
		return byName(a, b);
	}

	const inSeason = $derived(
		sort === 'season' ? filtered.filter((e) => e.window).sort(byUrgency) : []
	);
	const rest = $derived.by(() => {
		if (sort === 'alpha') return [...filtered].sort(byName);
		if (sort === 'shuffle') return filtered;
		// Season order: the remainder keeps the server's daily shuffle, so the
		// tail of the page still changes from day to day.
		return filtered.filter((e) => !e.window);
	});

	const results = $derived([...inSeason, ...rest]);

	const categoryPool = $derived(decorated.filter((e) => passesExcept(e, 'category')));

	const categoryCounts = $derived.by(() => {
		const counts = new Map<string, number>();
		for (const e of categoryPool) {
			const c = e.recipe.category;
			if (c) counts.set(c, (counts.get(c) ?? 0) + 1);
		}
		return counts;
	});

	const tagCounts = $derived.by(() => {
		const counts = new Map<string, number>();
		for (const e of decorated) {
			if (!passesExcept(e, 'tags')) continue;
			for (const t of e.recipe.tags || []) counts.set(t, (counts.get(t) ?? 0) + 1);
		}
		return counts;
	});

	/** How many recipes have no calculated nutrition — the checkbox says so. */
	const unknownNutritionCount = $derived(decorated.filter((e) => !e.recipe.macros).length);

	const MACRO_BUCKETS = 10;
	const KCAL_BUCKET = 100;

	/**
	 * Where the collection actually sits on each axis, drawn behind the sliders.
	 * Without it a macro filter is guesswork — you cannot tell that asking for
	 * 60 % protein leaves you two recipes until you have already asked.
	 */
	const macroHistograms = $derived.by(() => {
		const share = () => new Array(MACRO_BUCKETS).fill(0);
		// One bar per 100 kcal up to the ceiling, plus a final ">ceiling" bin.
		const energy = new Array(MACRO_KCAL_CEILING / KCAL_BUCKET + 1).fill(0);
		const protein = share();
		const fat = share();
		const carbs = share();
		const bucket = (pct: number) => Math.min(MACRO_BUCKETS - 1, Math.floor(pct / (100 / MACRO_BUCKETS)));
		for (const e of decorated) {
			const macros = e.recipe.macros;
			if (!macros) continue;
			protein[bucket(macros.protein)]++;
			fat[bucket(macros.fat)]++;
			carbs[bucket(macros.carbs)]++;
			const kcal = macros.kcalPortion ?? macros.kcal100;
			energy[Math.min(energy.length - 1, Math.floor(kcal / KCAL_BUCKET))]++;
		}
		return { protein, fat, carbs, energy };
	});

	const activeCount = $derived.by(() => {
		let n = 0;
		if (query.trim()) n++;
		if (category) n++;
		n += tags.size;
		if (inSeasonOnly) n++;
		if (months.size > 0) n++;
		if (favoritesOnly) n++;
		if (isMacroFilterActive(macro)) n++;
		return n;
	});

	function applyPreset(key: MacroPresetKey) {
		const preset = MACRO_PRESETS[key] as Partial<MacroFilter>;
		const on = Object.entries(preset).every(([k, v]) => macro[k as keyof MacroFilter] === v);
		for (const [k, v] of Object.entries(preset)) {
			// Toggling off restores that axis's default rather than clearing the
			// whole panel — presets stack, so "high protein" and "light" can be on
			// together and dropping one leaves the other standing.
			(macro as Record<string, unknown>)[k] = on
				? MACRO_FILTER_DEFAULTS[k as keyof MacroFilter]
				: v;
		}
	}

	function resetMacros() {
		Object.assign(macro, MACRO_FILTER_DEFAULTS);
	}

	function reset() {
		query = '';
		category = null;
		tags.clear();
		months.clear();
		inSeasonOnly = false;
		favoritesOnly = false;
		resetMacros();
	}

	return {
		get query() { return query; },
		set query(v: string) { query = v; },
		get category() { return category; },
		set category(v: string | null) { category = v; },
		get tags() { return tags; },
		get months() { return months; },
		get inSeasonOnly() { return inSeasonOnly; },
		set inSeasonOnly(v: boolean) { inSeasonOnly = v; },
		get favoritesOnly() { return favoritesOnly; },
		set favoritesOnly(v: boolean) { favoritesOnly = v; },
		get sort() { return sort; },
		set sort(v: RecipeSort) { sort = v; },
		get macro() { return macro; },
		get results() { return results; },
		get inSeason() { return inSeason; },
		get rest() { return rest; },
		get total() { return decorated.length; },
		get categoryCounts() { return categoryCounts; },
		/** What "All" would leave — every other filter still applied. */
		get categoryAllCount() { return categoryPool.length; },
		get tagCounts() { return tagCounts; },
		get unknownNutritionCount() { return unknownNutritionCount; },
		get macroHistograms() { return macroHistograms; },
		get activeCount() { return activeCount; },
		get grouped() { return sort === 'season' && inSeason.length > 0; },
		toggleTag(tag: string) {
			if (tags.has(tag)) tags.delete(tag);
			else tags.add(tag);
		},
		toggleMonth(month: number) {
			if (months.has(month)) months.delete(month);
			else months.add(month);
		},
		applyPreset,
		resetMacros,
		reset,
		KCAL_CEILING: MACRO_KCAL_CEILING
	};
}

export type RecipeBrowse = ReturnType<typeof createRecipeBrowse>;
