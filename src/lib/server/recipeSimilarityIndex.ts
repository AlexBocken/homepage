/**
 * The live "Ähnliche Rezepte" index: every recipe pair scored once, kept in
 * memory, swapped out whole when recipes change. A page request never scores
 * anything — it reads a row of the current snapshot and picks from it.
 *
 * Lifecycle:
 * - Boot: `warmRecipeSimilarity()` from `init` builds the first snapshot in the
 *   background. A request that beats it waits at most `COLD_WAIT_MS`, then
 *   gets the hand-picked recipes only.
 * - Edits: write paths call `markRecipesChanged()`. Debounced, so regenerating
 *   every recipe's nutrition is one rebuild; single-flight, so a change during
 *   a build queues exactly one more.
 * - Safety net: at most every `FINGERPRINT_EVERY_MS`, a request compares the
 *   collection's count + newest `updatedAt` with the snapshot's, which catches
 *   writes no trigger covers (scripts, mongosh, the e2e seed).
 *
 * A build is cut into slices of at most ~`SLICE_MS` with `setImmediate` in
 * between, so it never holds the event loop longer than an ordinary request.
 *
 * The ingredient kernel needs each mapped food's nutrient profile, read from
 * the BLS and USDA tables. Those are imported on the first build only — the
 * food search index has them in memory by then anyway.
 */
import { Recipe } from '$models/Recipe';
import { dbConnect } from '$utils/db';
import { findBriefs } from '$lib/server/recipeBriefs';
import {
	RELATED_MAX,
	buildNeighbours,
	featureScale,
	ingredientKey,
	nutrientProfile,
	pickRelated,
	scoreMatrix,
	type SimilaritySource,
} from '$lib/server/recipeSimilarity';
import type { BriefRecipeType } from '$types/types';

const PROJECTION =
	'short_name category tags isBaseRecipe ingredients nutritionMappings cachedPer100g relatedRecipes ' +
	'translations.en.short_name translations.en.translationStatus';
const DEBOUNCE_MS = 3000;
const FINGERPRINT_EVERY_MS = 10 * 60_000;
const COLD_WAIT_MS = 250;
const SLICE_MS = 8;

type Snapshot = {
	n: number;
	ids: string[];
	/** German short_name → row, and English short_name → row. */
	bySlug: { de: Map<string, number>; en: Map<string, number> };
	scores: Float32Array;
	isBase: Uint8Array;
	enApproved: Uint8Array;
	/** Hand-picked rows per row: its own picks in order, then the recipes that
	 *  picked it, most similar first. */
	manual: number[][];
	fingerprint: string;
};

let snapshot: Snapshot | null = null;
let inflight: Promise<void> | null = null;
let dirty = false;
let debounce: ReturnType<typeof setTimeout> | null = null;
let lastFingerprintCheck = 0;

/** Ingredient key → standardised nutrient profile, filled on demand. */
let profileOf: ((key: string) => Float64Array | null) | null = null;

/** Start the first build. Resolves when it is done; never rejects. */
export function warmRecipeSimilarity(): Promise<void> {
	return requestBuild();
}

/** Recipes changed: rebuild soon. Fire-and-forget, costs the caller nothing. */
export function markRecipesChanged(): void {
	if (debounce) clearTimeout(debounce);
	debounce = setTimeout(() => {
		debounce = null;
		void requestBuild();
	}, DEBOUNCE_MS);
	debounce.unref?.();
}

function requestBuild(): Promise<void> {
	if (inflight) {
		dirty = true;
		return inflight;
	}
	inflight = (async () => {
		do {
			dirty = false;
			try {
				await build();
			} catch (error) {
				// The old snapshot keeps serving; the next trigger retries.
				console.error('[similarity] build failed:', error);
			}
		} while (dirty);
	})().finally(() => {
		inflight = null;
	});
	return inflight;
}

