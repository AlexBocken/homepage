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
