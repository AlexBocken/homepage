<script lang="ts" module>
	import type { Picture } from '@sveltejs/enhanced-img';

	// Build-time map of every PUBLIC raster image under src/lib/assets/images/.
	// `query: { enhanced: true }` routes each match through @sveltejs/enhanced-img
	// (vite-imagetools + sharp), which generates AVIF/WebP at multiple widths and
	// returns a Picture that <enhanced:img> renders as a <picture>. Eager so the
	// lookup below stays synchronous. SVGs are excluded — enhanced-img only
	// supports them statically, and they need no rasterising anyway.
	const sources = import.meta.glob(
		'/src/lib/assets/images/**/*.{avif,gif,heif,jpeg,jpg,png,tiff,webp}',
		{ eager: true, query: { enhanced: true } }
	) as Record<string, { default: Picture }>;
</script>

<script lang="ts">
	import { dev } from '$app/environment';
	import Lock from '@lucide/svelte/icons/lock';
	// PRIVATE images can't use enhanced-img (its output is public). They go
	// through the parallel sharp pipeline (scripts/build-private-images.ts) and
	// are served by the auth-gated /private-images/ endpoint. The manifest is
	// generated at prebuild; run `vite-node scripts/build-private-images.ts` once
	// for dev.
	import { PRIVATE_IMAGES } from '$lib/data/privateImages.generated';

	interface Props {
		/** Path to the source image. Public: relative to src/lib/assets/images/.
		 *  Private: relative to src/lib/assets/private-images/. e.g. "hero.jpg"
		 *  or "blog/cover.png". A leading slash is tolerated. */
		src: string;
		/** Alt text. Always provide one for non-decorative images. */
		alt?: string;
		/** Lazy-load below the fold (default). Set false for above-the-fold /
		 *  LCP images, which should load eagerly. */
		lazy?: boolean;
		/** Auth-gate this image: served only to logged-in users via the
		 *  /private-images/ endpoint, with a lock badge. The bytes are never a
		 *  public asset. Render these behind your own auth check too — anonymous
		 *  viewers get a "locked" placeholder instead of the image. */
		private?: boolean;
		/** Responsive `sizes`. When set, smaller screens fetch smaller files;
		 *  omit for a plain 1x/2x pair (public) or the full ladder (private). */
		sizes?: string;
		/** Extra class(es) forwarded to the underlying <img>. */
		class?: string;
		/** Any other <img> attribute (width, height, fetchpriority, style, …). */
		[key: string]: unknown;
	}

	let {
		src,
		alt = '',
		lazy = true,
		private: isPrivate = false,
		sizes,
		class: className,
		...rest
	}: Props = $props();

	const key = $derived(src.replace(/^\/+/, ''));

	// Public: enhanced-img Picture, looked up by root-relative glob key.
	const picture = $derived(isPrivate ? undefined : sources[`/src/lib/assets/images/${key}`]?.default);
	// Private: responsive variant with auth-gated /private-images/ URLs.
	const variant = $derived(isPrivate ? PRIVATE_IMAGES[key] : undefined);

	// Anonymous viewers get a 401 from /private-images/; swap the broken image
	// for a locked placeholder when that happens.
	let locked = $state(false);

	$effect(() => {
		if (!dev) return;
		if (isPrivate && !variant) {
			console.warn(
				`[Image] No private build-time asset for "${src}". Place it under ` +
					`src/lib/assets/private-images/ and re-run scripts/build-private-images.ts.`
			);
		} else if (!isPrivate && !picture) {
			console.warn(
				`[Image] No build-time asset for "${src}". ` +
					`Place it under src/lib/assets/images/ (path relative to that dir).`
			);
		}
	});
</script>

{#if isPrivate}
	{#if variant}
		<span class="g-private-image" class:locked>
			<picture>
				<source type="image/avif" srcset={variant.srcsetAvif} {sizes} />
				<source type="image/webp" srcset={variant.srcsetWebp} {sizes} />
				<img
					src={variant.src}
					{alt}
					width={variant.width}
					height={variant.height}
					class={className}
					loading={lazy ? 'lazy' : 'eager'}
					decoding="async"
					onerror={() => (locked = true)}
					{...rest}
				/>
			</picture>
			<span class="g-private-badge" title="Privates Bild — nur für eingeloggte Benutzer sichtbar">
				<Lock size={11} strokeWidth={2.25} aria-hidden="true" />
				privat
			</span>
			{#if locked}
				<span class="g-private-locked">
					<Lock size={20} strokeWidth={2} aria-hidden="true" />
					Anmeldung erforderlich
				</span>
			{/if}
		</span>
	{/if}
{:else if picture}
	<enhanced:img
		src={picture}
		{alt}
		{sizes}
		class={className}
		loading={lazy ? 'lazy' : 'eager'}
		decoding="async"
		{...rest}
	/>
{/if}

<style>
	/* The colon in the tag name must be escaped in a selector. enhanced-img
	 * rewrites this to target the generated <img>. */
	enhanced\:img {
		display: block;
		max-width: 100%;
		height: auto;
	}

	.g-private-image {
		position: relative;
		display: inline-block;
		max-width: 100%;
	}

	.g-private-image picture,
	.g-private-image img {
		display: block;
		max-width: 100%;
		height: auto;
	}

	/* Lock badge — mirrors HikeImage's `.private`. */
	.g-private-badge {
		position: absolute;
		top: 0.6rem;
		left: 0.6rem;
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		padding: 0.18rem 0.5rem;
		border-radius: var(--radius-pill);
		background: rgb(0 0 0 / 0.55);
		color: #fff;
		backdrop-filter: blur(4px);
		-webkit-backdrop-filter: blur(4px);
	}

	/* Shown when the gated request 401s (anonymous viewer). */
	.g-private-image.locked img {
		visibility: hidden;
	}

	.g-private-locked {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		text-align: center;
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--color-text-secondary);
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
	}
</style>
