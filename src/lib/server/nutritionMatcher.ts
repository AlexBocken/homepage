/**
 * Ingredient → nutrition entry matching.
 * Priority: global overwrite → learned ranking over BLS + USDA → none
 *
 * The ranking (nutritionReranker.ts) embeds the ingredient with a multilingual-e5-small
 * fine-tuned on ingredient lines, gathers candidates by embedding and char n-grams,
 * and scores them with a linear model trained on labelled lines. Manual choices —
 * global overwrites and per-recipe edits — feed its popularity and nearest-label
 * features, so a correction also steers similar names, not just the exact one.
 */
import { pipeline, type FeatureExtractionPipeline } from '@huggingface/transformers';
import { read } from '$app/server';
import { NUTRITION_DB, type NutritionEntry } from '$lib/data/nutritionDb';
import { BLS_DB, type BlsEntry } from '$lib/data/blsDb';
import { usdaNameDe } from '$lib/data/usdaNamesDe';
import { canonicalizeUnit, resolveGramsPerUnit } from '$lib/data/unitConversions';
import { resolveDefaultAmount } from '$lib/data/defaultAmounts';
import { parseAmount } from '$lib/js/ingredientAmount';
import { parseAnchorRecipeRef } from '$lib/js/recipeRefs';
import { STRIP_MODIFIERS, STRIP_MODIFIERS_DE } from '$lib/data/ingredientModifiers';
import type { NutritionMapping, NutritionPer100g } from '$types/types';
import { NutritionOverwrite } from '$models/NutritionOverwrite';
import { Recipe } from '$models/Recipe';
import {
	NUTRITION_MODEL,
	NutritionReranker,
	rankEntries,
	type EntryEmbeddingFile,
	type LabelledLine,
	type RerankerWeights
} from './nutritionReranker';
import entryEmbeddingsUrl from '$lib/data/nutritionEntryEmbeddings.json?url';
import trainingLinesUrl from '$lib/data/nutritionTrainingLines.json?url';
import rerankerWeights from '$lib/data/nutritionReranker.json';

// Lazy-loaded singletons
let embedder: FeatureExtractionPipeline | null = null;
let reranker: Promise<NutritionReranker> | null = null;
let nutritionByFdcId: Map<number, NutritionEntry> | null = null;
let blsByCode: Map<string, BlsEntry> | null = null;
/** Seeded by preloadRerankerData() when running outside SvelteKit */
let preloaded: { embeddings: EntryEmbeddingFile; lines: LabelledLine[] } | null = null;

function getNutritionByFdcId(): Map<number, NutritionEntry> {
	if (!nutritionByFdcId) {
		nutritionByFdcId = new Map();
		for (const entry of NUTRITION_DB) nutritionByFdcId.set(entry.fdcId, entry);
	}
	return nutritionByFdcId;
}

function getBlsByCode(): Map<string, BlsEntry> {
	if (!blsByCode) {
		blsByCode = new Map();
		for (const entry of BLS_DB) blsByCode.set(entry.blsCode, entry);
	}
	return blsByCode;
}

async function embedQuery(text: string): Promise<Float32Array> {
	if (!embedder) embedder = await pipeline('feature-extraction', NUTRITION_MODEL, { dtype: 'q8' });
	const result = await embedder(`query: ${text}`, { pooling: 'mean', normalize: true });
	return result.data as Float32Array;
}

/**
 * Seed the reranker's data from outside SvelteKit. `read()` is only available
 * inside the app runtime, so a vite-node script (e.g. a migration re-running the
 * matcher) must hand the parsed files in here first — otherwise the lazy loader
 * below calls read() and throws. The app itself never calls this.
 */
export function preloadRerankerData(embeddings: EntryEmbeddingFile, lines: LabelledLine[]) {
	preloaded = { embeddings, lines };
}

