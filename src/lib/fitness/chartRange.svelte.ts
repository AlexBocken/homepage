/**
 * The x-window shared by the zoomable stats charts (deficit, protein, body,
 * body-part history): which calendar days a daily chart spans, the window it
 * opens on, and the pan/pinch override that a reset hands back.
 */

import type { XRange } from '$lib/fitness/dayRange';

export { DAY_MS, dayStamp, enumerateDays, trailingDaysRange, type XRange } from '$lib/fitness/dayRange';

/**
 * A chart window that follows `getDefault` until a pan or pinch sets its own
 * range, which then holds until `reset()`. Call during component init; pass
 * `onRange` as the chart's range-change callback and read `xRange`.
 */
export function createZoomRange(getDefault: () => XRange | null) {
	let userRange = $state<XRange | null>(null);
	const xRange = $derived(userRange ?? getDefault());
	return {
		/** The window to show: the user's while they have one, else the default. */
		get xRange() {
			return xRange;
		},
		/** Whether a gesture has moved the chart off its default window. */
		get isZoomed() {
			return userRange !== null;
		},
		onRange(r: XRange) {
			userRange = { ...r };
		},
		reset() {
			userRange = null;
		}
	};
}
