/**
 * ExerciseDB enrichment layer.
 * Merges the static exercises.ts catalog with ExerciseDB v2 data
 * to provide a unified, enriched exercise set.
 */
import type { Exercise, LocalizedExercise, MetricField } from './exercises';
import { localizeExercise, translateTerm, getExerciseMetrics, METRIC_PRESETS } from './exercises';
import { exerciseDbMap, slugToExerciseDbId } from './exercisedb-map';
import { edbMuscleToSimple, edbMusclesToGroups, edbBodyPartToSimple, edbEquipmentToSimple } from './muscleMap';
import rawData from './exercisedb-raw.json';
import { fuzzyScore } from '$lib/js/fuzzy';

// Access static exercises via the exported map
import { exercises as staticExercises } from './exercises';

interface EdbRawExercise {
	exerciseId: string;
	name: string;
	overview?: string;
	instructions?: string[];
	exerciseTips?: string[];
	variations?: string[];
	targetMuscles?: string[];
	secondaryMuscles?: string[];
	bodyParts?: string[];
	equipments?: string[];
	exerciseType?: string;
	relatedExerciseIds?: string[];
}

export interface EnrichedExercise extends Exercise {
	edbId: string | null;
	overview: string | null;
	tips: string[];
	variations: string[];
	targetMusclesDetailed: string[];
	secondaryMusclesDetailed: string[];
	heroImage: string | null;
	videoUrl: string | null;
}

export interface LocalizedEnrichedExercise extends LocalizedExercise {
	edbId: string | null;
	overview: string | null;
	tips: string[];
	variations: string[];
	targetMusclesDetailed: string[];
	secondaryMusclesDetailed: string[];
	heroImage: string | null;
	videoUrl: string | null;
}

// Build static exercise lookup
const staticMap = new Map<string, Exercise>(staticExercises.map(e => [e.id, e]));

// Build EDB exercise lookup by exerciseId
const edbExercises = (rawData as { exercises: EdbRawExercise[] }).exercises;
const edbById = new Map<string, EdbRawExercise>(edbExercises.map(e => [e.exerciseId, e]));

// Set of all EDB IDs in our dataset (for filtering relatedExerciseIds)
const edbIdSet = new Set(edbExercises.map(e => e.exerciseId));

/** Convert an EDB exercise to an enriched Exercise */
function edbToEnriched(edb: EdbRawExercise, slug: string, staticEx?: Exercise): EnrichedExercise {
	const targetGroups = edbMusclesToGroups(edb.targetMuscles ?? []);
	const secondaryGroups = edbMusclesToGroups(edb.secondaryMuscles ?? []);

	// Base exercise fields — prefer static data when available
	const base: Exercise = staticEx
		? { ...staticEx }
		: {
			id: slug,
			name: edb.name.trim(),
			bodyPart: edbBodyPartToSimple(edb.bodyParts?.[0] ?? ''),
			equipment: edbEquipmentToSimple(edb.equipments?.[0] ?? 'body weight'),
			target: targetGroups[0] ?? 'full body',
			secondaryMuscles: secondaryGroups.filter(g => !targetGroups.includes(g)),
			instructions: edb.instructions ?? [],
		};

	// For static exercises, merge in EDB secondary muscles if richer
	if (staticEx && edb.secondaryMuscles && edb.secondaryMuscles.length > staticEx.secondaryMuscles.length) {
		base.secondaryMuscles = secondaryGroups.filter(g => !targetGroups.includes(g));
	}

	return {
		...base,
		edbId: edb.exerciseId,
		overview: edb.overview ?? null,
		tips: edb.exerciseTips ?? [],
		variations: edb.variations ?? [],
		targetMusclesDetailed: edb.targetMuscles ?? [],
		secondaryMusclesDetailed: edb.secondaryMuscles ?? [],
		heroImage: `/fitness/exercises/${edb.exerciseId}/720p.jpg`,
		videoUrl: `/fitness/exercises/${edb.exerciseId}/video.mp4`,
	};
}

// Build the unified exercise set
const allEnriched = new Map<string, EnrichedExercise>();

// 1. Add all EDB-mapped exercises (200)
for (const [edbId, slug] of Object.entries(exerciseDbMap)) {
	const edb = edbById.get(edbId);
	if (!edb) continue;
	const staticEx = staticMap.get(slug);
	allEnriched.set(slug, edbToEnriched(edb, slug, staticEx));
}

// 2. Add remaining static exercises not in EDB (77 - 23 = 54)
for (const ex of staticExercises) {
	if (!allEnriched.has(ex.id)) {
		allEnriched.set(ex.id, {
			...ex,
			edbId: null,
			overview: null,
			tips: [],
			variations: [],
			targetMusclesDetailed: [],
			secondaryMusclesDetailed: [],
			heroImage: ex.imageUrl ?? null,
			videoUrl: null,
		});
	}
}

const allExercisesArray = [...allEnriched.values()];

