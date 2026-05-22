<script lang="ts">
	import { builder } from './builderStore.svelte';
	import { haversineKm } from '$lib/gpx';
	import { computeElevationStats, computeElevationRange } from '$lib/hikes/elevation';
	import Route from '@lucide/svelte/icons/route';
	import TrendingUp from '@lucide/svelte/icons/trending-up';
	import TrendingDown from '@lucide/svelte/icons/trending-down';
	import ArrowUpToLine from '@lucide/svelte/icons/arrow-up-to-line';
	import ArrowDownToLine from '@lucide/svelte/icons/arrow-down-to-line';

	interface Props {
		/** True while the snap-to-route / elevation-enrichment pipeline is still
		 * resolving. Stats are computed from whatever's already in the store so
		 * the user sees an evolving preview; the flag drives a subtle pulse so
		 * they know the numbers may still tick up. */
		busy?: boolean;
	}

	const { busy = false }: Props = $props();

	type Pt = { lat: number; lng: number; altitude?: number };

	// Flatten routedSegments → trkpt-shaped array. We dedupe the seam between
	// adjacent segments (each segment repeats its end as the next segment's
	// start) so distance + elevation don't double-count those vertices.
	const flatTrack = $derived.by<Pt[]>(() => {
		const out: Pt[] = [];
		let prev: Pt | null = null;
		for (const seg of builder.routedSegments) {
			for (const p of seg) {
				const point: Pt = {
					lng: p[0],
					lat: p[1],
					altitude: typeof p[2] === 'number' ? p[2] : undefined
				};
				if (
					prev &&
					prev.lat === point.lat &&
					prev.lng === point.lng &&
					prev.altitude === point.altitude
				) {
					continue;
				}
				out.push(point);
				prev = point;
			}
		}
		return out;
	});

	const distanceKm = $derived.by(() => {
		let total = 0;
		for (let i = 1; i < flatTrack.length; i++) {
			total += haversineKm(
				{ ...flatTrack[i - 1], timestamp: 0 },
				{ ...flatTrack[i], timestamp: 0 }
			);
		}
		return total;
	});

	const elevStats = $derived(computeElevationStats(flatTrack));
	const elevRange = $derived(computeElevationRange(flatTrack));
	const hasTrack = $derived(flatTrack.length >= 2);

	function fmtNum(n: number | null | undefined, suffix = ''): string {
		if (n === null || n === undefined) return '–';
		return `${n}${suffix}`;
	}
</script>

<section class="stats-bar" class:busy class:idle={!hasTrack} aria-label="Routendaten">
	<div class="metric">
		<Route size={20} strokeWidth={1.75} aria-hidden="true" />
		<span class="value">
			{hasTrack ? distanceKm.toFixed(1) : '–'}<span class="value-unit">km</span>
		</span>
		<span class="unit">Distanz</span>
	</div>
	<div class="metric">
		<TrendingUp size={20} strokeWidth={1.75} aria-hidden="true" />
		<span class="value">
			{hasTrack ? fmtNum(elevStats.gain) : '–'}<span class="value-unit">m</span>
		</span>
		<span class="unit">Aufstieg</span>
	</div>
	<div class="metric">
		<TrendingDown size={20} strokeWidth={1.75} aria-hidden="true" />
		<span class="value">
			{hasTrack ? fmtNum(elevStats.loss) : '–'}<span class="value-unit">m</span>
		</span>
		<span class="unit">Abstieg</span>
	</div>
	<div class="metric">
		<ArrowUpToLine size={20} strokeWidth={1.75} aria-hidden="true" />
		<span class="value">
			{hasTrack ? fmtNum(elevRange.max) : '–'}<span class="value-unit">m</span>
		</span>
		<span class="unit">höchster</span>
	</div>
	<div class="metric">
		<ArrowDownToLine size={20} strokeWidth={1.75} aria-hidden="true" />
		<span class="value">
			{hasTrack ? fmtNum(elevRange.min) : '–'}<span class="value-unit">m</span>
		</span>
		<span class="unit">tiefster</span>
	</div>
</section>

<style>
	.stats-bar {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.75rem 2rem;
		padding: 1rem 1.25rem;
		background: var(--color-surface);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-sm);
		color: var(--color-text-secondary);
		font-size: 0.9rem;
		transition: opacity 200ms ease;
	}

	.stats-bar.idle {
		color: var(--color-text-tertiary);
	}

	.stats-bar.busy {
		animation: stats-pulse 1.6s ease-in-out infinite;
	}

	@keyframes stats-pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.65; }
	}

	@media (prefers-reduced-motion: reduce) {
		.stats-bar.busy {
			animation: none;
		}
	}

	.metric {
		display: grid;
		grid-template-columns: auto auto;
		grid-template-rows: auto auto;
		column-gap: 0.55rem;
		row-gap: 0.05rem;
		align-items: center;
	}

	.metric :global(svg) {
		grid-row: 1 / span 2;
		color: var(--color-primary);
	}

	.stats-bar.idle .metric :global(svg) {
		color: var(--color-text-tertiary);
	}

	.value {
		font-size: 1.25rem;
		line-height: 1.1;
		color: var(--color-text-primary);
		font-variant-numeric: tabular-nums;
		font-weight: 600;
	}

	.stats-bar.idle .value {
		color: var(--color-text-tertiary);
	}

	.value-unit {
		font-size: 0.7em;
		font-weight: 500;
		color: var(--color-text-secondary);
		margin-left: 0.15em;
	}

	.unit {
		font-size: 0.75rem;
		color: var(--color-text-tertiary);
		letter-spacing: 0.02em;
	}
</style>
