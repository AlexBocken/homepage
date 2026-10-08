/**
 * "Ähnliche Rezepte": how alike two recipes are, from what they are made of.
 *
 *   score = (W_ING·ING + W_TAG·TAG + W_MAC·MAC) · (CAT_FLOOR + (1 − CAT_FLOOR)·CAT)
 *
 * - ING — soft cosine over the recipes' mapped ingredients. The nutrition
 *   mappings give every ingredient a language-independent id (BLS code or USDA
 *   fdcId), so the German and English pages agree. Each id is weighted by its
 *   share of the recipe's mass with a presence floor — so one heavy liquid can't
 *   decide the match on its own (milk made Milchreis "Béchamel") — times its
 *   IDF, so salt, flour and butter count little and rye or apricot count a lot.
 *   The "soft" part: the same food is often filed under two ids (BLS "Hühnerei
 *   roh" and USDA "Egg, whole, raw"; three kinds of sugar), so ids whose
 *   nutrient profiles nearly coincide count as partly the same ingredient (see
 *   `buildNeighbours`). Name embeddings were tried first and don't work: they
 *   encode the naming style ("…, raw", "… roh") more than the food, so garlic
 *   sat closer to broccoli than BLS flour to USDA flour.
 * - TAG — IDF-weighted cosine over the German tags: a shared "Sauerteig" says
 *   far more than a shared "süss".
 * - MAC — closeness of the nutrition shape: energy split and density, which
 *   tells sweet from savoury even when the ingredients overlap.
 * - CAT — category affinity as a gate rather than a term: it damps a match
 *   across unrelated categories without zeroing a strong ingredient overlap
 *   (Marillenmarmelade → Marillenknödel). Learned from the recipes rather
 *   than listed by hand, since categories are free text: how alike two
 *   categories' typical ingredients are (see `categoryAffinities`). Kuchen and
 *   Dessert come out close, Salat and Kuchen far apart.
 *
 * Pure apart from `collectRequests`' import: the caller hands every recipe in
 * and gets a score matrix back. Loading, caching and refreshing live in
 * `recipeSimilarityIndex`.
 */
import { ingredientGrams } from '$lib/js/ingredientAmount';
import { isAnchorRef } from '$lib/js/recipeRefs';
import { collectRequests, type RefRequest } from '$lib/server/recipeReferenceLinks';

export const W_ING = 0.55;
export const W_TAG = 0.3;
export const W_MAC = 0.15;
/** What the score keeps for a pair from unrelated categories. */
export const CAT_FLOOR = 0.6;
/** Nutrient-profile distance (see `nutrientDistance`) up to which two
 *  ingredients are the same food — sugar vs icing sugar, two butters. */
export const KERNEL_SAME = 0.1;
/** …and from which they are different foods. In between it fades linearly.
 *  Measured on the collection: ≤ 0.25 is ~180 of 93k pairs, nearly all true
 *  variants; beyond it come look-alikes such as tomato vs zucchini. */
export const KERNEL_MAX = 0.25;
/** Below this, a recipe is not suggested at all — like the hikes' radius. */
export const MIN_SCORE = 0.25;
export const RELATED_MAX = 3;
/** MMR trade-off: 1 is pure relevance, lower favours variety among the picks. */
export const MMR_LAMBDA = 0.8;
/** Base recipes nest at most this deep when expanded into their users. */
const MAX_REF_DEPTH = 2;
/** Macro distance at which nutrition shape counts as entirely different. */
const MAC_SCALE = 0.8;
/** Energy density beyond which recipes are equally "heavy". */
const KCAL_CAP = 600;

/** The fields of a lean recipe document the metric reads. */
export type SimilaritySource = {
	_id: unknown;
	short_name: string;
	category?: string;
	tags?: string[];
	isBaseRecipe?: boolean;
	ingredients?: any[];
	nutritionMappings?: any[];
	cachedPer100g?: Record<string, unknown> | null;
};

type Mapping = {
	source?: string;
	blsCode?: string;
	fdcId?: number;
	nutritionDbName?: string;
	excluded?: boolean;
	recipeRef?: string;
	gramsPerUnit?: number;
	defaultAmount?: number;
	sectionIndex: number;
	ingredientIndex: number;
};

/**
 * The stable id of a mapped food, or null for an unmapped line. `source` wins:
 * a row matched to BLS can still carry a stale fdcId from an earlier match.
 */