/** Localize an enriched exercise */
export function localizeEnriched(e: EnrichedExercise, lang: 'en' | 'de'): LocalizedEnrichedExercise {
	const localized = localizeExercise(e, lang);
	return {
		...localized,
		edbId: e.edbId,
		overview: e.overview,
		tips: e.tips,
		variations: e.variations,
		targetMusclesDetailed: e.targetMusclesDetailed,
		secondaryMusclesDetailed: e.secondaryMusclesDetailed,
		heroImage: e.heroImage,
		videoUrl: e.videoUrl,
	};
}

/** Get a single enriched exercise by slug */
export function getEnrichedExerciseById(id: string, lang?: 'en' | 'de'): LocalizedEnrichedExercise | undefined {
	const e = allEnriched.get(id);
	if (!e) return undefined;
	return localizeEnriched(e, lang ?? 'en');
}

/** Get exercise metrics (delegates to static logic) */
export { getExerciseMetrics } from './exercises';

/** Get all filter options across the full exercise set */
export function getFilterOptionsAll(): {
	bodyParts: string[];
	equipment: string[];
	targets: string[];
} {
	const bodyParts = new Set<string>();
	const equipment = new Set<string>();
	const targets = new Set<string>();

	for (const e of allExercisesArray) {
		bodyParts.add(e.bodyPart);
		equipment.add(e.equipment);
		targets.add(e.target);
	}

	return {
		bodyParts: [...bodyParts].sort(),
		equipment: [...equipment].sort(),
		targets: [...targets].sort(),
	};
}

/** Search all exercises with fuzzy matching */
export function searchAllExercises(opts: {
	search?: string;
	bodyPart?: string;
	equipment?: string | string[];
	target?: string;
	muscleGroups?: string[];
	lang?: 'en' | 'de';
}): LocalizedEnrichedExercise[] {
	const lang = opts.lang ?? 'en';
	let results: LocalizedEnrichedExercise[] = allExercisesArray.map(e => localizeEnriched(e, lang));

	if (opts.bodyPart) {
		results = results.filter(e => e.bodyPart === opts.bodyPart);
	}
	if (opts.equipment) {
		const eqSet = Array.isArray(opts.equipment) ? new Set(opts.equipment) : new Set([opts.equipment]);
		results = results.filter(e => eqSet.has(e.equipment));
	}
	if (opts.target) {
		results = results.filter(e => e.target === opts.target);
	}
	if (opts.muscleGroups?.length) {
		const groups = new Set(opts.muscleGroups);
		results = results.filter(e => {
			// Check detailed EDB muscles
			if (e.targetMusclesDetailed?.length) {
				const tg = edbMusclesToGroups(e.targetMusclesDetailed);
				const sg = edbMusclesToGroups(e.secondaryMusclesDetailed ?? []);
				return tg.some(g => groups.has(g)) || sg.some(g => groups.has(g));
			}
			// Fallback: check simplified target/secondaryMuscles
			return groups.has(e.target) || e.secondaryMuscles.some(m => groups.has(m));
		});
	}
	if (opts.search) {
		const query = opts.search.toLowerCase();
		const scored: { exercise: LocalizedEnrichedExercise; score: number }[] = [];
		for (const e of results) {
			const text = `${e.localName} ${e.name} ${e.localTarget} ${e.localBodyPart} ${e.localEquipment} ${e.localSecondaryMuscles.join(' ')}`.toLowerCase();
			const score = fuzzyScore(query, text);
			if (score > 0) scored.push({ exercise: e, score });
		}
		scored.sort((a, b) => b.score - a.score);
		results = scored.map(s => s.exercise);
	}

	return results;
}

/** Find similar exercises by target muscle + body part */
export function findSimilarExercises(id: string, limit = 4, lang?: 'en' | 'de'): LocalizedEnrichedExercise[] {
	const source = allEnriched.get(id);
	if (!source) return [];

	// First try: relatedExerciseIds that exist in our set
	const related: LocalizedEnrichedExercise[] = [];
	const edbId = source.edbId;
	if (edbId) {
		const edb = edbById.get(edbId);
		if (edb?.relatedExerciseIds) {
			for (const relId of edb.relatedExerciseIds) {
				if (related.length >= limit) break;
				if (!edbIdSet.has(relId)) continue;
				const slug = exerciseDbMap[relId];
				if (slug && slug !== id) {
					const enriched = getEnrichedExerciseById(slug, lang);
					if (enriched) related.push(enriched);
				}
			}
		}
	}

	// Fill remaining slots with target muscle + body part matches
	if (related.length < limit) {
		const relatedIds = new Set(related.map(r => r.id));
		relatedIds.add(id);

		const candidates = allExercisesArray
			.filter(e => !relatedIds.has(e.id))
			.map(e => {
				let score = 0;
				if (e.target === source.target) score += 3;
				if (e.bodyPart === source.bodyPart) score += 2;
				if (e.equipment === source.equipment) score += 1;
				return { exercise: e, score };
			})
			.filter(c => c.score > 0)
			.sort((a, b) => b.score - a.score);

		for (const c of candidates) {
			if (related.length >= limit) break;
			related.push(localizeEnriched(c.exercise, lang ?? 'en'));
		}
	}

	return related;
}

/** Total count of all exercises */
export const totalExerciseCount = allExercisesArray.length;
