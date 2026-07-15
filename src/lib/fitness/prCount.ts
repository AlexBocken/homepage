// The number of "personal records" a run represents, for the "N PRs" badge on
// the completion screen, the history detail pill, and session cards. A run's PRs
// are the sum of three independently-computed kinds, all stored on the session:
//   - strength / cardio PRs   (`prs`)          — e.g. new est-1RM, longest distance
//   - distance PRs            (`bestEffortPrs`) — a new all-time-fastest Nk
//   - segment PRs             (`segmentPrs`)    — a personal best OR a KOM (crown)
// Segment PRs are pre-filtered to PB-or-KOM when persisted, so a plain length is
// the right count here.

export interface PrCountable {
	prs?: unknown[] | null;
	bestEffortPrs?: unknown[] | null;
	segmentPrs?: unknown[] | null;
}

/** Total PRs earned by a run across strength, distance, and segment records. */
export function prCount(session: PrCountable): number {
	return (
		(session.prs?.length ?? 0) +
		(session.bestEffortPrs?.length ?? 0) +
		(session.segmentPrs?.length ?? 0)
	);
}
