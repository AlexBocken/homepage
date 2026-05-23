<script lang="ts">
	import { getHikeContext } from './hikeContext.svelte';
	import { focused } from './focusedImageStore.svelte';
	import { addScrollAnchor } from './scrollAnchors';
	import Lock from '@lucide/svelte/icons/lock';
	import Clock from '@lucide/svelte/icons/clock';

	interface Props {
		/** Position in the hike's full chronological image list (0-indexed,
		 * stable across viewers because it refers to the unfiltered list). */
		idx: number;
		/** Optional caption shown under the image — narrative blurb, not a
		 * machine-derived label. Elapsed time is shown automatically. */
		caption?: string;
	}

	const { idx, caption }: Props = $props();
	const ctx = getHikeContext();

	const ip = $derived(ctx().images[idx]);
	const visible = $derived(ip ? ctx().visibleImages.includes(ip) : false);
	const visibleIdx = $derived(visible ? ctx().visibleImages.indexOf(ip) : -1);
	const isActive = $derived(visibleIdx >= 0 && focused.index === visibleIdx);

	// Find the track point closest in time to this image. Used by the
	// page-level scroll listener to interpolate a "current trail position"
	// between adjacent images as the reader scrolls past them.
	const trackIdx = $derived.by(() => {
		const t = ip?.timestamp;
		const track = ctx().track;
		if (typeof t !== 'number' || !track) return -1;
		let bestIdx = 0;
		let bestDelta = Infinity;
		for (let i = 0; i < track.length; i++) {
			const tt = track[i][3];
			if (typeof tt !== 'number') continue;
			const d = Math.abs(tt - t);
			if (d < bestDelta) {
				bestDelta = d;
				bestIdx = i;
			}
		}
		return bestDelta === Infinity ? -1 : bestIdx;
	});

	// Elapsed time since the hike start (first timestamped track point) — same
	// "nach X" the photo strip shows, not the absolute wall-clock time.
	const elapsedLabel = $derived.by(() => {
		const t = ip?.timestamp;
		const track = ctx().track;
		if (typeof t !== 'number' || !track) return null;
		let start: number | null = null;
		for (const p of track) {
			if (typeof p[3] === 'number') {
				start = p[3];
				break;
			}
		}
		if (start === null) return null;
		const ms = t - start;
		if (!Number.isFinite(ms) || ms < 0) return null;
		const totalMin = Math.round(ms / 60000);
		if (totalMin < 60) return `${totalMin} min`;
		const h = Math.floor(totalMin / 60);
		const m = totalMin % 60;
		return m === 0 ? `${h} h` : `${h} h ${m} min`;
	});

	let figure: HTMLElement | undefined = $state();

	// Register this image's DOM element as a scroll anchor. The page reads
	// these anchors on each scroll frame to compute the active trail
	// position. Desktop-only — there's no sticky map to drive on mobile.
	$effect(() => {
		if (!figure) return;
		if (visibleIdx < 0 || trackIdx < 0) return;
		if (typeof window === 'undefined') return;
		if (!window.matchMedia('(min-width: 1024px)').matches) return;
		return addScrollAnchor({ element: figure, trackIdx, visibleIdx });
	});
</script>

{#if ip && visible}
	<figure class="hike-image" class:active={isActive} bind:this={figure}>
		<img
			src={ip.src}
			alt={ip.alt}
			loading="lazy"
			decoding="async"
		/>
		{#if ip.visibility === 'private'}
			<span class="private" title="Privates Bild — nur für eingeloggte Benutzer sichtbar">
				<Lock size={11} strokeWidth={2.25} aria-hidden="true" />
				privat
			</span>
		{/if}
		{#if elapsedLabel}
			<span class="shot-time" title="Zeit seit Start">
				<Clock size={11} strokeWidth={2.25} aria-hidden="true" />
				nach {elapsedLabel}
			</span>
		{/if}
		{#if caption}
			<figcaption>{caption}</figcaption>
		{/if}
	</figure>
{/if}

<style>
	.hike-image {
		position: relative;
		/* Cap the width so that in the single-column (mobile/tablet) layout the
		 * photo doesn't blow up to the full content width on wider screens.
		 * On the desktop two-column layout the prose column is already narrower
		 * than this, so it stays full-bleed-in-column there. Centered via
		 * auto inline margins. */
		max-width: 680px;
		margin: 2rem auto;
		border-radius: var(--radius-card);
		overflow: hidden;
		background: #14181f;
		box-shadow: var(--shadow-md);
		transition: box-shadow 280ms ease;
	}

	.hike-image.active {
		box-shadow:
			0 18px 32px -8px color-mix(in oklab, var(--color-primary) 45%, transparent),
			0 6px 14px -6px rgb(0 0 0 / 0.25);
	}

	.hike-image img {
		display: block;
		width: 100%;
		height: auto;
		object-fit: cover;
		background: #14181f;
	}

	figcaption {
		padding: 0.6rem 0.85rem 0.75rem;
		font-size: 0.85rem;
		color: var(--color-text-secondary);
		background: var(--color-surface);
		font-style: italic;
		line-height: 1.45;
	}

	.private {
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

	/* Capture time, bottom-right so it never collides with the private badge. */
	.shot-time {
		position: absolute;
		bottom: 0.6rem;
		right: 0.6rem;
		display: inline-flex;
		align-items: center;
		gap: 0.28rem;
		font-size: 0.7rem;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		padding: 0.2rem 0.55rem;
		border-radius: var(--radius-pill);
		background: rgb(0 0 0 / 0.55);
		color: #fff;
		backdrop-filter: blur(4px);
		-webkit-backdrop-filter: blur(4px);
	}

	/* Sits within the rounded image; if a caption follows, the figure grows so
	 * the badge stays over the photo (absolute to the figure, image is the top
	 * block). */
	.hike-image:has(figcaption) .shot-time {
		bottom: auto;
		top: 0.6rem;
		right: 0.6rem;
	}

	@media (prefers-reduced-motion: reduce) {
		.hike-image {
			transition: none;
		}
	}
</style>
