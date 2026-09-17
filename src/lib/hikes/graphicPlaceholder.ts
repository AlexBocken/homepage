import type { Attachment } from 'svelte/attachments';

/**
 * Show a simplified stand-in behind a small graphic (a route icon, a coat of
 * arms) until the graphic itself has loaded. Those load late on purpose —
 * lazily and at low priority, behind the photos — so without this the spot
 * stays empty for a while.
 *
 * Spread both onto the `<img>`: the `style` so the stand-in paints with the
 * server-rendered HTML, the attachment to take it away again once the image
 * is in (it would otherwise show through a graphic's transparent parts).
 * Without JavaScript the stand-in simply stays underneath.
 */
export function graphicPlaceholder(uri: string | undefined): {
	style: string | undefined;
	attach: Attachment<HTMLImageElement>;
} {
	return {
		style: uri ? `background: url("${uri}") center / contain no-repeat` : undefined,
		attach: (img) => {
			if (!uri) return;
			const clear = () => img.style.removeProperty('background');
			if (img.complete && img.naturalWidth > 0) {
				clear();
				return;
			}
			img.addEventListener('load', clear, { once: true });
			return () => img.removeEventListener('load', clear);
		}
	};
}