export function ingredientKey(m: Mapping): string | null {
	if (m.source === 'bls' && m.blsCode) return `b:${m.blsCode}`;
	if (m.source === 'usda' && m.fdcId) return `u:${m.fdcId}`;
	if (m.blsCode) return `b:${m.blsCode}`;
	if (m.fdcId) return `u:${m.fdcId}`;
	return null;
}

/** Ingredient key → grams, the recipe's own lines only. */
export function ownIngredientGrams(recipe: SimilaritySource): Map<string, number> {
	const out = new Map<string, number>();
	const sections = recipe.ingredients ?? [];
	for (const m of (recipe.nutritionMappings ?? []) as Mapping[]) {
		if (m.excluded || m.recipeRef) continue;
		const item = sections[m.sectionIndex]?.list?.[m.ingredientIndex];
		// A linked line is another recipe, expanded by `ingredientProfile`.
		if (item && isAnchorRef(item.name)) continue;
		const key = ingredientKey(m);
		if (!key) continue;
		out.set(key, (out.get(key) ?? 0) + ingredientGrams(m, item?.amount));
	}
	return out;
}

/**
 * Ingredient key → grams, base recipes expanded into their ingredients and
 * scaled by how much of them is used — so a pizza that says "Pizzateig" is
 * still made of flour, water and yeast.
 */
export function ingredientProfile(
	recipe: SimilaritySource,
	resolve: (request: RefRequest) => SimilaritySource | undefined,
	depth = 0,
): Map<string, number> {
	const out = ownIngredientGrams(recipe);
	if (depth >= MAX_REF_DEPTH) return out;
	for (const request of collectRequests(recipe.ingredients ?? [], recipe.nutritionMappings)) {
		const base = resolve(request);
		if (!base || base === recipe) continue;
		const scale = request.baseMultiplier || 1;
		for (const [key, grams] of ingredientProfile(base, resolve, depth + 1)) {
			out.set(key, (out.get(key) ?? 0) + grams * scale);
		}
	}
	return out;
}

/** `log((N+1)/(df+1)) + 1` per term, over one bag of terms per document. */
export function buildIdf(docs: Iterable<Iterable<string>>, n: number): Map<string, number> {
	const df = new Map<string, number>();
	for (const doc of docs) for (const term of new Set(doc)) df.set(term, (df.get(term) ?? 0) + 1);
	const idf = new Map<string, number>();
	for (const [term, count] of df) idf.set(term, Math.log((n + 1) / (count + 1)) + 1);
	return idf;
}

/** Presence floor plus damped mass share, sharpened by IDF. */
export function ingredientWeight(massShare: number, idf: number): number {
	return (0.4 + 0.6 * Math.sqrt(Math.max(0, massShare))) * idf ** 1.5;
}

/** Energy shares of protein, fat, carbs and sugar, plus capped density. */
export function macroVector(per100g: Record<string, unknown> | null | undefined): Float64Array | null {
	if (!per100g) return null;
	const num = (k: string) => (typeof per100g[k] === 'number' ? (per100g[k] as number) : 0);
	const p = num('protein') * 4;
	const f = num('fat') * 9;
	const c = num('carbs') * 4;
	const s = num('sugars') * 4;
	const total = p + f + c;
	if (total <= 0) return null;
	return Float64Array.of(p / total, f / total, c / total, s / total, Math.min(num('calories'), KCAL_CAP) / KCAL_CAP);
}

/** 1 for identical nutrition shape, 0 at `MAC_SCALE` apart; ½ when unknown. */
export function macroSimilarity(a: Float64Array | null, b: Float64Array | null): number {
	if (!a || !b) return 0.5;
	let d = 0;
	for (let i = 0; i < a.length; i++) d += (a[i] - b[i]) ** 2;
	return 1 - Math.min(1, Math.sqrt(d) / MAC_SCALE);
}

/**
 * The per-100 g fields a nutrient profile compares. Enough micronutrients that
 * two foods with the same macros (white flour, white rice) still differ.
 */
export const NUTRIENT_FEATURES = [
	'calories', 'protein', 'fat', 'saturatedFat', 'carbs', 'fiber', 'sugars', 'starch',
	'cholesterol', 'sodium', 'calcium', 'iron', 'potassium', 'magnesium', 'vitaminC',
	'vitaminA', 'alcohol',
] as const;

/** Per-feature centre and spread, for standardising profiles. */
export type FeatureScale = { mean: Float64Array; sd: Float64Array };

function rawFeatures(per100g: Record<string, unknown>): Float64Array {
	return Float64Array.from(NUTRIENT_FEATURES, (f) => {
		const v = per100g[f];
		return Math.log1p(typeof v === 'number' && v > 0 ? v : 0);
	});
}

