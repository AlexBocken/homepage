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
		/** Forwarded, and called after the component's own handler — the PiP
		 *  repositions itself on load and must keep doing so. */
		onload?: (e: Event) => void;
		onerror?: (e: Event) => void;
		/** Any other <img> attribute — `sizes`, … */
		[key: string]: unknown;
	}

	let { src, alt, lazy = true, class: className, onload, onerror, ...rest }: Props = $props();

	/** An image that fails to load falls back to its alt text. Mirrors
	 *  HikeImage: keep the placeholder as the ground and give the text its own
	 *  contrast, since a blur can come out any brightness. */
	let broken = $state(false);

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
	class:broken
	onload={(e) => { broken = false; onload?.(e); }}
	onerror={(e) => { broken = true; onerror?.(e); }}
	width={meta?.width}
	height={meta?.height}
	loading={lazy ? 'lazy' : 'eager'}
	decoding="async"
	style:--lqip={meta ? `url("${meta.blur}")` : null}
	style:aspect-ratio={meta ? `${meta.width} / ${meta.height}` : null}
	style:--ratio={meta ? meta.width / meta.height : null}
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
	   placeholder shows.

	   The inline `aspect-ratio` restates what the UA already derives from the
	   width/height attributes. It is kept because it is the one thing standing
	   between a caller and a collapsed placeholder: every caller sizes exactly
	   one axis and leaves the other `auto` (`height: 25vh; width: auto` in the
	   PiP, `width: 100%; height: auto` beside the prayers), so the ratio is
	   what resolves the other one, and a caller that sets its own
	   `aspect-ratio` would otherwise silently reshape the blur.

	   `--ratio` is the same number unitless, for callers that need it in
	   arithmetic — CSS cannot divide a length by a length, so a ratio cannot be
	   recovered from `aspect-ratio` in a calc(). The PiP sizes itself by area
	   with it.

	   Both go on as `style:` directives rather than one `style` string: a string
	   is written with setAttribute, which would wipe the inline height the PiP's
	   fullscreen transition puts on this same <img> the moment the src changes
	   under it. A directive touches only the property it names. */
	img {
		/* Not layout — this is what makes the box exist at all when the image
		   doesn't. An <img> is `display: inline` by default, and while it is a
		   replaced element that is harmless: width, height and the ratio all
		   still apply. The moment it fails to load it stops being replaced, and
		   an inline non-replaced box ignores width, height and aspect-ratio
		   entirely — it is sized by its content, which is now the alt text. That
		   is the wide short strip a broken image renders as, with the
		   placeholder squashed into it. As a block box it keeps its shape. */
		display: block;
		background-color: var(--color-bg-elevated);
		background-image: var(--lqip-grain), var(--lqip, none);
		background-size: 96px 96px, cover;
		background-position: center, center;
		background-repeat: repeat, no-repeat;
	}

	/* Broken: the alt text is all that is left, so centre it on the blur and let
	   it carry its own contrast. A ring of shadows rather than one, so no glyph
	   edge is left bare — white over dark reads on a placeholder of any
	   brightness, which a single colour cannot promise. */
	img.broken {
		display: grid;
		place-items: center;
		box-sizing: border-box;
		overflow: hidden;
		padding: 0.75rem 1rem;
		color: #fff;
		text-shadow:
			0 0 2px rgb(0 0 0 / 0.9),
			0 1px 3px rgb(0 0 0 / 0.85),
			1px 0 3px rgb(0 0 0 / 0.85),
			0 -1px 3px rgb(0 0 0 / 0.85),
			-1px 0 3px rgb(0 0 0 / 0.85);
		font-size: 0.8rem;
		font-style: italic;
		font-weight: 600;
		line-height: 1.4;
		text-align: center;
		text-wrap: balance;
	}
</style>
