/**
 * Dual-source embedding-based ingredient matching engine.
 * Priority: global overwrite → alias → BLS (German, primary) → USDA (English, fallback) → none
 *
 * BLS uses multilingual-e5-small for German ingredient names.
 * USDA uses all-MiniLM-L6-v2 for English ingredient names.
 */
import { pipeline, type FeatureExtractionPipeline } from '@huggingface/transformers';
import { read } from '$app/server';
import { NUTRITION_DB, type NutritionEntry } from '$lib/data/nutritionDb';
import { BLS_DB, type BlsEntry } from '$lib/data/blsDb';
import { lookupAlias } from '$lib/data/ingredientAliases';
import { canonicalizeUnit, resolveGramsPerUnit } from '$lib/data/unitConversions';
import { resolveDefaultAmount } from '$lib/data/defaultAmounts';
import type { NutritionMapping, NutritionPer100g } from '$types/types';
import { NutritionOverwrite } from '$models/NutritionOverwrite';
import usdaEmbeddingsUrl from '$lib/data/nutritionEmbeddings.json?url';
import blsEmbeddingsUrl from '$lib/data/blsEmbeddings.json?url';

const USDA_MODEL = 'Xenova/all-MiniLM-L6-v2';
const BLS_MODEL = 'Xenova/multilingual-e5-small';
const CONFIDENCE_THRESHOLD = 0.45;

// Lazy-loaded singletons — USDA
let usdaEmbedder: FeatureExtractionPipeline | null = null;
let usdaEmbeddingIndex: { fdcId: number; name: string; vector: number[] }[] | null = null;
let nutritionByFdcId: Map<number, NutritionEntry> | null = null;
let nutritionByName: Map<string, NutritionEntry> | null = null;

// Lazy-loaded singletons — BLS
let blsEmbedder: FeatureExtractionPipeline | null = null;
let blsEmbeddingIndex: { blsCode: string; name: string; vector: number[] }[] | null = null;
let blsByCode: Map<string, BlsEntry> | null = null;

/** Modifiers to strip from ingredient names before matching */
const STRIP_MODIFIERS = [
	'warm', 'cold', 'hot', 'room temperature', 'lukewarm',
	'fresh', 'freshly', 'dried', 'dry',
	'finely', 'coarsely', 'roughly', 'thinly',
	'chopped', 'diced', 'minced', 'sliced', 'grated', 'shredded',
	'crushed', 'ground', 'whole', 'halved', 'quartered',
	'peeled', 'unpeeled', 'pitted', 'seeded', 'deseeded',
	'melted', 'softened', 'frozen', 'thawed', 'chilled',
	'toasted', 'roasted', 'blanched', 'boiled', 'steamed',
	'sifted', 'packed', 'loosely packed', 'firmly packed',
	'small', 'medium', 'large', 'extra-large',
	'organic', 'free-range', 'grass-fed',
	'optional', 'to taste', 'as needed', 'for garnish', 'for serving',
	'about', 'approximately', 'roughly',
];

/** German modifiers to strip */
const STRIP_MODIFIERS_DE = [
	'warm', 'kalt', 'heiß', 'lauwarm', 'zimmerwarm',
	'frisch', 'getrocknet', 'trocken',
	'fein', 'grob', 'dünn',
	'gehackt', 'gewürfelt', 'geschnitten', 'gerieben', 'geraspelt',
	'gemahlen', 'ganz', 'halbiert', 'geviertelt',
	'geschält', 'entkernt', 'entsteint',
	'geschmolzen', 'weich', 'gefroren', 'aufgetaut', 'gekühlt',
	'geröstet', 'blanchiert', 'gekocht', 'gedämpft',
	'gesiebt',
	'klein', 'mittel', 'groß',
	'bio', 'optional', 'nach Geschmack', 'nach Bedarf', 'zum Garnieren',
	'etwa', 'ungefähr', 'ca',
];

// ── USDA helpers ──