async function fingerprint(): Promise<string> {
	const [count, latest] = await Promise.all([
		Recipe.countDocuments(),
		Recipe.findOne({}, 'updatedAt').sort({ updatedAt: -1 }).lean<{ updatedAt?: Date }>(),
	]);
	return `${count}:${latest?.updatedAt ? new Date(latest.updatedAt).getTime() : 0}`;
}

function maybeCheckFingerprint(): void {
	const now = Date.now();
	if (inflight || now - lastFingerprintCheck < FINGERPRINT_EVERY_MS) return;
	lastFingerprintCheck = now;
	fingerprint()
		.then((fp) => {
			if (fp !== snapshot?.fingerprint) void requestBuild();
		})
		.catch((error) => console.error('[similarity] fingerprint check failed:', error));
}

/** Cooperative time slicing: `tick()` yields once a slice has run `SLICE_MS`. */
function createSlicer() {
	let start = performance.now();
	let longest = 0;
	return {
		async tick() {
			const now = performance.now();
			if (now - start < SLICE_MS) return;
			longest = Math.max(longest, now - start);
			await new Promise((resolve) => setImmediate(resolve));
			start = performance.now();
		},
		longest() {
			return Math.max(longest, performance.now() - start);
		},
	};
}

/**
 * Resolve ingredient keys to nutrient profiles. The tables are a ~20 MB import,
 * so they are loaded once, dynamically, and standardised against their own
 * full population so a profile never changes between builds.
 */
async function loadProfiles(): Promise<(key: string) => Float64Array | null> {
	if (profileOf) return profileOf;
	const [{ BLS_DB }, { NUTRITION_DB }] = await Promise.all([
		import('$lib/data/blsDb'),
		import('$lib/data/nutritionDb'),
	]);
	const bls = new Map(BLS_DB.map((e) => [e.blsCode, e.per100g as unknown as Record<string, unknown>]));
	const usda = new Map(NUTRITION_DB.map((e) => [e.fdcId, e.per100g as unknown as Record<string, unknown>]));
	const scale = featureScale([...bls.values(), ...usda.values()]);
	const cache = new Map<string, Float64Array | null>();
	profileOf = (key) => {
		let profile = cache.get(key);
		if (profile === undefined) {
			const per100g = key.startsWith('b:') ? bls.get(key.slice(2)) : usda.get(Number(key.slice(2)));
			profile = per100g ? nutrientProfile(per100g, scale) : null;
			cache.set(key, profile);
		}
		return profile;
	};
	return profileOf;
}

async function build(): Promise<void> {
	const t0 = performance.now();
	await dbConnect();
	// Taken before the read, so a write landing mid-build fails the next check.
	const fp = await fingerprint();
	const docs = await Recipe.find({}, PROJECTION).sort({ short_name: 1 }).lean<
		(SimilaritySource & {
			relatedRecipes?: unknown[];
			translations?: { en?: { short_name?: string; translationStatus?: string } };
		})[]
	>();
	const profile = await loadProfiles();

	const profiles = new Map<string, Float64Array>();
	for (const doc of docs) {
		for (const m of doc.nutritionMappings ?? []) {
			const key = ingredientKey(m);
			const p = key && !profiles.has(key) ? profile(key) : null;
			if (p) profiles.set(key!, p);
		}
	}

	const slicer = createSlicer();
	const neighbours = await buildNeighbours(profiles, slicer.tick);
	const { n, scores } = await scoreMatrix(docs, neighbours, { tick: slicer.tick });

	const ids = docs.map((d) => String(d._id));
	const row = new Map(ids.map((id, i) => [id, i]));
	const de = new Map<string, number>();
	const en = new Map<string, number>();
	docs.forEach((d, i) => {
		de.set(d.short_name, i);
		const enSlug = d.translations?.en?.short_name;
		if (enSlug) en.set(enSlug, i);
	});

	const own: number[][] = docs.map((d, i) =>
		[...new Set((d.relatedRecipes ?? []).map((r) => row.get(String(r))))].filter(
			(j): j is number => j !== undefined && j !== i,
		),
	);
	const manual = own.map((picks) => [...picks]);
	const pickedBy: number[][] = docs.map(() => []);
	own.forEach((picks, i) => picks.forEach((j) => pickedBy[j].push(i)));
	pickedBy.forEach((others, j) => {
		others
			.filter((i) => !manual[j].includes(i))
			.sort((a, b) => scores[j * n + b] - scores[j * n + a] || a - b)
			.forEach((i) => manual[j].push(i));
	});

	snapshot = {
		n,
		ids,
		bySlug: { de, en },
		scores,
		isBase: Uint8Array.from(docs, (d) => (d.isBaseRecipe ? 1 : 0)),
		enApproved: Uint8Array.from(docs, (d) => (d.translations?.en?.translationStatus === 'approved' ? 1 : 0)),
		manual,
		fingerprint: fp,
	};
	lastFingerprintCheck = Date.now();
	console.log(
		`[similarity] scored ${n} recipes in ${Math.round(performance.now() - t0)}ms ` +
			`(longest slice ${slicer.longest().toFixed(1)}ms, ${profiles.size} ingredients)`,
	);
}

