/** Responsive variant for a private (auth-gated) image, produced at build time
 *  by scripts/build-private-images.ts and consumed by Image.svelte.
 *
 *  All URLs point at `/private-images/<file>` — the auth-checked endpoint in
 *  src/routes/private-images/[...file]/+server.ts, NOT a public asset. Public
 *  images take the opposite path (enhanced-img), so they have no manifest. */
export type PrivateImageVariant = {
	/** Largest WebP, used as the <img> fallback `src`. */
	src: string;
	/** AVIF candidates as a `srcset` string (`url 480w, url 960w, …`). */
	srcsetAvif: string;
	/** WebP candidates as a `srcset` string. */
	srcsetWebp: string;
	/** Intrinsic width/height of the largest variant — set on the <img> so the
	 *  browser reserves space and avoids layout shift. */
	width: number;
	height: number;
};

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
