/** Compact, human label for a PR type — shared by the share card and the
 * copyable workout log. */
export function prTypeLabel(pr: { type: string; reps?: number }): string {
	switch (pr.type) {
		case 'est1rm':
			return 'Est. 1RM';
		case 'maxWeight':
			return 'Max';
		case 'bestSetVolume':
			return 'Volume';
		case 'repMax':
			return `${pr.reps ?? ''}-rep max`.trim();
		case 'longestDistance':
			return 'Distance';
		default:
			return typeof pr.type === 'string' && pr.type.startsWith('fastestPace:') ? 'Pace' : pr.type ?? '';
	}
}