function getNutritionByName(): Map<string, NutritionEntry> {
	if (!nutritionByName) {
		nutritionByName = new Map();
		for (const entry of NUTRITION_DB) nutritionByName.set(entry.name, entry);
	}
	return nutritionByName;
}

function getNutritionByFdcId(): Map<number, NutritionEntry> {
	if (!nutritionByFdcId) {
		nutritionByFdcId = new Map();
		for (const entry of NUTRITION_DB) nutritionByFdcId.set(entry.fdcId, entry);
	}
	return nutritionByFdcId;
}

async function getUsdaEmbedder(): Promise<FeatureExtractionPipeline> {
	if (!usdaEmbedder) {
		usdaEmbedder = await pipeline('feature-extraction', USDA_MODEL, { dtype: 'q8' });
	}
	return usdaEmbedder;
}

async function getUsdaEmbeddingIndex() {
	if (!usdaEmbeddingIndex) {
		const raw = await read(usdaEmbeddingsUrl).json();
		usdaEmbeddingIndex = raw.entries;
	}
	return usdaEmbeddingIndex!;
}

// ── BLS helpers ──

function getBlsByCode(): Map<string, BlsEntry> {
	if (!blsByCode) {
		blsByCode = new Map();
		for (const entry of BLS_DB) blsByCode.set(entry.blsCode, entry);
	}
	return blsByCode;
}

async function getBlsEmbedder(): Promise<FeatureExtractionPipeline> {
	if (!blsEmbedder) {
		blsEmbedder = await pipeline('feature-extraction', BLS_MODEL, { dtype: 'q8' });
	}
	return blsEmbedder;
}

async function getBlsEmbeddingIndex() {
	if (!blsEmbeddingIndex) {
		try {
			const raw = await read(blsEmbeddingsUrl).json();
			blsEmbeddingIndex = raw.entries;
		} catch {
			// BLS embeddings not yet generated — skip
			blsEmbeddingIndex = [];
		}
	}
	return blsEmbeddingIndex!;
}

// ── Shared ──

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

function cosineSimilarity(a: number[], b: number[]): number {
	let dot = 0, normA = 0, normB = 0;
	for (let i = 0; i < a.length; i++) {
		dot += a[i] * b[i];
		normA += a[i] * a[i];
		normB += b[i] * b[i];
	}
	return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/** Replace German umlauts and ß for fuzzy substring matching */
function deUmlaut(s: string): string {
	return s.replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 'ss');
}

/**
 * Generate singular/stem forms for a German word for substring matching.
 * Not full stemming — just common plural patterns.
 */
function germanSingulars(word: string): string[] {
	const base = deUmlaut(word);
	const forms = new Set([word, base]);
	// -n: Tomaten→Tomate, Kartoffeln→Kartoffel
	if (base.endsWith('n')) forms.add(base.slice(0, -1));
	// -en: Bohnen→Bohn (then also try Bohne)
	if (base.endsWith('en')) { forms.add(base.slice(0, -2)); forms.add(base.slice(0, -1)); }
	// -er: Eier→Ei
	if (base.endsWith('er')) forms.add(base.slice(0, -2));
	// -e: Birne→Birn (for compound matching)
	if (base.endsWith('e')) forms.add(base.slice(0, -1));
	// -s: (loanwords)
	if (base.endsWith('s')) forms.add(base.slice(0, -1));
	return [...forms].filter(f => f.length >= 2);
}

/** BLS categories that are prepared dishes — exclude from embedding-only matching */
const EXCLUDED_BLS_CATEGORIES = new Set([
	'Gerichte und Rezepte', 'Backwaren', 'Supplemente',
]);

/**
 * Generate search forms for an ingredient name, including compound word parts
 * and individual words for multi-word queries.
 * "Zitronenschale" → ["zitronenschale", "zitronen", "zitrone", "schale", ...]
 * "cinnamon stick" → ["cinnamon stick", "cinnamon", "stick", ...]
 */
