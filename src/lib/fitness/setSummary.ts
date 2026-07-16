/**
 * One-line "best set" summaries for a logged exercise — the text under each
 * exercise on a history card.
 *
 * Lives outside the component so the branching is testable without mounting, and
 * so any other surface that needs the same sentence reuses it rather than
 * re-deriving which metric matters for which exercise.
 */

import { getExerciseById, getExerciseMetrics, isTimedMetrics } from '$lib/data/exercises';
import { formatSetDuration } from '$lib/fitness/segmentFormat';
import { m } from '$lib/js/fitnessI18n';

export type LoggedSet = {
	reps?: number;
	weight?: number;
	rpe?: number;
	distance?: number;
	/** Minutes — see formatSetDuration. */
	duration?: number;
};

/**
 * Summarise the most notable set of an exercise, picking the metric the exercise
 * is actually measured in: distance for cardio, time for holds and stretches,
 * load × reps for everything else.
 *
 * Returns null when there is nothing worth printing, so the caller can omit the
 * line rather than render an empty one.
 */
export function bestSetLabel(
	sets: LoggedSet[],
	exerciseId: string,
	lang: 'en' | 'de'
): string | null {
	if (!sets?.length) return null;

	const metrics = getExerciseMetrics(getExerciseById(exerciseId, lang));
	const t = m[lang];

	if (metrics.includes('distance')) {
		let best = sets[0];
		for (const s of sets) {
			if ((s.distance ?? 0) > (best.distance ?? 0)) best = s;
		}
		const parts: string[] = [];
		if (best.distance) parts.push(`${best.distance} km`);
		if (best.duration) parts.push(`${best.duration} min`);
		return parts.join(' · ') || null;
	}

	// Timed work carries no weight, so the best set is the longest hold. Without
	// this branch it fell through to the strength one below and read "0 kg × 0".
	if (isTimedMetrics(metrics)) {
		let best = sets[0];
		for (const s of sets) {
			if ((s.duration ?? 0) > (best.duration ?? 0)) best = s;
		}
		const parts: string[] = [];
		if (best.duration) parts.push(formatSetDuration(best.duration));
		if (best.reps) parts.push(`${best.reps} ${t.reps.toLowerCase()}`);
		if (best.rpe) parts.push(`@ ${best.rpe}`);
		return parts.join(' · ') || null;
	}

	let best = sets[0];
	for (const s of sets) {
		if (
			(s.weight ?? 0) > (best.weight ?? 0) ||
			((s.weight ?? 0) === (best.weight ?? 0) && (s.reps ?? 0) > (best.reps ?? 0))
		) {
			best = s;
		}
	}
	let label = `${best.weight ?? 0} kg × ${best.reps ?? 0}`;
	if (best.rpe) label += ` @ ${best.rpe}`;
	return label;
}
