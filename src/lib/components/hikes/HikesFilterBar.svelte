<script lang="ts">
	import { slide } from 'svelte/transition';
	import { SvelteSet } from 'svelte/reactivity';
	import SlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import X from '@lucide/svelte/icons/x';
	import RangeSlider from './RangeSlider.svelte';
	import TagTypeahead from './TagTypeahead.svelte';
	import {
		hikeFilterBounds,
		DISTANCE_STEP,
		DURATION_STEP,
		ELEVATION_STEP
	} from '$lib/hikes/filterBounds';
	import type { Difficulty, HikeManifestEntry } from '$types/hikes';

	export type HikesFilter = {
		minDistanceKm: number;
		maxDistanceKm: number;
		minDurationMin: number;
		maxDurationMin: number;
		minGainM: number;
		maxGainM: number;
		minLossM: number;
		maxLossM: number;
		difficulties: SvelteSet<Difficulty>;
		regions: SvelteSet<string>;
		tags: SvelteSet<string>;
	};

	interface Props {
		hikes: HikeManifestEntry[];
		filter: HikesFilter;
		/** Hikes passing the current filter — shown in the bar summary. */
		resultCount: number;
		/** Total hikes before filtering. */
		totalCount: number;
		/** Summed distance / ascent over the filtered subset (already rounded). */
		totalKm: number;
		totalGain: number;
	}

	const DIFFICULTIES: Difficulty[] = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6'];

	const { hikes, filter, resultCount, totalCount, totalKm, totalGain }: Props = $props();

	// Collapsed-by-default: the bar is just a summary + active-filter chips +
	// a trigger until the user opens the control panel. Keeps the listing's
	// vertical rhythm clean — the filters only take space when wanted.
	let open = $state(false);
	let root = $state<HTMLElement>();

	// Range-slider track extents, derived from the data (see filterBounds.ts —
	// the same helper seeds the page's default filter state).
	const bounds = $derived(hikeFilterBounds(hikes));

	const regions = $derived.by(() => {
		const seen: Record<string, true> = {};
		const out: string[] = [];
		for (const h of hikes) {
			if (h.region && !seen[h.region]) {
				seen[h.region] = true;
				out.push(h.region);
			}
		}
		return out.sort((a, b) => a.localeCompare(b));
	});

	// Tags sorted by usage frequency (most-used first), alphabetical for
	// ties. Frequency ordering surfaces broadly-applicable filters like
	// "winter" or "easy" at the head of the list, where they're most
	// useful for narrowing the listing.
	const tags = $derived.by(() => {
		const counts = new Map<string, number>();
		for (const h of hikes) {
			for (const t of h.tags ?? []) {
				counts.set(t, (counts.get(t) ?? 0) + 1);
			}
		}
		return [...counts.entries()]
			.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
			.map(([t]) => t);
	});

	function fmtDuration(min: number) {
		return `${Math.floor(min / 60)}h ${min % 60}m`;
	}

	// Compact chip label for a narrowed range: "≤ hi" / "≥ lo" / "lo–hi",
	// suppressing whichever end still sits at its data bound.
	function rangeLabel(
		lo: number,
		hi: number,
		b: { min: number; max: number },
		fmt: (v: number) => string,
		unit: string
	) {
		const u = unit ? ` ${unit}` : '';
		const loNarrowed = lo > b.min;
		const hiNarrowed = hi < b.max;
		if (loNarrowed && hiNarrowed) return `${fmt(lo)}–${fmt(hi)}${u}`;
		if (hiNarrowed) return `≤ ${fmt(hi)}${u}`;
		return `≥ ${fmt(lo)}${u}`;
	}

	// SAC trail-sign colour band — matches the card badges (T1 yellow
	// Wegweiser, T2/T3 red-white Bergweg, T4–T6 blue-white Alpinweg). Used
	// for the small colour dot on each difficulty toggle.
	function sacBand(d: Difficulty): 'yellow' | 'red' | 'blue' {
		if (d === 'T1') return 'yellow';
		if (d === 'T2' || d === 'T3') return 'red';
		return 'blue';
	}

	// Active filters, flattened into removable chips for the collapsed bar.
	// A range counts as "active" only when narrowed below its data ceiling.
	type Chip = { key: string; label: string; clear: () => void };
	const chips = $derived.by<Chip[]>(() => {
		const out: Chip[] = [];
		const { distance, duration, gain, loss } = bounds;
		if (filter.minDistanceKm > distance.min || filter.maxDistanceKm < distance.max)
			out.push({
				key: 'dist',
				label: rangeLabel(filter.minDistanceKm, filter.maxDistanceKm, distance, (v) => `${v}`, 'km'),
				clear: () => {
					filter.minDistanceKm = distance.min;
					filter.maxDistanceKm = distance.max;
				}
			});
		if (filter.minDurationMin > duration.min || filter.maxDurationMin < duration.max)
			out.push({
				key: 'dur',
				label: rangeLabel(filter.minDurationMin, filter.maxDurationMin, duration, fmtDuration, ''),
				clear: () => {
					filter.minDurationMin = duration.min;
					filter.maxDurationMin = duration.max;
				}
			});
		if (filter.minGainM > gain.min || filter.maxGainM < gain.max)
			out.push({
				key: 'gain',
				label: `↑ ${rangeLabel(filter.minGainM, filter.maxGainM, gain, (v) => `${v}`, 'm')}`,
				clear: () => {
					filter.minGainM = gain.min;
					filter.maxGainM = gain.max;
				}
			});
		if (filter.minLossM > loss.min || filter.maxLossM < loss.max)
			out.push({
				key: 'loss',
				label: `↓ ${rangeLabel(filter.minLossM, filter.maxLossM, loss, (v) => `${v}`, 'm')}`,
				clear: () => {
					filter.minLossM = loss.min;
					filter.maxLossM = loss.max;
				}
			});
		for (const d of DIFFICULTIES)
			if (filter.difficulties.has(d))
				out.push({ key: `d-${d}`, label: d, clear: () => filter.difficulties.delete(d) });
		for (const r of filter.regions)
			out.push({ key: `r-${r}`, label: r, clear: () => filter.regions.delete(r) });
		for (const t of filter.tags)
			out.push({ key: `t-${t}`, label: `#${t}`, clear: () => filter.tags.delete(t) });
		return out;
	});

	const activeCount = $derived(chips.length);

	function toggleDifficulty(d: Difficulty) {
		if (filter.difficulties.has(d)) filter.difficulties.delete(d);
		else filter.difficulties.add(d);
	}

	function toggleRegion(r: string) {
		if (filter.regions.has(r)) filter.regions.delete(r);
		else filter.regions.add(r);
	}

	function toggleTag(t: string) {
		if (filter.tags.has(t)) filter.tags.delete(t);
		else filter.tags.add(t);
	}

	function resetFilters() {
		filter.minDistanceKm = bounds.distance.min;
		filter.maxDistanceKm = bounds.distance.max;
		filter.minDurationMin = bounds.duration.min;
		filter.maxDurationMin = bounds.duration.max;
		filter.minGainM = bounds.gain.min;
		filter.maxGainM = bounds.gain.max;
		filter.minLossM = bounds.loss.min;
		filter.maxLossM = bounds.loss.max;
		filter.difficulties.clear();
		filter.regions.clear();
		filter.tags.clear();
	}

	// Light-dismiss: close the panel on outside click or Escape. Only wired
	// up while open so the listeners aren't carried for the whole session.
	$effect(() => {
		if (!open) return;
		const onPointer = (e: PointerEvent) => {
			if (root && !root.contains(e.target as Node)) open = false;
		};
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') open = false;
		};
		document.addEventListener('pointerdown', onPointer);
		document.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('pointerdown', onPointer);
			document.removeEventListener('keydown', onKey);
		};
	});
