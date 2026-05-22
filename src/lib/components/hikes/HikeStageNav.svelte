<script lang="ts">
	// Stage switcher styled as a hut-to-hut itinerary line: a leading "Alle"
	// pill, then numbered nodes joined by thin connectors. The active stage's
	// node glows in the accent and its name/distance shows alongside. Light and
	// in-flow (no boxed/blurred bar) — writes the shared stageStore.
	import type { HikeStage } from '$types/hikes';
	import { stage, setActiveStage } from './stageStore.svelte';

	interface Props {
		stages: HikeStage[];
	}

	const { stages }: Props = $props();

	const active = $derived(stage.active);
	const totalKm = $derived(stages.reduce((a, s) => a + s.distanceKm, 0));
</script>

<nav class="stepper" aria-label="Etappen">
	<button
		type="button"
		class="all"
		class:active={active === null}
		aria-pressed={active === null}
		onclick={() => setActiveStage(null)}
	>
		Alle
	</button>

	<ol class="line">
		{#each stages as s, i (i)}
			{#if i > 0}
				<li class="connector" class:lit={active === null} aria-hidden="true"></li>
			{/if}
			<li>
				<button
					type="button"
					class="node"
					class:active={active === i}
					class:lit={active === null}
					aria-pressed={active === i}
					aria-label={`Etappe ${i + 1}: ${s.name}`}
					title={s.name}
					onclick={() => setActiveStage(i)}
				>
					{i + 1}
				</button>
			</li>
		{/each}
	</ol>

	<p class="label" aria-live="polite">
		{#if active === null}
			<span class="title">Alle Etappen</span>
			<span class="dist">{totalKm.toFixed(1)} km</span>
		{:else}
			<span class="kicker">Etappe {active + 1}</span>
			<span class="title">{stages[active].name}</span>
			<span class="dist">{stages[active].distanceKm.toFixed(1)} km</span>
		{/if}
	</p>
</nav>

<style>
	.stepper {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.5rem 1rem;
		/* (a) breathing room below the full-bleed hero map; horizontal inset
		 * matches the other detail sections. */
		margin-top: 1.75rem;
		padding: 0 1rem;
	}

	.all {
		flex: 0 0 auto;
		appearance: none;
		font: inherit;
		font-size: 0.82rem;
		font-weight: 600;
		padding: 0.25rem 0.75rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-pill);
		background: transparent;
		color: var(--color-text-secondary);
		cursor: pointer;
		transition: color var(--transition-fast), background-color var(--transition-fast),
			border-color var(--transition-fast);
	}

	.all:hover {
		color: var(--color-text-primary);
		border-color: var(--color-border-hover);
	}

	.all.active {
		background: var(--color-primary);
		color: var(--color-text-on-primary);
		border-color: var(--color-primary);
	}

	.line {
		display: flex;
		align-items: center;
		gap: 0;
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.connector {
		width: 1.75rem;
		height: 2px;
		flex: 0 0 auto;
		border-radius: 2px;
		background: var(--color-border);
		transition: background-color var(--transition-fast);
	}

	.connector.lit {
		background: color-mix(in srgb, var(--color-primary) 45%, var(--color-border));
	}

	.node {
		display: grid;
		place-items: center;
		width: 1.75rem;
		height: 1.75rem;
		appearance: none;
		font: inherit;
		font-size: 0.8rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		border: 1.5px solid var(--color-border);
		border-radius: 50%;
		background: var(--color-surface);
		color: var(--color-text-secondary);
		cursor: pointer;
		transition: color var(--transition-fast), background-color var(--transition-fast),
			border-color var(--transition-fast), scale var(--transition-fast),
			box-shadow var(--transition-fast);
	}

	.node:hover {
		scale: 1.1;
		border-color: var(--color-primary);
		color: var(--color-text-primary);
	}

	/* "Alle" selected: whole line subtly lit so it reads as the full route. */
	.node.lit {
		border-color: color-mix(in srgb, var(--color-primary) 55%, var(--color-border));
		color: var(--color-text-primary);
	}

	.node.active {
		background: var(--color-primary);
		color: var(--color-text-on-primary);
		border-color: var(--color-primary);
		box-shadow: 0 0 0 4px color-mix(in srgb, var(--color-primary) 22%, transparent);
	}

	.label {
		display: inline-flex;
		align-items: baseline;
		flex-wrap: wrap;
		gap: 0.1rem 0.5rem;
		margin: 0;
		min-width: 0;
	}

	.kicker {
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-text-tertiary);
	}

	.title {
		font-size: 0.95rem;
		font-weight: 600;
		color: var(--color-text-primary);
	}

	.dist {
		font-size: 0.82rem;
		color: var(--color-text-tertiary);
		font-variant-numeric: tabular-nums;
	}
</style>