/**
 * The scale to standardise with, from a population of profiles — the whole
 * BLS and USDA tables in production, so it never moves between builds and
 * cached kernel rows stay valid.
 */
export function featureScale(population: Iterable<Record<string, unknown>>): FeatureScale {
	const k = NUTRIENT_FEATURES.length;
	const sum = new Float64Array(k);
	const sq = new Float64Array(k);
	let n = 0;
	for (const per100g of population) {
		const x = rawFeatures(per100g);
		for (let i = 0; i < k; i++) {
			sum[i] += x[i];
			sq[i] += x[i] * x[i];
		}
		n++;
	}
	const mean = sum.map((s) => (n ? s / n : 0));
	const sd = sq.map((s, i) => Math.sqrt(Math.max(0, n ? s / n - mean[i] ** 2 : 0)) || 1);
	return { mean, sd };
}

/** log1p of each feature, standardised. */
export function nutrientProfile(per100g: Record<string, unknown>, scale: FeatureScale): Float64Array {
	const x = rawFeatures(per100g);
	for (let i = 0; i < x.length; i++) x[i] = (x[i] - scale.mean[i]) / scale.sd[i];
	return x;
}

/** RMS difference of two standardised profiles. */
export function nutrientDistance(a: Float64Array, b: Float64Array): number {
	let d = 0;
	for (let i = 0; i < a.length; i++) d += (a[i] - b[i]) ** 2;
	return Math.sqrt(d / a.length);
}

/** Kernel value for two profiles' distance: 1 for the same food, fading to 0. */
export function kernelValue(distance: number): number {
	if (distance <= KERNEL_SAME) return 1;
	if (distance >= KERNEL_MAX) return 0;
	return (KERNEL_MAX - distance) / (KERNEL_MAX - KERNEL_SAME);
}

/** Off-diagonal kernel entries for one ingredient: `[otherKey, k]` pairs. */
export type Neighbours = Map<string, Array<[string, number]>>;

/**
 * The sparse kernel over every ingredient with a profile. A few hundred
 * ingredients with ~17 features each is a few million operations, so it is
 * rebuilt whole each time; `tick` is awaited between rows so the caller can
 * yield the event loop.
 */
export async function buildNeighbours(
	profiles: Map<string, Float64Array>,
	tick: () => Promise<void> = async () => {},
): Promise<Neighbours> {
	const keys = [...profiles.keys()];
	const vecs = keys.map((k) => profiles.get(k)!);
	const neighbours: Neighbours = new Map(keys.map((k) => [k, []]));
	for (let i = 0; i < keys.length; i++) {
		for (let j = i + 1; j < keys.length; j++) {
			const k = kernelValue(nutrientDistance(vecs[i], vecs[j]));
			if (k > 0) {
				neighbours.get(keys[i])!.push([keys[j], k]);
				neighbours.get(keys[j])!.push([keys[i], k]);
			}
		}
		await tick();
	}
	return neighbours;
}

/** A sparse vector over interned term ids. */
export type Sparse = { idx: Int32Array; w: Float64Array };

function sparse(entries: Map<number, number>): Sparse {
	const sorted = [...entries].sort((a, b) => a[0] - b[0]);
	return { idx: Int32Array.from(sorted, (e) => e[0]), w: Float64Array.from(sorted, (e) => e[1]) };
}

/** `a · dense` where `dense` holds the other vector scattered by term id. */
function dotDense(a: Sparse, dense: Float64Array): number {
	let d = 0;
	for (let i = 0; i < a.idx.length; i++) d += a.w[i] * dense[a.idx[i]];
	return d;
}

function scatter(a: Sparse, dense: Float64Array): void {
	for (let i = 0; i < a.idx.length; i++) dense[a.idx[i]] = a.w[i];
}

function clear(a: Sparse, dense: Float64Array): void {
	for (let i = 0; i < a.idx.length; i++) dense[a.idx[i]] = 0;
}

/**
 * Affinity between every two categories, learned from the recipes rather than
 * listed by hand (categories are free text). For each signal — ingredients and
 * tags — every category gets the mean of its recipes' vectors (each normalised
 * first, so a long recipe doesn't speak for its whole category); the affinity
 * is the cosine between two categories' means, averaged over the signals. A
 * category is 1 with itself.
 *
 * Both signals, because each alone has a blind spot: by ingredients alone
 * Sauce sits close to Dessert (vanilla sauce is milk and sugar), by tags alone
 * Brot is far from the doughs filed as Zutat. Measured on the collection:
 * Kuchen–Dessert ≈ 0.6, Hauptspeise–Beilage ≈ 0.5, Sauce–Dessert ≈ 0.3,
 * Salat–Kuchen ≈ 0.1.
 */