</script>

<div class="filter-bar" bind:this={root}>
	<p class="summary">
		<span class="count"><strong>{resultCount}</strong> von {totalCount} Touren</span>
		{#if resultCount > 0}
			<span class="dot" aria-hidden="true">·</span>
			<span class="stat">{totalKm.toLocaleString('de-CH')} km</span>
			<span class="dot" aria-hidden="true">·</span>
			<span class="stat">{totalGain.toLocaleString('de-CH')} hm</span>
		{/if}
	</p>

	{#if activeCount > 0}
		<div class="active-chips" aria-label="Aktive Filter">
			{#each chips as chip (chip.key)}
				<button type="button" class="chip" onclick={chip.clear}>
					<span class="chip-label">{chip.label}</span>
					<X size={13} strokeWidth={2} aria-label="entfernen" />
				</button>
			{/each}
			<button type="button" class="clear-all" onclick={resetFilters}>Alle löschen</button>
		</div>
	{/if}

	<button
		type="button"
		class="filter-toggle"
		class:open
		aria-expanded={open}
		aria-controls="filter-panel"
		onclick={() => (open = !open)}
	>
		<SlidersHorizontal size={16} strokeWidth={1.75} aria-hidden="true" />
		<span>Filter</span>
		{#if activeCount > 0}<span class="badge">{activeCount}</span>{/if}
		<ChevronDown class="chev" size={16} strokeWidth={1.75} aria-hidden="true" />
	</button>

	{#if open}
		<div id="filter-panel" class="panel" transition:slide={{ duration: 200 }}>
			<div class="ranges">
				<RangeSlider
					label="Distanz"
					min={bounds.distance.min}
					max={bounds.distance.max}
					step={DISTANCE_STEP}
					bind:low={filter.minDistanceKm}
					bind:high={filter.maxDistanceKm}
					format={(v) => `${v} km`}
				/>
				<RangeSlider
					label="Dauer"
					min={bounds.duration.min}
					max={bounds.duration.max}
					step={DURATION_STEP}
					bind:low={filter.minDurationMin}
					bind:high={filter.maxDurationMin}
					format={fmtDuration}
				/>
				<RangeSlider
					label="Aufstieg"
					min={bounds.gain.min}
					max={bounds.gain.max}
					step={ELEVATION_STEP}
					bind:low={filter.minGainM}
					bind:high={filter.maxGainM}
					format={(v) => `${v} m`}
				/>
				<RangeSlider
					label="Abstieg"
					min={bounds.loss.min}
					max={bounds.loss.max}
					step={ELEVATION_STEP}
					bind:low={filter.minLossM}
					bind:high={filter.maxLossM}
					format={(v) => `${v} m`}
				/>
			</div>

			<hr class="divider" />

			<fieldset>
				<legend>Schwierigkeit (SAC)</legend>
				<div class="sac-grid">
					{#each DIFFICULTIES as d (d)}
						<button
							type="button"
							class="sac-toggle"
							class:active={filter.difficulties.has(d)}
							aria-pressed={filter.difficulties.has(d)}
							aria-label="SAC-Schwierigkeit {d}"
							onclick={() => toggleDifficulty(d)}
						>
							<span class="sac-marker sac-marker-{sacBand(d)}">{d}</span>
						</button>
					{/each}
				</div>
			</fieldset>

			{#if regions.length > 0}
				<fieldset>
					<legend>Region</legend>
					<div class="pills">
						{#each regions as r (r)}
							<button
								type="button"
								class="pill"
								class:active={filter.regions.has(r)}
								onclick={() => toggleRegion(r)}
							>{r}</button>
						{/each}
					</div>
				</fieldset>
			{/if}

			{#if tags.length > 0}
				<fieldset>
					<legend>Schlagwörter</legend>
					<TagTypeahead {tags} selected={filter.tags} onToggle={toggleTag} />
				</fieldset>
			{/if}

			<div class="panel-foot">
				<button type="button" class="reset" onclick={resetFilters} disabled={activeCount === 0}>
					Zurücksetzen
				</button>
			</div>
		</div>
	{/if}
</div>

<style>
	.filter-bar {
		position: relative;
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.5rem 0.75rem;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		padding: 0.5rem 0.6rem 0.5rem 1rem;
		box-shadow: var(--shadow-sm);
	}

	.summary {
		display: inline-flex;
		align-items: baseline;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin: 0;
		flex: 0 1 auto;
		font-size: 0.9rem;
		color: var(--color-text-secondary);
	}

	.count strong {
		color: var(--color-text-primary);
		font-weight: 700;
	}

	.stat {
		font-size: 0.82rem;
		color: var(--color-text-tertiary);
		font-variant-numeric: tabular-nums;
	}

	.dot {
		color: var(--color-text-muted);
	}

	/* Active filters surfaced inline so the user always sees what's narrowing
	 * the listing without opening the panel; each chip removes its own facet. */
	.active-chips {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.35rem;
		flex: 1 1 auto;
		min-width: 0;
	}

	.chip {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		appearance: none;
		font: inherit;
		font-size: 0.78rem;
		padding: 0.18rem 0.5rem 0.18rem 0.65rem;
		border-radius: var(--radius-pill);
		cursor: pointer;
		color: var(--color-text-primary);
		background: color-mix(in srgb, var(--color-primary) 12%, var(--color-surface));
		border: 1px solid color-mix(in srgb, var(--color-primary) 32%, var(--color-border));
		transition: background-color var(--transition-fast), border-color var(--transition-fast);
	}

	.chip:hover {
		background: color-mix(in srgb, var(--color-primary) 22%, var(--color-surface));
	}

	.chip :global(svg) {
		opacity: 0.6;
		transition: opacity var(--transition-fast);
	}

	.chip:hover :global(svg) {
		opacity: 1;
	}

	.chip-label {
		font-variant-numeric: tabular-nums;
	}

	.clear-all {
		appearance: none;
		background: transparent;
		border: 0;
		font: inherit;
		font-size: 0.78rem;
		color: var(--color-text-tertiary);
		cursor: pointer;
		padding: 0.18rem 0.3rem;
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.clear-all:hover {
		color: var(--color-text-primary);
	}

	.filter-toggle {
		margin-left: auto;
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		appearance: none;
		font: inherit;
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--color-text-primary);
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		padding: 0.45rem 0.8rem;
		border-radius: var(--radius-pill);
		cursor: pointer;
		transition: background-color var(--transition-fast), border-color var(--transition-fast);
	}

	.filter-toggle:hover {
		background: var(--color-bg-elevated);
	}

	.filter-toggle.open {
		border-color: var(--color-primary);
		background: var(--color-bg-elevated);
	}

	.filter-toggle :global(.chev) {
		transition: rotate var(--transition-normal);
	}

	.filter-toggle.open :global(.chev) {
		rotate: 180deg;
	}

	.badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 1.2rem;
		height: 1.2rem;
		padding: 0 0.35rem;
		background: var(--color-primary);
		color: var(--color-text-on-primary);
		border-radius: var(--radius-pill);
		font-size: 0.72rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}

	/* Expands in-flow on its own full-width row inside the bar, so opening it
	 * pushes the card grid down (accordion) rather than overlaying it. The
	 * top border separates it from the summary row; both it and the vertical
	 * padding are animated by the `slide` transition. */
	.panel {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 1.1rem;
		margin-top: 0.6rem;
		padding-top: 1.1rem;
		border-top: 1px solid var(--color-border);
	}

	.ranges {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 1.1rem 1.75rem;
	}

	.divider {
		height: 1px;
		border: 0;
		margin: 0;
		background: var(--color-border);
	}

	fieldset {
		border: 0;
		padding: 0;
		margin: 0;
	}

	legend {
		display: block;
		margin-bottom: 0.5rem;
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-text-tertiary);
	}

	.pills {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
	}

	.pill {
		appearance: none;
		border: 1px solid var(--color-border);
		background: var(--color-bg-tertiary);
		color: var(--color-text-secondary);
		font: inherit;
		font-size: 0.8rem;
		padding: 0.25rem 0.7rem;
		border-radius: var(--radius-pill);
		cursor: pointer;
		transition: scale var(--transition-fast), background-color var(--transition-fast),
			color var(--transition-fast);
	}

	.pill:hover {
		scale: 1.05;
		background: var(--color-bg-elevated);
	}

	.pill.active {
		background: var(--color-primary);
		color: var(--color-text-on-primary);
		border-color: var(--color-primary);
	}

	/* Difficulty toggles render the actual SAC trail-sign markers (same shapes
	 * as the hike cards): T1 yellow Wegweiser arrow, T2/T3 white-red-white
	 * Bergweg, T4–T6 white-blue-white Alpinweg. No container chrome — boxing
	 * the irregular arrow looked off. Selection is the sign itself "lighting
	 * up": unselected signs are dimmed + desaturated, the selected ones snap
	 * to full colour, scale up and lift with a shadow. */
	.sac-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
	}

	.sac-toggle {
		appearance: none;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 2px;
		background: none;
		border: 0;
		border-radius: var(--radius-sm);
		cursor: pointer;
		opacity: 0.45;
		filter: grayscale(0.6);
		transition: scale var(--transition-fast), opacity var(--transition-fast),
			filter var(--transition-fast);
	}

	.sac-toggle:hover {
		opacity: 0.85;
		filter: grayscale(0.1);
		scale: 1.08;
	}

	.sac-toggle.active {
		opacity: 1;
		filter: none;
		scale: 1.08;
	}

	.sac-toggle:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}

	/* Lift only the selected signs so they read as raised above the dimmed
	 * ones. (Applied to the marker, not the toggle, so it survives the
	 * toggle's `filter: none`.) */
	.sac-toggle.active .sac-marker {
		filter: drop-shadow(0 2px 5px rgb(0 0 0 / 0.35));
	}

	.sac-marker {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		height: 26px;
		font-family: ui-monospace, 'SF Mono', Menlo, monospace;
		font-size: 0.8rem;
		font-weight: 700;
		letter-spacing: 0.02em;
		line-height: 1;
	}

	.sac-marker-yellow {
		width: 44px;
		color: #1a1a1a;
		background: #f5a623;
		clip-path: polygon(0 0, 75% 0, 100% 50%, 75% 100%, 0 100%);
		/* Text sits in the rectangular left portion (arrow tip is the right 25%). */
		justify-content: flex-start;
		padding-left: 0.55rem;
	}

	.sac-marker-red,
	.sac-marker-blue {
		width: 32px;
		color: #fff;
		text-shadow: 0 1px 1px rgb(0 0 0 / 0.45);
		border-radius: 2px;
		box-shadow: 0 0 0 1px rgb(0 0 0 / 0.18);
	}

	.sac-marker-red {
		background: linear-gradient(to bottom, #fff 0 25%, #dc1d2a 25% 75%, #fff 75% 100%);
	}

	.sac-marker-blue {
		background: linear-gradient(to bottom, #fff 0 25%, #2965c8 25% 75%, #fff 75% 100%);
	}

	.panel-foot {
		display: flex;
		justify-content: flex-end;
	}

	.reset {
		appearance: none;
		background: transparent;
		border: 1px solid var(--color-border);
		color: var(--color-text-secondary);
		font: inherit;
		font-size: 0.85rem;
		padding: 0.4rem 0.9rem;
		border-radius: var(--radius-pill);
		cursor: pointer;
		transition: background-color var(--transition-fast);
	}

	.reset:hover:not(:disabled) {
		background: var(--color-bg-elevated);
	}

	.reset:disabled {
		opacity: 0.45;
		cursor: default;
	}

	@media (max-width: 560px) {
		.ranges {
			grid-template-columns: 1fr;
		}

		/* Give the trigger its own line so the summary + chips aren't squeezed. */
		.summary {
			flex: 1 1 100%;
		}
	}
</style>