function searchForms(query: string): string[] {
	const forms = new Set(germanSingulars(query.toLowerCase()));

	// Add individual words from multi-word queries
	const words = query.toLowerCase().split(/\s+/);
	for (const word of words) {
		if (word.length >= 3) {
			forms.add(word);
			forms.add(deUmlaut(word));
			for (const s of germanSingulars(word)) forms.add(s);
		}
	}

	// Try splitting common German compound suffixes
	const compoundSuffixes = [
		'schale', 'saft', 'stange', 'stück', 'pulver', 'blatt', 'blätter',
		'korn', 'körner', 'mehl', 'öl', 'ol', 'flocken', 'creme', 'mark',
		'wasser', 'milch', 'sahne', 'butter', 'käse', 'kase', 'soße', 'sosse',
	];
	const base = deUmlaut(query.toLowerCase());
	for (const suffix of compoundSuffixes) {
		if (base.endsWith(suffix) && base.length > suffix.length + 2) {
			const stem = base.slice(0, -suffix.length);
			forms.add(stem);
			for (const s of germanSingulars(stem)) forms.add(s);
		}
	}

	return [...forms].filter(f => f.length >= 3);
}

/**
 * Find substring matches in a name list. Returns indices of entries
 * where any form of the query appears in the entry name.
 */
function findSubstringMatches(
	query: string,
	entries: { name: string }[],
): number[] {
	const forms = searchForms(query);
	const matches: number[] = [];

	for (let i = 0; i < entries.length; i++) {
		const entryName = deUmlaut(entries[i].name.toLowerCase());
		for (const form of forms) {
			if (entryName.includes(form)) {
				matches.push(i);
				break;
			}
		}
	}
	return matches;
}

/**
 * Score a substring match, combining embedding similarity with heuristics:
 * - Word-boundary matches preferred over mid-word matches
 * - Shorter names are preferred (more likely base ingredients)
 * - Names containing "roh" (raw) get a bonus
 * - Names starting with the query get a bonus
 */
function substringMatchScore(
	embeddingScore: number,
	entryName: string,
	queryForms: string[],
): number {
	let score = embeddingScore;
	const nameLower = deUmlaut(entryName.toLowerCase());

	// Check how the query matches: word-start vs mid-compound vs trailing mention
	let hasStartMatch = false;
	let hasEarlyMatch = false; // within first 15 chars
	let hasWordBoundaryMatch = false;
	for (const form of queryForms) {
		// Start match: name begins with the query
		if (nameLower.startsWith(form + ' ') || nameLower.startsWith(form + ',') || nameLower === form) {
			hasStartMatch = true;
		}
		// Early match: appears within first ~15 chars (likely the main ingredient)
		const pos = nameLower.indexOf(form);
		if (pos >= 0 && pos < 15) hasEarlyMatch = true;
		// Word-boundary match
		const escaped = form.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		const wordBoundary = new RegExp(`(^|[\\s,/])${escaped}([\\s,/]|$)`);
		if (wordBoundary.test(nameLower)) hasWordBoundaryMatch = true;
	}

	// Strong bonus for name starting with query form
	if (hasStartMatch) score += 0.2;
	// Moderate bonus for early appearance in name
	else if (hasEarlyMatch) score += 0.12;
	// Small bonus for word-boundary match
	else if (hasWordBoundaryMatch) score += 0.05;
	// Penalty for late/trailing mentions (e.g., "mit Zimt" at end of a dish name)
	else score -= 0.05;

	// Bonus for short names (base ingredients like "Apfel roh" vs long dish names)
	// Short names get strong boost, long names get penalized
	score += Math.max(-0.1, (20 - nameLower.length) * 0.008);

	// Bonus for "roh" (raw) — but only if query starts the name (avoid boosting unrelated raw items)
	if (/\broh\b/.test(nameLower) && (hasStartMatch || hasWordBoundaryMatch)) score += 0.1;

	return score;
}