/**
 * The related recipes' ids for the recipe at `slug`, manual picks first, then
 * automatic suggestions up to `RELATED_MAX`. English lists only recipes with an
 * approved translation; base recipes are suggested only for base recipes.
 */
export async function relatedRecipeIds(slug: string, lang: 'de' | 'en'): Promise<string[]> {
	maybeCheckFingerprint();
	if (!snapshot) {
		const ready = requestBuild();
		await Promise.race([ready, new Promise((resolve) => setTimeout(resolve, COLD_WAIT_MS))]);
	}
	const snap = snapshot;
	if (!snap) return manualOnly(slug, lang);

	const i = snap.bySlug[lang].get(slug);
	if (i === undefined) return [];
	const visible = (j: number) => lang === 'de' || snap.enApproved[j] === 1;
	const manual = snap.manual[i].filter(visible).slice(0, RELATED_MAX);
	const auto = pickRelated(
		snap.scores,
		snap.n,
		i,
		(j) => visible(j) && (snap.isBase[j] === 0 || snap.isBase[i] === 1),
		{ max: RELATED_MAX - manual.length, exclude: manual },
	);
	return [...manual, ...auto].map((j) => snap.ids[j]);
}

/** Cold start without a snapshot: the hand-picked links, straight from Mongo. */
async function manualOnly(slug: string, lang: 'de' | 'en'): Promise<string[]> {
	await dbConnect();
	const field = lang === 'en' ? 'translations.en.short_name' : 'short_name';
	const self = await Recipe.findOne({ [field]: slug }, '_id relatedRecipes').lean<{
		_id: string;
		relatedRecipes?: string[];
	}>();
	if (!self) return [];
	const pickedBy = await Recipe.find({ relatedRecipes: { $in: [self._id] } }, '_id').lean<{ _id: string }[]>();
	const ids = [...(self.relatedRecipes ?? []), ...pickedBy.map((d) => d._id)].map(String);
	return [...new Set(ids)].filter((id) => id !== String(self._id)).slice(0, RELATED_MAX);
}

/** The related recipes as listing cards, in display order. */
export async function relatedRecipeBriefs(slug: string, recipeLang: string): Promise<BriefRecipeType[]> {
	const lang = recipeLang === 'recipes' ? 'en' : 'de';
	const ids = await relatedRecipeIds(slug, lang);
	if (ids.length === 0) return [];
	const briefs = await findBriefs(recipeLang, { _id: { $in: ids } });
	const order = new Map(ids.map((id, i) => [id, i]));
	briefs.sort((a, b) => (order.get(String(a._id)) ?? 0) - (order.get(String(b._id)) ?? 0));
	// Lean documents carry ObjectIds (the recipe's and its images'), which a load
	// function can't return — the listing endpoints get away with it only because
	// `json()` stringifies them. Same round trip here.
	return JSON.parse(JSON.stringify(briefs));
}
