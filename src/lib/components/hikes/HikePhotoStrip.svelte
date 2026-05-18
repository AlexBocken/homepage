<script lang="ts">
	import type { HikeTrackPoint, ImagePoint } from '$types/hikes';
	import { focused, setFocused } from './focusedImageStore.svelte';
	import MapPin from '@lucide/svelte/icons/map-pin';
	import Lock from '@lucide/svelte/icons/lock';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';

	interface Props {
		images: ImagePoint[];
		track: HikeTrackPoint[];
	}

	const { images, track }: Props = $props();

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

	const cardEls: Array<HTMLButtonElement | null> = $state([]);
	let scrollEl = $state<HTMLDivElement | undefined>(undefined);

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

	function advance(direction: -1 | 1): void {
		if (images.length === 0) return;
		const current = focused.index;
		let next: number;
		if (current === null) {
			next = direction === 1 ? 0 : images.length - 1;
		} else {
			next = current + direction;
			if (next < 0 || next >= images.length) return;
		}
		setFocused(next, 'strip');
	}

	const canPrev = $derived(focused.index !== null && focused.index > 0);
	const canNext = $derived(
		focused.index === null ? images.length > 0 : focused.index < images.length - 1
	);

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
				<button
					type="button"
					class="card"
					class:active
					class:private={ip.visibility === 'private'}
					bind:this={cardEls[i]}
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

	.card {
		position: relative;
		flex: 0 0 auto;
		width: 232px;
		padding: 0;
		border: 0;
		background: var(--color-surface);
		border-radius: var(--radius-lg);
		overflow: hidden;
		cursor: pointer;
		scroll-snap-align: center;
		box-shadow: var(--shadow-sm);
		transform: translateY(0) scale(1);
		transition:
			transform 220ms cubic-bezier(0.22, 1, 0.36, 1),
			box-shadow 220ms ease;
	}

	.card:hover,
	.card:focus-visible {
		transform: translateY(-2px) scale(1.02);
		box-shadow: var(--shadow-md);
	}

	.card:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}

	/* Active card stands out via a much heavier, tinted drop shadow rather
	 * than dimming everything else — keeps every photo legible. */
	.card.active {
		transform: translateY(-6px) scale(1.05);
		box-shadow:
			0 18px 32px -8px color-mix(in oklab, var(--color-primary) 55%, transparent),
			0 6px 14px -6px rgb(0 0 0 / 0.25);
	}

	.card img {
		display: block;
		width: 100%;
		aspect-ratio: 4 / 3;
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
		.card {
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
		.card,
		.strip-scroll,
		.chev {
			transition: none;
			scroll-behavior: auto;
		}
	}
</style>