/** Generated training lines plus every manual choice in the DB */
async function labelledLines(base: LabelledLine[]): Promise<LabelledLine[]> {
	const manual: LabelledLine[] = [];
	const keyOf = (m: { source?: string; blsCode?: string; fdcId?: number }) =>
		m.source === 'bls' && m.blsCode ? `bls:${m.blsCode}` : m.source === 'usda' && m.fdcId ? `usda:${m.fdcId}` : null;
	for (const o of overwriteCache?.values() ?? []) {
		const key = !o.excluded && keyOf(o);
		if (key) manual.push({ de: o.ingredientNameDe, keys: [key] });
	}
	try {
		const recipes = await Recipe.find({ 'nutritionMappings.manuallyEdited': true }, { nutritionMappings: 1 }).lean();
		for (const r of recipes as any[]) {
			for (const m of r.nutritionMappings ?? []) {
				const key = m.manuallyEdited && !m.excluded && !m.recipeRef && keyOf(m);
				if (key && m.ingredientNameDe) manual.push({ de: normalizeIngredientNameDe(m.ingredientNameDe), keys: [key] });
			}
		}
	} catch {
		/* rank without the recipe edits */
	}
	return [...base, ...manual];
}

let baseLines: LabelledLine[] = [];
async function getReranker(): Promise<NutritionReranker> {
	if (!reranker) {
		reranker = (async () => {
			const embeddings: EntryEmbeddingFile = preloaded?.embeddings ?? (await read(entryEmbeddingsUrl).json());
			baseLines = preloaded?.lines ?? (await read(trainingLinesUrl).json());
			const entries = rankEntries(BLS_DB, NUTRITION_DB, usdaNameDe);
			return new NutritionReranker(entries, embeddings, rerankerWeights as RerankerWeights, await labelledLines(baseLines));
		})();
		reranker.catch(() => (reranker = null));
	}
	return reranker;
}

/** Build the ranker in the background so the first recipe save doesn't wait for it. */
export function warmNutritionMatcher(): Promise<unknown> {
	return getReranker();
}

// ── Normalisation ──

/** Normalize an ingredient name for matching (English) */
export function normalizeIngredientName(name: string): string {
	let normalized = name.replace(/<[^>]*>/g, '').toLowerCase().trim();
	normalized = normalized.replace(/\(.*?\)/g, '').trim();
	for (const mod of STRIP_MODIFIERS) {
		normalized = normalized.replace(new RegExp(`\\b${mod}\\b,?\\s*`, 'gi'), '').trim();
	}
	normalized = normalized.replace(/\s+/g, ' ').replace(/,\s*$/, '').trim();
	return normalized;
}

/** Normalize a German ingredient name for matching */
export function normalizeIngredientNameDe(name: string): string {
	let normalized = name.replace(/<[^>]*>/g, '').toLowerCase().trim();
	normalized = normalized.replace(/\(.*?\)/g, '').trim();
	for (const mod of STRIP_MODIFIERS_DE) {
		normalized = normalized.replace(new RegExp(`\\b${mod}\\b,?\\s*`, 'gi'), '').trim();
	}
	normalized = normalized.replace(/\s+/g, ' ').replace(/,\s*$/, '').trim();
	return normalized;
}

/** Best entry for an ingredient, with its probability among the candidates */
async function rankMatch(nameDe: string, nameEn: string | undefined) {
	const text = nameDe || nameEn!;
	const [rr, query] = await Promise.all([getReranker(), embedQuery(text)]);
	const best = rr.rank(text, nameEn || undefined, query)[0];
	if (!best) return null;
	const [source, code] = best.key.split(':');
	if (source === 'bls') {
		const entry = getBlsByCode().get(code);
		return entry && { source: 'bls' as const, entry, confidence: best.prob };
	}
	const entry = getNutritionByFdcId().get(Number(code));
	return entry && { source: 'usda' as const, entry, confidence: best.prob };
}

// ── Global overwrite cache ──
let overwriteCache: Map<string, any> | null = null;
let overwriteCacheTime = 0;
const OVERWRITE_CACHE_TTL = 60_000; // 1 minute

async function lookupGlobalOverwrite(normalizedNameDe: string): Promise<any | null> {
	const now = Date.now();
	if (!overwriteCache || now - overwriteCacheTime > OVERWRITE_CACHE_TTL) {
		try {
			const all = await NutritionOverwrite.find({}).lean();
			overwriteCache = new Map(all.map((o: any) => [o.ingredientNameDe, o]));
			overwriteCacheTime = now;
			// manual choices steer similar names too: refresh them in a ready ranker
			if (reranker) reranker.then(async (rr) => rr.setLabels(await labelledLines(baseLines))).catch(() => {});
		} catch {
			overwriteCache = new Map();
			overwriteCacheTime = now;
		}
	}
	return overwriteCache.get(normalizedNameDe) || null;
}