/**
 * Find best BLS match: substring-first hybrid.
 * 1. Find BLS entries whose name contains the ingredient (lexical match)
 * 2. Among those, rank by embedding + heuristic score
 * 3. If no lexical matches, fall back to full embedding search
 */
async function blsEmbeddingMatch(
	ingredientNameDe: string
): Promise<{ entry: BlsEntry; confidence: number } | null> {
	const index = await getBlsEmbeddingIndex();
	if (index.length === 0) return null;

	const emb = await getBlsEmbedder();
	const result = await emb(`query: ${ingredientNameDe}`, { pooling: 'mean', normalize: true });
	const queryVector = Array.from(result.data as Float32Array);
	const queryForms = searchForms(ingredientNameDe);

	// Find lexical substring matches first
	const substringIndices = findSubstringMatches(ingredientNameDe, index);

	if (substringIndices.length > 0) {
		let bestScore = -1;
		let bestItem: typeof index[0] | null = null;

		for (const idx of substringIndices) {
			const item = index[idx];
			const entry = getBlsByCode().get(item.blsCode);
			if (entry && EXCLUDED_BLS_CATEGORIES.has(entry.category)) continue;
			const embScore = cosineSimilarity(queryVector, item.vector);
			const score = substringMatchScore(embScore, item.name, queryForms);
			if (score > bestScore) {
				bestScore = score;
				bestItem = item;
			}
		}

		if (bestItem) {
			const entry = getBlsByCode().get(bestItem.blsCode);
			if (entry) {
				// Check if ANY substring match is a direct hit (query at start/early in name)
				const nameNorm = deUmlaut(bestItem.name.toLowerCase());
				const isDirectMatch = queryForms.some(f =>
					nameNorm.startsWith(f + ' ') || nameNorm.startsWith(f + ',') ||
					nameNorm.startsWith(f + '/') || nameNorm === f ||
					(nameNorm.indexOf(f) >= 0 && nameNorm.indexOf(f) < 12)
				);

				// Only use substring match if it's a direct hit — otherwise the query
				// word appears as a minor component in a dish name and we should
				// fall through to full search / USDA
				if (isDirectMatch) {
					const conf = Math.min(Math.max(bestScore, 0.7), 1.0);
					return { entry, confidence: conf };
				}
			}
		}
	}

	// Fall back to full embedding search (excluding prepared dishes)
	// Use higher threshold for pure embedding — short German words produce unreliable scores
	const EMBEDDING_ONLY_THRESHOLD = 0.85;
	let bestScore = -1;
	let bestItem: typeof index[0] | null = null;
	for (const item of index) {
		const entry = getBlsByCode().get(item.blsCode);
		if (entry && EXCLUDED_BLS_CATEGORIES.has(entry.category)) continue;
		const score = cosineSimilarity(queryVector, item.vector);
		if (score > bestScore) {
			bestScore = score;
			bestItem = item;
		}
	}

	if (!bestItem || bestScore < EMBEDDING_ONLY_THRESHOLD) return null;
	const entry = getBlsByCode().get(bestItem.blsCode);
	if (!entry) return null;
	return { entry, confidence: bestScore };
}

/** USDA categories that are prepared dishes — exclude from matching */
const EXCLUDED_USDA_CATEGORIES = new Set(['Restaurant Foods']);

/**
 * Score a USDA substring match with heuristics similar to BLS.
 */
