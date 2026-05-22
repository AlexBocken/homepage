<script lang="ts">
	import { fade } from 'svelte/transition';
	import type { HikeTrackPoint, ImagePoint, HikeStage } from '$types/hikes';
	import { focused, setFocused } from './focusedImageStore.svelte';
	import { stage } from './stageStore.svelte';
	import MapPin from '@lucide/svelte/icons/map-pin';
	import Lock from '@lucide/svelte/icons/lock';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Expand from '@lucide/svelte/icons/expand';
	import X from '@lucide/svelte/icons/x';

	interface Props {
		images: ImagePoint[];
		track: HikeTrackPoint[];
		/** Stage ranges (multi-day hikes). When a stage is active, the strip
		 * shows only that stage's photos. Indices stay aligned with the full
		 * list so the shared focus store keeps matching the map. */
		stages?: HikeStage[] | null;
	}

	const { images, track, stages = null }: Props = $props();

	// Nearest track index (by time) per image — for testing stage membership.
	const imageTrackIdx = $derived(
		images.map((ip) => {
			if (typeof ip.timestamp !== 'number') return -1;
			let best = -1;
			let bestD = Infinity;
			for (let i = 0; i < track.length; i++) {
				const t = track[i][3];
				if (typeof t !== 'number') continue;
				const d = Math.abs(t - ip.timestamp);
				if (d < bestD) {
					bestD = d;
					best = i;
				}
			}
			return best;
		})
	);

	const activeStageRange = $derived.by(() => {
		if (stage.active === null || !stages || !stages[stage.active]) return null;
		const s = stages[stage.active];
		return { startIdx: s.startIdx, endIdx: s.endIdx };
	});

	function inActiveStage(i: number): boolean {
		const r = activeStageRange;
		if (!r) return true;
		const idx = imageTrackIdx[i];
		return idx >= r.startIdx && idx <= r.endIdx;
	}

	const startTimestamp = $derived.by(() => {
		for (const p of track) {
			if (typeof p[3] === 'number') return p[3];
		}
		return null;
	});

	function formatElapsed(ms: number): string {
		if (!Number.isFinite(ms) || ms < 0) return '–';
		const totalMin = Math.round(ms / 60000);
		if (totalMin < 60) return `${totalMin} min`;
		const h = Math.floor(totalMin / 60);
		const m = totalMin % 60;
		return m === 0 ? `${h} h` : `${h} h ${m} min`;
	}

	const cardEls: Array<HTMLElement | null> = $state([]);
	let scrollEl = $state<HTMLDivElement | undefined>(undefined);

	// Fullscreen lightbox. Independent of `focused` (which drives the map),
	// but opening / navigating also syncs `focused` so the map + strip follow
	// whatever is being viewed full-screen.
	let lightboxIndex = $state<number | null>(null);
	const lightboxOpen = $derived(lightboxIndex !== null);
	let closeBtn = $state<HTMLButtonElement | undefined>(undefined);

	function openLightbox(i: number): void {
		lightboxIndex = i;
		setFocused(i, 'strip');
	}

	function closeLightbox(): void {
		lightboxIndex = null;
	}

	function lightboxStep(dir: -1 | 1): void {
		if (lightboxIndex === null) return;
		const n = lightboxIndex + dir;
		if (n < 0 || n >= images.length) return;
		lightboxIndex = n;
		setFocused(n, 'strip');
	}

	// While open: Esc closes, arrows navigate, body scroll is locked, and focus
	// moves into the dialog. Keyed on `lightboxOpen` (not the index) so stepping
	// between images doesn't re-run the setup or steal focus back to close.
	$effect(() => {
		if (!lightboxOpen) return;
		closeBtn?.focus();
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') closeLightbox();
			else if (e.key === 'ArrowLeft') {
				e.preventDefault();
				lightboxStep(-1);
			} else if (e.key === 'ArrowRight') {
				e.preventDefault();
				lightboxStep(1);
			}
		};
		window.addEventListener('keydown', onKey);
		const prevOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			window.removeEventListener('keydown', onKey);
			document.body.style.overflow = prevOverflow;
		};
	});

	// Recenter the active card horizontally inside the strip on focus change.
	// We scroll only the strip's own X axis — `scrollIntoView` would also
	// pull the page Y to bring the strip into the viewport, which is not
	// what we want here. Map-hover writes are skipped because they fire
	// rapidly across dense clusters and would jerk the strip around; map
	// clicks and strip/keyboard navigation still recenter.
	$effect(() => {
		const idx = focused.index;
		if (idx === null || idx < 0) return;
		if (focused.source === 'map-hover') return;
		const el = cardEls[idx];
		if (!el || !scrollEl) return;
		const targetLeft = el.offsetLeft + el.offsetWidth / 2 - scrollEl.clientWidth / 2;
		scrollEl.scrollTo({ left: targetLeft, behavior: 'smooth' });
	});

	function onCardClick(idx: number): void {
		// Toggle off if the user re-clicks the already-active card.
		if (focused.index === idx) {
			setFocused(null, 'strip');
		} else {
			setFocused(idx, 'strip');
		}
	}

	// Step to the next/previous photo that's in the active stage (skips photos
	// hidden by stage scoping).
	function advance(direction: -1 | 1): void {
		if (images.length === 0) return;
		let i = focused.index === null ? (direction === 1 ? -1 : images.length) : focused.index;
		i += direction;
		while (i >= 0 && i < images.length) {
			if (inActiveStage(i)) {
				setFocused(i, 'strip');
				return;
			}
			i += direction;
		}
	}

	const canPrev = $derived.by(() => {
		if (focused.index === null) return false;
		for (let i = focused.index - 1; i >= 0; i--) if (inActiveStage(i)) return true;
		return false;
	});
	const canNext = $derived.by(() => {
		const start = focused.index === null ? -1 : focused.index;
		for (let i = start + 1; i < images.length; i++) if (inActiveStage(i)) return true;
		return false;
	});

	function onKey(e: KeyboardEvent): void {
		if (images.length === 0) return;
		if (e.key === 'ArrowLeft') {
			e.preventDefault();
			advance(-1);
		} else if (e.key === 'ArrowRight') {
			e.preventDefault();
			advance(1);
		}
	}