/** Invalidate the overwrite cache (call after creating/updating/deleting overwrites) */
export function invalidateOverwriteCache() {
	overwriteCache = null;
}

/**
 * Match a single ingredient: a global overwrite if there is one, else the
 * reranker's best entry from BLS and USDA.
 */
export async function matchIngredient(
	ingredientNameDe: string,
	ingredientNameEn: string | undefined,
	unit: string,
	amount: string,
	sectionIndex: number,
	ingredientIndex: number,
	/**
	 * `ignoreOverwrites` skips step 0 below and matches from scratch. Only used to
	 * repair an overwrite that points at an entry which no longer exists: deriving
	 * its replacement means asking what this ingredient would match to *without*
	 * the broken overwrite short-circuiting the answer.
	 */
	opts?: { ignoreOverwrites?: boolean },
): Promise<NutritionMapping> {
	const normalizedEn = ingredientNameEn ? normalizeIngredientName(ingredientNameEn) : '';
	const normalizedDe = normalizeIngredientNameDe(ingredientNameDe);

	let source: 'bls' | 'usda' = 'usda';
	let fdcId: number | undefined;
	let blsCode: string | undefined;
	let nutritionDbName: string | undefined;
	let matchMethod: NutritionMapping['matchMethod'] = 'none';
	let confidence = 0;
	let portions: { description: string; grams: number }[] = [];
	let category = '';

	// 0. Check global overwrites (DB-stored manual mappings)
	const overwrite = opts?.ignoreOverwrites ? null : await lookupGlobalOverwrite(normalizedDe);
	if (overwrite) {
		if (overwrite.excluded || overwrite.source === 'skip') {
			return {
				sectionIndex, ingredientIndex,
				ingredientName: ingredientNameEn || ingredientNameDe,
				ingredientNameDe,
				source: 'usda', matchMethod: 'manual', matchConfidence: 1,
				gramsPerUnit: 0, defaultAmountUsed: false,
				unitConversionSource: 'none', manuallyEdited: false, excluded: true,
			};
		}
		if (overwrite.source === 'bls' && overwrite.blsCode) {
			const entry = getBlsByCode().get(overwrite.blsCode);
			if (entry) {
				source = 'bls'; blsCode = overwrite.blsCode;
				nutritionDbName = entry.nameDe; matchMethod = 'exact';
				confidence = 1.0; category = entry.category;
			}
		} else if (overwrite.source === 'usda' && overwrite.fdcId) {
			const entry = getNutritionByFdcId().get(overwrite.fdcId);
			if (entry) {
				source = 'usda'; fdcId = overwrite.fdcId;
				nutritionDbName = entry.name; matchMethod = 'exact';
				confidence = 1.0; portions = entry.portions; category = entry.category;
			}
		}
	}

	// 1. Learned ranking over BLS + USDA
	if (matchMethod === 'none' && (normalizedDe || normalizedEn)) {
		const best = await rankMatch(normalizedDe, normalizedEn);
		if (best?.source === 'bls') {
			source = 'bls';
			blsCode = best.entry.blsCode;
			nutritionDbName = best.entry.nameDe;
			category = best.entry.category;
			// BLS has no portion data — will use unit conversion tables
		} else if (best) {
			source = 'usda';
			fdcId = best.entry.fdcId;
			nutritionDbName = best.entry.name;
			portions = best.entry.portions;
			category = best.entry.category;
		}
		if (best) {
			matchMethod = 'embedding';
			confidence = best.confidence;
		}
	}

	// Resolve unit conversion
	const canonicalUnit = canonicalizeUnit(unit);
	let parsedAmount = parseAmount(amount);
	let defaultAmountUsed = false;

	// If no amount given, try default amounts
	if (!parsedAmount && matchMethod !== 'none') {
		const nameForDefault = normalizedEn || normalizedDe;
		const defaultAmt = resolveDefaultAmount(nameForDefault, category);
		if (defaultAmt) {
			parsedAmount = defaultAmt.amount;
			const defaultCanonical = canonicalizeUnit(defaultAmt.unit);
			const unitResolution = resolveGramsPerUnit(defaultCanonical, portions);
			defaultAmountUsed = true;

			return {
				sectionIndex, ingredientIndex,
				ingredientName: ingredientNameEn || ingredientNameDe,
				ingredientNameDe,
				source, fdcId, blsCode, nutritionDbName,
				matchConfidence: confidence, matchMethod,
				gramsPerUnit: unitResolution.grams,
				defaultAmountUsed,
				// The number, not just the fact. A category fallback can be half a
				// teaspoon of a spice or a quarter of one; recording only the boolean
				// left every consumer multiplying by a whole unit, so those lines were
				// counted at two to four times what was meant.
				defaultAmount: defaultAmt.amount,
				unitConversionSource: unitResolution.source,
				manuallyEdited: false,
				excluded: defaultAmt.amount === 0,
			};
		}
	}

	const unitResolution = resolveGramsPerUnit(canonicalUnit, portions);

	return {
		sectionIndex, ingredientIndex,
		ingredientName: ingredientNameEn || ingredientNameDe,
		ingredientNameDe,
		source, fdcId, blsCode, nutritionDbName,
		matchConfidence: confidence, matchMethod,
		gramsPerUnit: unitResolution.grams,
		defaultAmountUsed,
		unitConversionSource: unitResolution.source,
		manuallyEdited: false,
		excluded: false,
	};
}

