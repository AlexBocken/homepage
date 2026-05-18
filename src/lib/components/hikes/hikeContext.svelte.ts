/**
 * Provides the hike detail page's ImagePoints arrays to descendants —
 * specifically, to inline `<HikeImage>` components used inside `.svx`
 * content. The page sets the context; HikeImage reads it.
 *
 * Two arrays are exposed because they serve different needs:
 *
 * - `images` is the full chronological list (including private images).
 *   `<HikeImage idx={N} />` indexes into this list, so the author's
 *   indices stay stable regardless of the viewer's login state.
 *
 * - `visibleImages` is the same list with private entries filtered out
 *   for the current viewer. The strip, map, and stage all operate against
 *   it, and the focus store's `index` field is a position in this array.
 *   `HikeImage` translates its own idx → position-in-visibleImages so the
 *   focus sync works.
 */

import { getContext, setContext } from 'svelte';
import type { HikeTrackPoint, ImagePoint } from '$types/hikes';

const KEY = Symbol('hike-context');

interface HikeContext {
	readonly images: ImagePoint[];
	readonly visibleImages: ImagePoint[];
	/** GPX track points — null until the JSON fetch resolves. Used by
	 * inline `<HikeImage>` to compute the nearest-track-index for the
	 * scroll-progress pin on the map. */
	readonly track: HikeTrackPoint[] | null;
}

export function setHikeContext(ctx: () => HikeContext): void {
	setContext(KEY, ctx);
}

export function getHikeContext(): () => HikeContext {
	const ctx = getContext<() => HikeContext>(KEY);
	if (!ctx) {
		throw new Error('HikeImage used outside a hike detail page (no context found).');
	}
	return ctx;
}