function usdaSubstringMatchScore(
	embeddingScore: number,
	entryName: string,
	query: string,
): number {
	let score = embeddingScore;
	const nameLower = entryName.toLowerCase();
	const queryForms = searchForms(query);

	// Check match position
	let hasStartMatch = false;
	let hasEarlyMatch = false;
	for (const form of queryForms) {
		if (nameLower.startsWith(form + ',') || nameLower.startsWith(form + ' ') || nameLower === form) {
			hasStartMatch = true;
		}
		const pos = nameLower.indexOf(form);
		if (pos >= 0 && pos < 15) hasEarlyMatch = true;
	}

	if (hasStartMatch) score += 0.2;
	else if (hasEarlyMatch) score += 0.1;
	else score -= 0.05;

	// Bonus for short names — but moderate to avoid "Bread, X" beating "Spices, X, ground"
	score += Math.max(-0.1, (25 - nameLower.length) * 0.003);

	// Bonus for "raw" — base ingredient indicator (only if direct match)
	if (/\braw\b/.test(nameLower) && (hasStartMatch || hasEarlyMatch)) score += 0.1;

	// Bonus for category-style entries ("Spices, X" / "Seeds, X" / "Oil, X")
	if (/^(spices|seeds|oil|nuts|fish|cheese|milk|cream|butter|flour|sugar),/i.test(nameLower)) {
		score += 0.08;
	}

	return score;
}

/**
 * Find best USDA match: substring-first hybrid.
 * Same strategy as BLS: lexical matches first, heuristic re-ranking, then fallback.
 */
async function usdaEmbeddingMatch(
	ingredientNameEn: string
): Promise<{ entry: NutritionEntry; confidence: number } | null> {
	const emb = await getUsdaEmbedder();
	const index = await getUsdaEmbeddingIndex();

	const result = await emb(ingredientNameEn, { pooling: 'mean', normalize: true });
	const queryVector = Array.from(result.data as Float32Array);

	// Find lexical substring matches
	const substringIndices = findSubstringMatches(ingredientNameEn, index);

	if (substringIndices.length > 0) {
		let bestScore = -1;
		let bestItem: typeof index[0] | null = null;

		for (const idx of substringIndices) {
			const item = index[idx];
			const entry = getNutritionByFdcId().get(item.fdcId);
			if (entry && EXCLUDED_USDA_CATEGORIES.has(entry.category)) continue;
			const embScore = cosineSimilarity(queryVector, item.vector);
			const score = usdaSubstringMatchScore(embScore, item.name, ingredientNameEn);
			if (score > bestScore) {
				bestScore = score;
				bestItem = item;
			}
		}

		if (bestItem) {
			const nutrition = getNutritionByFdcId().get(bestItem.fdcId);
			if (nutrition) {
				const nameNorm = bestItem.name.toLowerCase();
				const forms = searchForms(ingredientNameEn);
				const isDirectMatch = forms.some(f =>
					nameNorm.startsWith(f + ',') || nameNorm.startsWith(f + ' ') ||
					nameNorm === f || (nameNorm.indexOf(f) >= 0 && nameNorm.indexOf(f) < 15)
				);
				if (isDirectMatch) {
					return { entry: nutrition, confidence: Math.min(Math.max(bestScore, 0.7), 1.0) };
				}
			}
		}
	}

	// Full embedding search fallback (excluding restaurant foods)
	let bestScore = -1;
	let bestEntry: typeof index[0] | null = null;

	for (const item of index) {
		const entry = getNutritionByFdcId().get(item.fdcId);
		if (entry && EXCLUDED_USDA_CATEGORIES.has(entry.category)) continue;
		const score = cosineSimilarity(queryVector, item.vector);
		if (score > bestScore) {
			bestScore = score;
			bestEntry = item;
		}
	}

	if (!bestEntry || bestScore < CONFIDENCE_THRESHOLD) return null;
	const nutrition = getNutritionByFdcId().get(bestEntry.fdcId);
	if (!nutrition) return null;
	return { entry: nutrition, confidence: bestScore };
}

