/**
 * Which cups in the liquids row just filled or drained.
 *
 * The row is drawn as four consecutive runs — mugs, cold drinks, liquid carried
 * by meals, then water — and a cup joins its own run rather than the end of the
 * row. Watching the total instead of the runs meant a tea logged at the front
 * animated whatever happened to sit last, which was a glass of water.
 */

/** The runs, in the order they are drawn. */
export type CupRuns = number[];

export type CupRowChange = {
	kind: 'fill' | 'drain';
	/** Index of the run that moved, into the `CupRuns` array. */
	run: number;
	/** Positions in the drawn row, not within the run. */
	indices: number[];
};

/**
 * Compares two snapshots of the runs and names the cups that moved.
 *
 * Returns null when nothing changed, and also when more than one run did: that
 * is a whole day being swapped in — a redraw, not a pour — and animating it
 * would set the entire row sloshing.
 */
export function cupRowChange(prev: CupRuns, cur: CupRuns): CupRowChange | null {
	const moved: number[] = [];
	for (let i = 0; i < cur.length; i++) {
		if (cur[i] !== prev[i]) moved.push(i);
	}
	if (moved.length !== 1) return null;

	const run = moved[0];
	const grew = cur[run] > prev[run];
	// Runs ahead of the one that moved are untouched, so this offset addresses the
	// same cups in the layout before the change and the one after it.
	const start = cur.slice(0, run).reduce((a, b) => a + b, 0);
	const from = grew ? prev[run] : cur[run];
	const to = grew ? cur[run] : prev[run];

	const indices: number[] = [];
	for (let k = from; k < to; k++) indices.push(start + k);

	return { kind: grew ? 'fill' : 'drain', run, indices };
}