</script>

{#if images.length > 0}
	<section class="strip-section" aria-label="Bilder der Tour">
		<header class="strip-header">
			<h2 class="strip-title">Bildstrecke</h2>
			<span class="strip-hint">
				<MapPin size={14} strokeWidth={1.75} aria-hidden="true" />
				Klicken zeigt die Position auf der Karte
			</span>
		</header>

		<div class="strip-frame">
			<button
				type="button"
				class="chev chev-left"
				aria-label="Vorheriges Bild"
				disabled={!canPrev}
				onclick={() => advance(-1)}
			>
				<ChevronLeft size={20} strokeWidth={2.25} aria-hidden="true" />
			</button>

			<div
				class="strip-scroll"
				bind:this={scrollEl}
				onkeydown={onKey}
				role="listbox"
				tabindex="0"
				aria-label="Tourenfotos chronologisch"
			>
			{#each images as ip, i (ip.src)}
				{@const elapsed =
					ip.timestamp != null && startTimestamp != null
						? formatElapsed(ip.timestamp - startTimestamp)
						: null}
				{@const active = focused.index === i}
				{#if inActiveStage(i)}
				<div class="card-wrap" class:active bind:this={cardEls[i]}>
					<button
						type="button"
						class="card"
						class:private={ip.visibility === 'private'}
						onclick={() => onCardClick(i)}
						aria-label={`Foto ${i + 1} von ${images.length}${elapsed ? `, nach ${elapsed}` : ''}`}
						role="option"
						aria-selected={active}
					>
						<img src={ip.thumbnail} alt={ip.alt} loading="lazy" decoding="async" />
						<div class="overlay">
							{#if elapsed}
								<span class="chip-elapsed">nach {elapsed}</span>
							{/if}
							<span class="chip-index">{i + 1}/{images.length}</span>
						</div>
						{#if ip.visibility === 'private'}
							<span class="badge-private" aria-label="Privat">
								<Lock size={11} strokeWidth={2.25} aria-hidden="true" />
								privat
							</span>
						{/if}
					</button>
					<button
						type="button"
						class="expand"
						aria-label={`Foto ${i + 1} im Vollbild öffnen`}
						title="Vollbild"
						onclick={() => openLightbox(i)}
					>
						<Expand size={15} strokeWidth={2} aria-hidden="true" />
					</button>
				</div>
				{/if}
			{/each}
			</div>

			<button
				type="button"
				class="chev chev-right"
				aria-label="Nächstes Bild"
				disabled={!canNext}
				onclick={() => advance(1)}
			>
				<ChevronRight size={20} strokeWidth={2.25} aria-hidden="true" />
			</button>
		</div>
	</section>

	{#if lightboxIndex !== null}
		{@const ip = images[lightboxIndex]}
		{@const elapsed =
			ip.timestamp != null && startTimestamp != null
				? formatElapsed(ip.timestamp - startTimestamp)
				: null}
		<div
			class="lightbox"
			role="dialog"
			aria-modal="true"
			aria-label={`Foto ${lightboxIndex + 1} von ${images.length}`}
			transition:fade={{ duration: 150 }}
		>
			<button class="lb-backdrop" aria-label="Schließen" onclick={closeLightbox}></button>

			<button
				class="lb-btn lb-close"
				aria-label="Schließen"
				bind:this={closeBtn}
				onclick={closeLightbox}
			>
				<X size={22} strokeWidth={2} aria-hidden="true" />
			</button>

			{#if lightboxIndex > 0}
				<button class="lb-btn lb-prev" aria-label="Vorheriges Bild" onclick={() => lightboxStep(-1)}>
					<ChevronLeft size={26} strokeWidth={2.25} aria-hidden="true" />
				</button>
			{/if}
			{#if lightboxIndex < images.length - 1}
				<button class="lb-btn lb-next" aria-label="Nächstes Bild" onclick={() => lightboxStep(1)}>
					<ChevronRight size={26} strokeWidth={2.25} aria-hidden="true" />
				</button>
			{/if}

			<figure class="lb-figure">
				<img src={ip.src} alt={ip.alt} />
				<figcaption class="lb-caption">
					<span class="lb-count">{lightboxIndex + 1} / {images.length}</span>
					{#if elapsed}<span class="lb-elapsed">nach {elapsed}</span>{/if}
					{#if ip.alt}<span class="lb-alt">{ip.alt}</span>{/if}
				</figcaption>
			</figure>
		</div>
	{/if}
{/if}

<style>
	.strip-section {
		margin-top: 1.25rem;
		padding-top: 0.5rem;
	}

	.strip-header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 0.6rem;
	}

	.strip-title {
		margin: 0;
		font-size: 0.95rem;
		font-weight: 600;
		letter-spacing: 0.02em;
		text-transform: uppercase;
		color: var(--color-text-secondary);
	}

	.strip-hint {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.75rem;
		color: var(--color-text-tertiary);
	}

	.strip-hint :global(svg) {
		color: var(--color-primary);
	}

	@media (max-width: 560px) {
		.strip-hint {
			display: none;
		}
	}

	.strip-frame {
		position: relative;
	}

	.strip-scroll {
		display: flex;
		gap: 0.75rem;
		overflow-x: auto;
		overflow-y: visible;
		scroll-snap-type: x mandatory;
		scroll-behavior: smooth;
		/* Vertical padding makes room for the lifted active card's shadow. */
		padding: 1rem 0.25rem 1.5rem;
		scrollbar-width: thin;
		scrollbar-color: var(--color-border) transparent;
		-webkit-overflow-scrolling: touch;
	}

	.strip-scroll:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 4px;
		border-radius: var(--radius-md);
	}

	/* The wrapper is the flex item: it carries the size, scroll-snap and the
	 * lift/scale transform. The card button and the expand button live inside
	 * it as siblings (a button can't be nested in a button). */
	.card-wrap {
		position: relative;
		flex: 0 0 auto;
		width: 232px;
		scroll-snap-align: center;
		border-radius: var(--radius-lg);
		transform: translateY(0) scale(1);
		transition: transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
	}

	.card-wrap:hover,
	.card-wrap:focus-within {
		transform: translateY(-2px) scale(1.02);
	}

	/* Active card stands out via a much heavier, tinted drop shadow rather
	 * than dimming everything else — keeps every photo legible. */
	.card-wrap.active {
		transform: translateY(-6px) scale(1.05);
	}

	.card {
		position: relative;
		display: block;
		width: 100%;
		padding: 0;
		border: 0;
		background: var(--color-surface);
		border-radius: var(--radius-lg);
		overflow: hidden;
		cursor: pointer;
		box-shadow: var(--shadow-sm);
		transition: box-shadow 220ms ease;
	}

	.card-wrap:hover .card,
	.card-wrap:focus-within .card {
		box-shadow: var(--shadow-md);
	}

	.card:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}

	.card-wrap.active .card {
		box-shadow:
			0 18px 32px -8px color-mix(in oklab, var(--color-primary) 55%, transparent),
			0 6px 14px -6px rgb(0 0 0 / 0.25);
	}

	/* Fullscreen trigger — a circular badge in the top-right of each card.
	 * Hidden until the card is hovered/focused/active (always shown on touch
	 * devices, which have no hover). */
	.expand {
		position: absolute;
		top: 0.5rem;
		right: 0.5rem;
		z-index: 3;
		display: grid;
		place-items: center;
		width: 30px;
		height: 30px;
		padding: 0;
		border: 0;
		border-radius: 50%;
		background: rgb(0 0 0 / 0.5);
		color: #fff;
		cursor: pointer;
		opacity: 0;
		transform: scale(0.85);
		backdrop-filter: blur(4px);
		-webkit-backdrop-filter: blur(4px);
		transition:
			opacity var(--transition-fast),
			transform var(--transition-fast),
			background var(--transition-fast);
	}

	.card-wrap:hover .expand,
	.card-wrap:focus-within .expand,
	.card-wrap.active .expand {
		opacity: 1;
		transform: scale(1);
	}

	.expand:hover {
		background: rgb(0 0 0 / 0.72);
		transform: scale(1.1);
	}

	.expand:focus-visible {
		outline: 2px solid #fff;
		outline-offset: 2px;
		opacity: 1;
		transform: scale(1);
	}

	@media (hover: none) {
		.expand {
			opacity: 1;
			transform: scale(1);
		}
	}

	.card img {
		display: block;
		width: 100%;
		/* 3:2 — a touch shorter than the old 4:3 so the strip sits compactly
		 * above the stats row without dominating the page. */
		aspect-ratio: 3 / 2;
		object-fit: cover;
		background: var(--color-bg-elevated);
	}

	.overlay {
		position: absolute;
		inset: auto 0 0 0;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.4rem;
		padding: 0.5rem 0.6rem;
		background: linear-gradient(to top, rgb(0 0 0 / 0.55), transparent);
		color: #fff;
		pointer-events: none;
	}

	.chip-elapsed {
		font-size: 0.78rem;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		padding: 0.2rem 0.55rem;
		border-radius: var(--radius-pill);
		background: rgb(0 0 0 / 0.45);
		backdrop-filter: blur(4px);
		-webkit-backdrop-filter: blur(4px);
		letter-spacing: 0.01em;
	}

	.chip-index {
		font-size: 0.72rem;
		opacity: 0.85;
		font-variant-numeric: tabular-nums;
	}

	.badge-private {
		position: absolute;
		top: 0.5rem;
		left: 0.5rem;
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

	.chev {
		position: absolute;
		top: 50%;
		transform: translateY(-50%);
		display: grid;
		place-items: center;
		width: 36px;
		height: 36px;
		padding: 0;
		border: 1px solid var(--color-border);
		border-radius: 50%;
		background: var(--color-surface);
		color: var(--color-text-primary);
		box-shadow: var(--shadow-md);
		cursor: pointer;
		z-index: 2;
		transition:
			transform var(--transition-fast),
			box-shadow var(--transition-fast),
			color var(--transition-fast),
			opacity var(--transition-fast);
	}

	.chev-left {
		left: -8px;
	}

	.chev-right {
		right: -8px;
	}

	.chev:hover:not(:disabled) {
		color: var(--color-primary);
		transform: translateY(-50%) scale(1.08);
		box-shadow: var(--shadow-hover);
	}

	.chev:disabled {
		opacity: 0;
		pointer-events: none;
	}

	@media (max-width: 560px) {
		.card-wrap {
			width: 180px;
		}

		.chev {
			width: 32px;
			height: 32px;
		}

		.chev-left {
			left: -4px;
		}

		.chev-right {
			right: -4px;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.card-wrap,
		.card,
		.strip-scroll,
		.chev,
		.expand {
			transition: none;
			scroll-behavior: auto;
		}
	}

	/* ── Fullscreen lightbox ─────────────────────────────────────────────── */
	.lightbox {
		position: fixed;
		inset: 0;
		z-index: 9000;
		display: grid;
		place-items: center;
		padding: 1.5rem;
		background: rgb(0 0 0 / 0.92);
	}

	.lb-backdrop {
		position: absolute;
		inset: 0;
		border: 0;
		margin: 0;
		padding: 0;
		background: transparent;
		cursor: zoom-out;
	}

	.lb-figure {
		position: relative;
		z-index: 1;
		margin: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		max-width: 92vw;
		max-height: 90vh;
	}

	.lb-figure img {
		max-width: 92vw;
		max-height: 82vh;
		object-fit: contain;
		border-radius: var(--radius-md);
		box-shadow: 0 12px 48px rgb(0 0 0 / 0.55);
	}

	.lb-caption {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		gap: 0.4rem 0.85rem;
		max-width: 92vw;
		color: rgb(255 255 255 / 0.88);
		font-size: 0.85rem;
		text-align: center;
	}

	.lb-count {
		font-variant-numeric: tabular-nums;
		font-weight: 600;
	}

	.lb-elapsed {
		color: rgb(255 255 255 / 0.7);
		font-variant-numeric: tabular-nums;
	}

	.lb-alt {
		color: rgb(255 255 255 / 0.6);
		flex-basis: 100%;
	}

	.lb-btn {
		position: absolute;
		z-index: 2;
		display: grid;
		place-items: center;
		width: 46px;
		height: 46px;
		padding: 0;
		border: 0;
		border-radius: 50%;
		background: rgb(255 255 255 / 0.12);
		color: #fff;
		cursor: pointer;
		backdrop-filter: blur(6px);
		-webkit-backdrop-filter: blur(6px);
		transition:
			background var(--transition-fast),
			transform var(--transition-fast);
	}

	.lb-btn:hover {
		background: rgb(255 255 255 / 0.24);
		transform: scale(1.08);
	}

	.lb-btn:focus-visible {
		outline: 2px solid #fff;
		outline-offset: 2px;
	}

	.lb-close {
		top: 1rem;
		right: 1rem;
	}

	.lb-prev {
		left: 1rem;
		top: 50%;
		transform: translateY(-50%);
	}

	.lb-next {
		right: 1rem;
		top: 50%;
		transform: translateY(-50%);
	}

	.lb-prev:hover,
	.lb-next:hover {
		transform: translateY(-50%) scale(1.08);
	}

	@media (max-width: 560px) {
		.lb-btn {
			width: 40px;
			height: 40px;
		}

		.lb-close {
			top: 0.6rem;
			right: 0.6rem;
		}

		.lb-prev {
			left: 0.5rem;
		}

		.lb-next {
			right: 0.5rem;
		}
	}
</style>
