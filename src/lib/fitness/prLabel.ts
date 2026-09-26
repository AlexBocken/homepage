/**
 * Long-form PR labels for the in-app PR lists (workout-complete summary,
 * workout history detail, run detail). The share card and the copyable log use
 * the compact labels in `$lib/data/prLabels` instead.
 */

import { formatPaceRangeLabel, formatPaceValue } from '$lib/data/cardioPrRanges';

export interface StoredPr {
	exerciseId: string;
	type: string;
	value: number;
	reps?: number;
}

const TYPE_LABELS: Record<string, string> = {
	est1rm: 'Est. 1RM',
	maxWeight: 'Max Weight',
	bestSetVolume: 'Best Set Volume'
};

/** "Est. 1RM", "5-rep max", "Fastest Pace (1–5 km)", … — unknown types verbatim. */
export function prTypeLongLabel(pr: Pick<StoredPr, 'type' | 'reps'>): string {
	if (pr.type === 'repMax') return `${pr.reps}-rep max`;
	if (pr.type === 'longestDistance') return 'Longest Distance';
	if (pr.type.startsWith('fastestPace:')) return `Fastest Pace (${formatPaceRangeLabel(pr.type)})`;
	return TYPE_LABELS[pr.type] ?? pr.type;
}

/** The PR's value with its unit: km for distance, min/km for pace, kg otherwise. */
export function prValueLabel(pr: Pick<StoredPr, 'type' | 'value'>): string {
	if (pr.type === 'longestDistance') return `${pr.value} km`;
	if (pr.type.startsWith('fastestPace:')) return formatPaceValue(pr.value);
	return `${pr.value} kg`;
}

/** A stored PR (machine format) ready for display. */
export function formatPr(pr: StoredPr): { exerciseId: string; type: string; value: string } {
	return { exerciseId: pr.exerciseId, type: prTypeLongLabel(pr), value: prValueLabel(pr) };
}
