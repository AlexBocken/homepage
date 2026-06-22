/**
 * Shared cursor state for a hike detail page.
 *
 * The map and the elevation chart each push into `hover.index` when the
 * pointer moves over them; both observe the rune via `$effect` to draw the
 * corresponding marker on their own side. A single shared rune avoids the
 * map↔chart hover-loop bookkeeping that prop wiring would require.
 *
 * `source` records which side wrote the last update so the receiver can skip
 * redrawing on its own write and prevent feedback loops.
 *
 * A hike page has exactly one map + one chart, so this is a module singleton
 * built on the shared {@link createTrackHover} factory (the same factory backs
 * the per-exercise stores on workout GPS views).
 */

import { createTrackHover } from '$lib/stores/trackHover.svelte';

export type HoverSource = 'map' | 'chart' | 'image' | 'scroll' | null;

const store = createTrackHover();

export const hover = store.hover;

export function setHover(index: number | null, source: HoverSource): void {
	store.setHover(index, source);
}

export function clearHover(): void {
	store.clearHover();
}
