/**
 * Module-scoped registry of "scroll anchors" — DOM elements rendered by
 * inline `<HikeImage>` components whose viewport positions are sampled on
 * every scroll frame to compute a continuous trail-position indicator.
 *
 * Each anchor carries:
 * - `element` — the DOM node we read `getBoundingClientRect()` from.
 * - `trackIdx` — the index in the GPX track points array nearest to the
 *   image's timestamp. The "current trail position" is interpolated between
 *   adjacent anchors' `trackIdx` based on scroll progress.
 * - `visibleIdx` — index in the visibility-filtered ImagePoints. Used to
 *   drive the focused store (strip highlighting) when the nearest-image
 *   changes.
 *
 * The registry is a singleton because there's only ever one hike detail
 * page open at a time, and a Svelte context would otherwise force every
 * read site (the page's scroll listener) to be inside the component tree.
 */

export interface ScrollAnchor {
	element: HTMLElement;
	trackIdx: number;
	visibleIdx: number;
}

const anchors = new Set<ScrollAnchor>();

export function addScrollAnchor(a: ScrollAnchor): () => void {
	anchors.add(a);
	return () => {
		anchors.delete(a);
	};
}

export function listScrollAnchors(): ScrollAnchor[] {
	return Array.from(anchors);
}
