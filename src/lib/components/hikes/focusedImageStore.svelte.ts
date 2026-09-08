/**
 * Shared focus state for a hike detail page's photo strip + map.
 *
 * Writing to `focused.index` from the strip (source='strip') makes the map fly
 * to that photo and pulse a focus ring; writing from the map (source='map')
 * makes the strip scroll the matching card into view and highlight it. Each
 * side ignores its own writes via the `source` field so the two never feed
 * back into each other.
 *
 * Indexes are positions in the visibility-filtered `ImagePoint[]` that both
 * components share — the page filters once and hands the same array down.
 */

/**
 * Sources of focus-store writes:
 * - `'strip'`: the user clicked a thumbnail or used a chevron / arrow key.
 *   Full sync: map flies to the marker, strip centres the card.
 * - `'map'`: the user clicked a marker on the trail-column map. Strip
 *   scrolls + highlights, the page scrolls the prose to the photo's inline
 *   `<HikeImage>`, but the map doesn't fly to itself.
 * - `'hero-map'`: the user clicked a marker on the hero map. Strip scrolls +
 *   highlights and the page brings the strip into view; the prose stays
 *   put — the strip sits right under the hero and is the counterpart there,
 *   while the trail-column map is the one that leads into the text.
 * - `'map-hover'`: the user is hovering a map marker. Strip skips scroll
 *   (would jerk across dense clusters), and the map skips its own flyTo +
 *   focus ring (the user is already looking at it).
 * - `'inline'`: an inline `<HikeImage>` scrolled into the viewport's middle
 *   band. Full sync: map flies to the marker, strip centres the card. This
 *   is the desktop scrollytelling driver.
 */
export type FocusSource = 'map' | 'hero-map' | 'map-hover' | 'strip' | 'inline' | null;

export const focused = $state<{ index: number | null; source: FocusSource }>({
	index: null,
	source: null
});

export function setFocused(index: number | null, source: FocusSource): void {
	focused.index = index;
	focused.source = source;
}

export function clearFocused(): void {
	focused.index = null;
	focused.source = null;
}
