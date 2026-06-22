/**
 * Shared y-axis width for a group of stacked charts (e.g. the pace / elevation /
 * cadence graphs on a workout). Each chart reports the width Chart.js naturally
 * fitted for its own tick labels; every chart then pins its axis to the group
 * max, so all plot areas start at the same x and the graphs line up vertically.
 *
 * One group per stack — create it alongside the stack and pass it to each chart.
 */

export interface AxisWidthGroup {
	readonly max: number;
	report(width: number): void;
}

export function createAxisWidthGroup(): AxisWidthGroup {
	const state = $state({ max: 0 });
	return {
		get max() {
			return state.max;
		},
		report(width) {
			if (width > state.max) state.max = width;
		}
	};
}