/**
 * Generate nutrition mappings for all ingredients in a recipe.
 * Uses German names for BLS matching and English names for USDA fallback.
 */
export async function generateNutritionMappings(
	ingredients: any[],
	translatedIngredients?: any[],
): Promise<NutritionMapping[]> {
	const mappings: NutritionMapping[] = [];

	for (let sectionIdx = 0; sectionIdx < ingredients.length; sectionIdx++) {
		const sectionDe = ingredients[sectionIdx];
		const sectionEn = translatedIngredients?.[sectionIdx];

		if (sectionDe.type === 'reference' || !sectionDe.list) continue;

		for (let itemIdx = 0; itemIdx < sectionDe.list.length; itemIdx++) {
			const itemDe = sectionDe.list[itemIdx];
			const itemEn = sectionEn?.list?.[itemIdx];

			// Anchor-tag references to other recipes — their nutrition
			// is resolved separately via resolveReferences()
			const refSlug = parseAnchorRecipeRef(itemDe.name || '');
			if (refSlug) {
				mappings.push({
					sectionIndex: sectionIdx,
					ingredientIndex: itemIdx,
					ingredientName: itemEn?.name || itemDe.name,
					ingredientNameDe: itemDe.name,
					matchMethod: 'none',
					matchConfidence: 0,
					gramsPerUnit: 0,
					defaultAmountUsed: false,
					unitConversionSource: 'none',
					manuallyEdited: false,
					excluded: true,
					recipeRef: refSlug,
					recipeRefMultiplier: 1,
				});
				continue;
			}

			const mapping = await matchIngredient(
				itemDe.name,
				itemEn?.name || undefined,
				itemDe.unit || '',
				itemDe.amount || '',
				sectionIdx,
				itemIdx,
			);

			mappings.push(mapping);
		}
	}

	return mappings;
}

/** Look up a USDA NutritionEntry by fdcId */
export function getNutritionEntryByFdcId(fdcId: number): NutritionEntry | undefined {
	return getNutritionByFdcId().get(fdcId);
}

/** Look up a BLS entry by blsCode */
export function getBlsEntryByCode(code: string): BlsEntry | undefined {
	return getBlsByCode().get(code);
}

/** Resolve per100g data for a mapping from BLS or USDA */
export function resolvePer100g(mapping: any): NutritionPer100g | null {
	if (mapping.blsCode && mapping.source === 'bls') {
		const entry = getBlsByCode().get(mapping.blsCode);
		return entry?.per100g ?? null;
	}
	if (mapping.fdcId) {
		const entry = getNutritionByFdcId().get(mapping.fdcId);
		return entry?.per100g ?? null;
	}
	return null;
}
