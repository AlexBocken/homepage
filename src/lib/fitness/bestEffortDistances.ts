// Which best-effort distances to surface in the compact segments-page table.
// Running shows every whole km (1k…longest run is a short, familiar list).
// Cycling rides span tens of km, so listing every km would be a 100-row wall —
// the table is trimmed to milestone distances. The dashboard card and per-run
// detail pages are NOT trimmed (they show any/all distances).

export type ActivityKind = 'running' | 'cycling';

/** Map a raw activityType to its board (client-safe; cycling vs everything else). */
export function activityKindOf(activityType: string | null | undefined): ActivityKind {
	return activityType === 'cycling' ? 'cycling' : 'running';
}

/** Milestone cycling distances (km) shown in the trimmed table. */
export const CYCLING_TABLE_KM = [1, 5, 10, 20, 40, 50, 80, 100, 160];

/**
 * Filter a list of available whole-km distances down to what the table should
 * show for the given activity. Running → unchanged; cycling → milestones only.
 */
export function tableDistances(kind: ActivityKind, availableKm: number[]): number[] {
	if (kind !== 'cycling') return availableKm;
	const milestones = new Set(CYCLING_TABLE_KM);
	return availableKm.filter((km) => milestones.has(km));
}
