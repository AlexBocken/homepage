/** Blurred placeholder for an image under `static/`, produced at build time by
 *  scripts/build-static-blur.ts and consumed by BlurImage.svelte. Keyed in the
 *  manifest by the image's public URL (`/glaube/…`), which is how these are
 *  referenced — they have no import to hang metadata off. */
export type StaticBlur = {
	/** `data:image/svg+xml;base64,…` LQIP — see $lib/server/lqip. */
	blur: string;
	/** Intrinsic dimensions, set on the <img> so the box (and therefore the
	 *  placeholder painted into it) exists before the image decodes. */
	width: number;
	height: number;
};
