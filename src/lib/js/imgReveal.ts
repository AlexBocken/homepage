/**
 * Fade a raster image in once it has decoded.
 *
 * Lazily-loaded images (the route maps on the fitness cards) otherwise snap in
 * over their placeholder mid-scroll. The action keeps the image transparent
 * until `load` fires, then crossfades it over whatever sits behind it — a
 * map-toned background plus the SVG route ghost.
 *
 * Opacity is set from JS on purpose: with JS off the element is never touched
 * and the image just shows immediately, and an image that is already in the
 * cache (a back-navigation, a second render) skips the fade entirely instead of
 * flickering on every mount.
 */
import type { Action } from 'svelte/action';

export const revealOnLoad: Action<HTMLImageElement> = (node) => {
	if (node.complete && node.naturalWidth > 0) return;

	const reveal = () => {
		node.style.opacity = '1';
	};

	node.style.opacity = '0';
	node.style.transition = 'opacity var(--transition-normal, 200ms) ease-out';
	node.addEventListener('load', reveal, { once: true });
	// A broken image usually swaps to a fallback, but never leave it invisible.
	node.addEventListener('error', reveal, { once: true });

	return {
		destroy() {
			node.removeEventListener('load', reveal);
			node.removeEventListener('error', reveal);
		}
	};
};
