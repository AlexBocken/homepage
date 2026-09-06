/**
 * Server side of the exercise catalogue: runs the search over the full
 * ExerciseDB data and projects the results to `ExerciseSummary`. Used by the
 * catalogue endpoints and by the exercises page's server load, which needs the
 * first result set for a script-free render.
 */
import {
	getEnrichedExerciseById,
	getFilterOptionsAll,
	searchAllExercises,
	type LocalizedEnrichedExercise
} from '$lib/data/exercisedb';
import type { CatalogFilters, CatalogQuery, ExerciseSummary } from '$lib/fitness/exerciseCatalog';

export function toSummary(e: LocalizedEnrichedExercise): ExerciseSummary {
	return {
		id: e.id,
		name: e.name,
		localName: e.localName,
		...(e.exerciseType ? { exerciseType: e.exerciseType } : {}),
		bodyPart: e.bodyPart,
		equipment: e.equipment,
		target: e.target,
		localBodyPart: e.localBodyPart,
		localEquipment: e.localEquipment,
		localTarget: e.localTarget
	};
}

export function searchCatalog(query: CatalogQuery, lang: 'en' | 'de'): ExerciseSummary[] {
	const type = query.type ?? 'all';
	let results = searchAllExercises({
		search: query.q?.trim() || undefined,
		equipment: query.equipment?.length ? query.equipment : undefined,
		muscleGroups: query.muscles?.length ? query.muscles : undefined,
		target: query.target || undefined,
		// Cardio is its own category; only the stretch/strength split goes
		// through stretchFilter. An explicit bodyPart list wins over the tab.
		bodyPart: query.bodyParts?.length ? query.bodyParts : type === 'cardio' ? 'cardio' : undefined,
		stretchFilter: type === 'stretch' || type === 'non-stretch' ? type : undefined,
		lang
	});
	// Keep the categories mutually exclusive: "Strength" means non-stretch *and* non-cardio.
	if (type === 'non-stretch') results = results.filter((e) => e.bodyPart !== 'cardio');
	return results.map(toSummary);
}

export function catalogFilters(): CatalogFilters {
	return getFilterOptionsAll();
}

/** Localised display names for a set of ids; ids the catalogue does not know are absent. */
export function exerciseNames(ids: string[], lang: 'en' | 'de'): Record<string, string> {
	const out: Record<string, string> = {};
	for (const id of ids) {
		const e = getEnrichedExerciseById(id, lang);
		if (e) out[id] = e.localName;
	}
	return out;
}
