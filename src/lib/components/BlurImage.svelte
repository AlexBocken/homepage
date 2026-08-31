<script lang="ts">
	import { dev } from '$app/environment';
	import { STATIC_BLUR } from '$lib/data/staticBlur.generated';

	interface Props {
		/** Public URL of an image under `static/`, e.g. `/glaube/crucifix.webp`.
		 *  Must be one of the subtrees scripts/build-static-blur.ts covers —
		 *  otherwise there is no placeholder and this is a plain <img>. */
		src: string;
		/** Required. These are content images (artworks, photos); there is no
		 *  case here for a decorative one, and leaving it optional is how the
		 *  faith pages ended up shipping images with no description at all. */
		alt: string;
		/** Lazy-load below the fold (default). Set false for the image a page
		 *  opens on, which should not wait for layout to discover it. */
		lazy?: boolean;
		class?: string;
		/** Any other <img> attribute — `onload`, `sizes`, … */
		[key: string]: unknown;
	}

	let { src, alt, lazy = true, class: className, ...rest }: Props = $props();

	const meta = $derived(STATIC_BLUR[src]);

	$effect(() => {
		if (dev && !meta) {
			console.warn(
				`[BlurImage] No build-time placeholder for "${src}". Put the image under ` +
					`a subtree listed in ROOTS in scripts/build-static-blur.ts and re-run it.`
			);
		}
	});
</script>

<!-- `rest` first so the attributes below win: the placeholder and the
     dimensions it needs are the component's job, not the caller's. -->
<img
	{...rest}
	{src}
	{alt}
	class={className}
	width={meta?.width}
	height={meta?.height}
	loading={lazy ? 'lazy' : 'eager'}
	decoding="async"
	style={meta ? `--lqip:url("${meta.blur}")` : undefined}
/>

<style>
	/* Only the placeholder is styled here. Layout (size, fit, radius) stays with
	   the caller — this component is dropped into half a dozen existing layouts
	   that already size their images, and a `max-width`/`display` from here
	   would land at the same specificity as their own `img` rules and fight
	   them depending on source order. Callers reach the element through
	   `:global(img)` under one of their own scoped selectors.

	   The blur fills the box the width/height attributes reserve and is covered
	   the moment the image decodes; the grain on top dithers its gradients (see
	   --lqip-grain in app.css). The colour underneath is what an image with no
	   placeholder shows. */
	img {
		background-color: var(--color-bg-elevated);
		background-image: var(--lqip-grain), var(--lqip, none);
		background-size: 96px 96px, cover;
		background-position: center, center;
		background-repeat: repeat, no-repeat;
	}
</style>