/** Parse a recipe amount string to a number */
export function parseAmount(amount: string): number {
	if (!amount || !amount.trim()) return 0;
	let s = amount.trim();

	const rangeMatch = s.match(/^(\d+(?:[.,]\d+)?)\s*[-–]\s*(\d+(?:[.,]\d+)?)$/);
	if (rangeMatch) {
		return (parseFloat(rangeMatch[1].replace(',', '.')) + parseFloat(rangeMatch[2].replace(',', '.'))) / 2;
	}

	s = s.replace(',', '.');

	const fractionMatch = s.match(/^(\d+)\s*\/\s*(\d+)$/);
	if (fractionMatch) return parseInt(fractionMatch[1]) / parseInt(fractionMatch[2]);

	const mixedMatch = s.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
	if (mixedMatch) return parseInt(mixedMatch[1]) + parseInt(mixedMatch[2]) / parseInt(mixedMatch[3]);

	const parsed = parseFloat(s);
	return isNaN(parsed) ? 0 : parsed;
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
 * Match a single ingredient against BLS (German, primary) then USDA (English, fallback).
 */
export async function matchIngredient(
	ingredientNameDe: string,
	ingredientNameEn: string | undefined,
	unit: string,
	amount: string,
	sectionIndex: number,
	ingredientIndex: number,
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
	const overwrite = await lookupGlobalOverwrite(normalizedDe);
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

	// 1. Try alias table (English, fast path → USDA)
	if (matchMethod === 'none' && normalizedEn) {
		const aliasResult = lookupAlias(normalizedEn);
		if (aliasResult) {
			const entry = getNutritionByName().get(aliasResult);
			if (entry) {
				source = 'usda';
				fdcId = entry.fdcId;
				nutritionDbName = entry.name;
				matchMethod = 'exact';
				confidence = 1.0;
				portions = entry.portions;
				category = entry.category;
			}
		}
	}

	// 2. Try BLS embedding match (German name, primary)
	if (matchMethod === 'none' && normalizedDe) {
		const blsResult = await blsEmbeddingMatch(normalizedDe);
		if (blsResult) {
			source = 'bls';
			blsCode = blsResult.entry.blsCode;
			nutritionDbName = blsResult.entry.nameDe;
			matchMethod = 'embedding';
			confidence = blsResult.confidence;
			category = blsResult.entry.category;
			// BLS has no portion data — will use unit conversion tables
		}
	}

	// 3. Try USDA embedding match (English name, fallback)
	if (matchMethod === 'none' && normalizedEn) {
		const usdaResult = await usdaEmbeddingMatch(normalizedEn);
		if (usdaResult) {
			source = 'usda';
			fdcId = usdaResult.entry.fdcId;
			nutritionDbName = usdaResult.entry.name;
			matchMethod = 'embedding';
			confidence = usdaResult.confidence;
			portions = usdaResult.entry.portions;
			category = usdaResult.entry.category;
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
			// is resolved separately via resolveReferencedNutrition()
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

/**
 * Compute absolute nutrition totals for a recipe's ingredients using its nutritionMappings.
 * Returns total nutrients (not per-100g), optionally scaled by a multiplier.
 */
export function computeRecipeNutritionTotals(
	ingredients: any[],
	nutritionMappings: any[],
	multiplier = 1,
): Record<string, number> {
	const index = new Map(
		(nutritionMappings || []).map((m: any) => [`${m.sectionIndex}-${m.ingredientIndex}`, m])
	);

	const totals: Record<string, number> = {};

	// Collect section names for dedup (skip ingredients referencing earlier sections)
	const sectionNames = new Set<string>();

	for (let si = 0; si < ingredients.length; si++) {
		const section = ingredients[si];
		if (section.type === 'reference' || !section.list) {
			if (section.name) sectionNames.add(stripHtml(section.name).toLowerCase().trim());
			continue;
		}
		if (section.name) sectionNames.add(stripHtml(section.name).toLowerCase().trim());
	}

	for (let si = 0; si < ingredients.length; si++) {
		const section = ingredients[si];
		if (section.type === 'reference' || !section.list) continue;

		const currentSectionName = section.name ? stripHtml(section.name).toLowerCase().trim() : '';

		for (let ii = 0; ii < section.list.length; ii++) {
			const item = section.list[ii];
			const rawName = item.name || '';
			const itemName = stripHtml(rawName).toLowerCase().trim();

			// Skip anchor-tag references to other recipes (handled separately)
			if (/<a\s/i.test(rawName)) continue;

			// Skip if this ingredient name matches a DIFFERENT section's name
			if (itemName && sectionNames.has(itemName) && itemName !== currentSectionName) continue;

			const mapping = index.get(`${si}-${ii}`);
			if (!mapping || mapping.matchMethod === 'none' || mapping.excluded) continue;

			const per100g = resolvePer100g(mapping);
			if (!per100g) continue;

			const amount = parseAmount(item.amount || '') || (mapping.defaultAmountUsed ? 1 : 0);
			const grams = amount * multiplier * (mapping.gramsPerUnit || 0);
			const factor = grams / 100;

			for (const [key, value] of Object.entries(per100g)) {
				if (typeof value === 'number') {
					totals[key] = (totals[key] || 0) + factor * value;
				}
			}
		}
	}

	return totals;
}

/** Strip HTML tags from a string */
function stripHtml(html: string): string {
	return html.replace(/<[^>]*>/g, '');
}

/** Parse anchor href from ingredient name, return recipe short_name or null */
export function parseAnchorRecipeRef(ingredientName: string): string | null {
	const match = ingredientName.match(/<a\s+href=["']?([^"' >]+)["']?[^>]*>/i);
	if (!match) return null;
	let href = match[1].trim();
	href = href.split('?')[0];
	if (href.startsWith('http') || href.includes('://')) return null;
	href = href.replace(/^(\.?\/?rezepte\/|\.\/|\/)/, '');
	if (href.includes('.')) return null;
	return href || null;
}

export type ReferencedNutritionResult = {
	shortName: string;
	name: string;
	nutrition: Record<string, number>;
	baseMultiplier: number;
};

/**
 * Build nutrition totals for referenced recipes:
 * 1. Base recipe references (type='reference' with populated baseRecipeRef)
 * 2. Anchor-tag references in ingredient names (<a href=...>)
 *
 * When nutritionMappings are provided, uses recipeRefMultiplier from the
 * mapping for anchor-tag refs (allowing user-configured fractions).
 */
export async function resolveReferencedNutrition(
	ingredients: any[],
	nutritionMappings?: any[],
): Promise<ReferencedNutritionResult[]> {
	const { Recipe } = await import('$models/Recipe');
	const results: ReferencedNutritionResult[] = [];
	const processedSlugs = new Set<string>();

	// Build mapping index for recipeRefMultiplier lookup
	const mappingIndex = new Map(
		(nutritionMappings || [])
			.filter((m: any) => m.recipeRef)
			.map((m: any) => [m.recipeRef, m])
	);

	for (const section of ingredients) {
		// Type 1: Base recipe references
		if (section.type === 'reference' && section.baseRecipeRef) {
			const ref = section.baseRecipeRef;
			const slug = ref.short_name;
			if (processedSlugs.has(slug)) continue;
			processedSlugs.add(slug);

			if (ref.nutritionMappings?.length > 0) {
				const mult = section.baseMultiplier || 1;
				const nutrition = computeRecipeNutritionTotals(ref.ingredients || [], ref.nutritionMappings, 1);
				results.push({ shortName: slug, name: ref.name, nutrition, baseMultiplier: mult });
			}
		}

		// Type 2: Anchor-tag references in ingredient names
		if (section.list) {
			for (const item of section.list) {
				const refSlug = parseAnchorRecipeRef(item.name || '');
				if (!refSlug || processedSlugs.has(refSlug)) continue;
				processedSlugs.add(refSlug);

				const refRecipe = await Recipe.findOne({ short_name: refSlug })
					.select('short_name name ingredients nutritionMappings portions')
					.lean();
				if (!refRecipe?.nutritionMappings?.length) continue;

				const mult = mappingIndex.get(refSlug)?.recipeRefMultiplier ?? 1;
				const nutrition = computeRecipeNutritionTotals(
					refRecipe.ingredients || [], refRecipe.nutritionMappings, 1
				);
				results.push({ shortName: refSlug, name: refRecipe.name, nutrition, baseMultiplier: mult });
			}
		}
	}

	return results;
}
