<script lang="ts">
	import { SvelteSet } from 'svelte/reactivity';
	import type { Difficulty, HikeManifestEntry } from '$types/hikes';

	export type HikesFilter = {
		maxDistanceKm: number;
		maxDurationMin: number;
		maxGainM: number;
		maxLossM: number;
		difficulties: SvelteSet<Difficulty>;
		regions: SvelteSet<string>;
	};

	interface Props {
		hikes: HikeManifestEntry[];
		filter: HikesFilter;
	}

	const DIFFICULTIES: Difficulty[] = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6'];

	const { hikes, filter }: Props = $props();

	const maxDistance = $derived(Math.max(1, ...hikes.map((h) => Math.ceil(h.distanceKm))));
	const maxDuration = $derived(Math.max(60, ...hikes.map((h) => h.durationMin ?? 0)));
	const maxGain = $derived(Math.max(100, ...hikes.map((h) => h.elevationGainM)));
	const maxLoss = $derived(Math.max(100, ...hikes.map((h) => h.elevationLossM)));

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

	function toggleDifficulty(d: Difficulty) {
		if (filter.difficulties.has(d)) filter.difficulties.delete(d);
		else filter.difficulties.add(d);
	}

	function toggleRegion(r: string) {
		if (filter.regions.has(r)) filter.regions.delete(r);
		else filter.regions.add(r);
	}

	function resetFilters() {
		filter.maxDistanceKm = maxDistance;
		filter.maxDurationMin = maxDuration;
		filter.maxGainM = maxGain;
		filter.maxLossM = maxLoss;
		filter.difficulties.clear();
		filter.regions.clear();
	}
</script>

<aside class="filter-bar">
	<div class="row">
		<label>
			<span class="label-row">
				<span>Distanz</span>
				<span class="value">≤ {filter.maxDistanceKm} km</span>
			</span>
			<input
				type="range"
				min="1"
				max={maxDistance}
				step="1"
				bind:value={filter.maxDistanceKm}
			/>
		</label>

		<label>
			<span class="label-row">
				<span>Dauer</span>
				<span class="value">≤ {Math.floor(filter.maxDurationMin / 60)}h {filter.maxDurationMin % 60}m</span>
			</span>
			<input
				type="range"
				min="0"
				max={maxDuration}
				step="15"
				bind:value={filter.maxDurationMin}
			/>
		</label>

		<label>
			<span class="label-row">
				<span>Aufstieg</span>
				<span class="value">≤ {filter.maxGainM} m</span>
			</span>
			<input
				type="range"
				min="0"
				max={maxGain}
				step="50"
				bind:value={filter.maxGainM}
			/>
		</label>

		<label>
			<span class="label-row">
				<span>Abstieg</span>
				<span class="value">≤ {filter.maxLossM} m</span>
			</span>
			<input
				type="range"
				min="0"
				max={maxLoss}
				step="50"
				bind:value={filter.maxLossM}
			/>
		</label>
	</div>

	<div class="row">
		<fieldset>
			<legend>Schwierigkeit (SAC)</legend>
			<div class="pills">
				{#each DIFFICULTIES as d (d)}
					<button
						type="button"
						class="pill"
						class:active={filter.difficulties.has(d)}
						onclick={() => toggleDifficulty(d)}
					>{d}</button>
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

		<button type="button" class="reset" onclick={resetFilters}>Zurücksetzen</button>
	</div>
</aside>

<style>
	.filter-bar {
		background: var(--color-surface);
		border-radius: var(--radius-lg);
		padding: 1rem 1.25rem;
		box-shadow: var(--shadow-sm);
	}

	.row {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: 1rem;
	}

	.row + .row {
		margin-top: 1rem;
		align-items: end;
	}

	label {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		font-size: 0.85rem;
		color: var(--color-text-secondary);
	}

	.label-row {
		display: flex;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.value {
		color: var(--color-text-primary);
		font-variant-numeric: tabular-nums;
	}

	input[type='range'] {
		width: 100%;
		accent-color: var(--color-primary);
	}

	fieldset {
		border: 0;
		padding: 0;
		margin: 0;
	}

	legend {
		display: block;
		margin-bottom: 0.4rem;
		font-size: 0.8rem;
		color: var(--color-text-secondary);
	}

	.pills {
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem;
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
		transition: scale var(--transition-fast), background-color var(--transition-fast), color var(--transition-fast);
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

	.reset {
		align-self: center;
		justify-self: end;
		appearance: none;
		background: transparent;
		border: 1px solid var(--color-border);
		color: var(--color-text-secondary);
		font: inherit;
		font-size: 0.85rem;
		padding: 0.4rem 0.9rem;
		border-radius: var(--radius-pill);
		cursor: pointer;
	}

	.reset:hover {
		background: var(--color-bg-elevated);
	}
</style>