export function categoryAffinities(
	categories: (string | undefined)[],
	signals: { vectors: Sparse[]; dim: number }[],
): { index: Map<string, number>; matrix: Float64Array } {
	const index = new Map<string, number>();
	for (const c of categories) if (c && !index.has(c)) index.set(c, index.size);
	const m = index.size;
	const matrix = new Float64Array(m * m);

	for (const { vectors, dim } of signals) {
		const centroids = Array.from({ length: m }, () => new Float64Array(dim));
		vectors.forEach((v, i) => {
			const c = categories[i] ? index.get(categories[i]!)! : -1;
			let norm = 0;
			for (const w of v.w) norm += w * w;
			if (c < 0 || norm === 0) return;
			norm = Math.sqrt(norm);
			for (let k = 0; k < v.idx.length; k++) centroids[c][v.idx[k]] += v.w[k] / norm;
		});
		const norms = centroids.map((c) => Math.sqrt(c.reduce((s, x) => s + x * x, 0)));
		for (let a = 0; a < m; a++) {
			for (let b = a + 1; b < m; b++) {
				if (!norms[a] || !norms[b]) continue;
				let d = 0;
				for (let k = 0; k < dim; k++) d += centroids[a][k] * centroids[b][k];
				const cos = d / (norms[a] * norms[b]) / signals.length;
				matrix[a * m + b] += cos;
				matrix[b * m + a] += cos;
			}
		}
	}
	for (let a = 0; a < m; a++) matrix[a * m + a] = 1;
	return { index, matrix };
}

export type ScoreComponents = { ing: Float32Array; tag: Float32Array; mac: Float32Array; cat: Float32Array };

export type ScoreMatrix = {
	n: number;
	/** Row-major `n × n`, symmetric, zero diagonal. */
	scores: Float32Array;
	/** The parts, for the tuning report only. */
	components?: ScoreComponents;
};

/**
 * Score every pair of `recipes`.
 *
 * `neighbours` is the ingredient kernel (missing keys fall back to exact-id
 * matching). Soft cosine is computed as `(aK)·b`: each recipe's vector is
 * expanded once through the kernel, after which every pair is an ordinary
 * sparse dot product against a scattered dense row.
 */
