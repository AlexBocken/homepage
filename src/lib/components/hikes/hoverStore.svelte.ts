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
 */

export type HoverSource = 'map' | 'chart' | 'image' | 'scroll' | null;

export const hover = $state<{ index: number | null; source: HoverSource }>({
	index: null,
	source: null
});

export function setHover(index: number | null, source: HoverSource): void {
	hover.index = index;
	hover.source = source;
}

export function clearHover(): void {
	hover.index = null;
	hover.source = null;
}