export async function scoreMatrix(
	recipes: SimilaritySource[],
	neighbours: Neighbours,
	opts: { tick?: () => Promise<void>; withComponents?: boolean } = {},
): Promise<ScoreMatrix> {
	const tick = opts.tick ?? (async () => {});
	const n = recipes.length;

	// ── Ingredient vectors ──
	const bySlug = new Map(recipes.map((r) => [r.short_name, r]));
	const byId = new Map(recipes.map((r) => [String(r._id), r]));
	const resolve = (req: RefRequest) =>
		req.slug
			? (bySlug.get(req.slug) ?? bySlug.get(req.slug.replace(/_/g, '-')) ?? bySlug.get(req.slug.replace(/-/g, '_')))
			: byId.get(String(req.id));
	const profiles: Map<string, number>[] = [];
	for (const r of recipes) {
		profiles.push(ingredientProfile(r, resolve));
		await tick();
	}
	const ingIdf = buildIdf(profiles.map((p) => p.keys()), n);

	const ingId = new Map<string, number>();
	const intern = (key: string) => {
		let id = ingId.get(key);
		if (id === undefined) ingId.set(key, (id = ingId.size));
		return id;
	};
	const ingVec: Sparse[] = [];
	const ingExpanded: Sparse[] = [];
	for (const profile of profiles) {
		let total = 0;
		for (const g of profile.values()) total += g;
		const own = new Map<number, number>();
		const expanded = new Map<number, number>();
		for (const [key, grams] of profile) {
			const w = ingredientWeight(total > 0 ? grams / total : 0, ingIdf.get(key) ?? 1);
			own.set(intern(key), w);
			expanded.set(intern(key), (expanded.get(intern(key)) ?? 0) + w);
			for (const [other, k] of neighbours.get(key) ?? []) {
				expanded.set(intern(other), (expanded.get(intern(other)) ?? 0) + w * k);
			}
		}
		ingVec.push(sparse(own));
		ingExpanded.push(sparse(expanded));
		await tick();
	}
	const ingDense = new Float64Array(ingId.size);
	const ingNorm = ingVec.map((v, i) => {
		scatter(v, ingDense);
		const self = dotDense(ingExpanded[i], ingDense);
		clear(v, ingDense);
		return Math.sqrt(self);
	});

	// ── Tag vectors ──
	const tagLists = recipes.map((r) => (r.tags ?? []).filter(Boolean));
	const tagIdf = buildIdf(tagLists, n);
	const tagId = new Map([...tagIdf.keys()].map((t, i) => [t, i]));
	const tagVec = tagLists.map((tags) => sparse(new Map(tags.map((t) => [tagId.get(t)!, tagIdf.get(t)!]))));
	const tagNorm = tagVec.map((v) => Math.sqrt(v.w.reduce((s, w) => s + w * w, 0)));
	const tagDense = new Float64Array(tagId.size);

	const macros = recipes.map((r) => macroVector(r.cachedPer100g));

	const categories = categoryAffinities(
		recipes.map((r) => r.category),
		[
			{ vectors: ingVec, dim: ingId.size },
			{ vectors: tagVec, dim: tagId.size },
		],
	);
	const m = categories.index.size;
	const catOf = recipes.map((r) => (r.category ? categories.index.get(r.category)! : -1));

	const scores = new Float32Array(n * n);
	const components = opts.withComponents
		? {
				ing: new Float32Array(n * n),
				tag: new Float32Array(n * n),
				mac: new Float32Array(n * n),
				cat: new Float32Array(n * n),
			}
		: undefined;

	for (let i = 0; i < n; i++) {
		scatter(ingVec[i], ingDense);
		scatter(tagVec[i], tagDense);
		for (let j = i + 1; j < n; j++) {
			const ingDen = ingNorm[i] * ingNorm[j];
			const ing = ingDen > 0 ? Math.min(1, dotDense(ingExpanded[j], ingDense) / ingDen) : 0;
			const tagDen = tagNorm[i] * tagNorm[j];
			const tag = tagDen > 0 ? dotDense(tagVec[j], tagDense) / tagDen : 0;
			const mac = macroSimilarity(macros[i], macros[j]);
			const cat = catOf[i] < 0 || catOf[j] < 0 ? 0 : categories.matrix[catOf[i] * m + catOf[j]];
			const s = (W_ING * ing + W_TAG * tag + W_MAC * mac) * (CAT_FLOOR + (1 - CAT_FLOOR) * cat);
			scores[i * n + j] = scores[j * n + i] = s;
			if (components) {
				for (const [arr, v] of [
					[components.ing, ing],
					[components.tag, tag],
					[components.mac, mac],
					[components.cat, cat],
				] as const) {
					arr[i * n + j] = arr[j * n + i] = v;
				}
			}
		}
		clear(ingVec[i], ingDense);
		clear(tagVec[i], tagDense);
		await tick();
	}
	return { n, scores, components };
}

/**
 * Up to `max` recipes for row `i`, by maximal marginal relevance: each pick is
 * the candidate most like `i` and least like what was already picked, so three
 * near-identical breads give way to a different strong match. Ties go to the
 * lower index, which the caller keeps in a stable (short_name) order.
 */
export function pickRelated(
	scores: Float32Array,
	n: number,
	i: number,
	eligible: (j: number) => boolean,
	opts: { max?: number; min?: number; lambda?: number; exclude?: Iterable<number> } = {},
): number[] {
	const max = opts.max ?? RELATED_MAX;
	const min = opts.min ?? MIN_SCORE;
	const lambda = opts.lambda ?? MMR_LAMBDA;
	if (max <= 0) return [];
	const taken = new Set(opts.exclude ?? []);
	taken.add(i);

	const pool: number[] = [];
	for (let j = 0; j < n; j++) {
		if (!taken.has(j) && scores[i * n + j] >= min && eligible(j)) pool.push(j);
	}
	pool.sort((a, b) => scores[i * n + b] - scores[i * n + a] || a - b);
	pool.length = Math.min(pool.length, max * 5);

	const picked: number[] = [];
	const against = [...taken].filter((t) => t !== i);
	while (picked.length < max && pool.length > 0) {
		let best = -1;
		let bestValue = -Infinity;
		for (const c of pool) {
			let redundancy = 0;
			for (const p of [...against, ...picked]) redundancy = Math.max(redundancy, scores[c * n + p]);
			const value = lambda * scores[i * n + c] - (1 - lambda) * redundancy;
			if (value > bestValue) {
				bestValue = value;
				best = c;
			}
		}
		picked.push(best);
		pool.splice(pool.indexOf(best), 1);
	}
	return picked;
}
