<script>
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import ExerciseName from '$lib/components/fitness/ExerciseName.svelte';

	/** @type {{
	 *   exerciseId: string,
	 *   bodyPart?: string | null,
	 *   equipment?: string | null,
	 *   detailsHref?: string | null,
	 *   detailsLabel?: string,
	 *   exerciseIndex: number,
	 *   totalExercises: number,
	 *   sets: Array<{ completed?: boolean }>,
	 *   activeSetIdx: number,
	 *   labels: { exerciseOf: (i: number, n: number) => string, setOf: (i: number, n: number) => string, done: (n: number) => string },
	 * }} */
	let {
		exerciseId,
		bodyPart = null,
		equipment = null,
		detailsHref = null,
		detailsLabel = 'Exercise details',
		exerciseIndex,
		totalExercises,
		sets,
		activeSetIdx,
		labels
	} = $props();

	const totalSets = $derived(sets.length);
	const doneSets = $derived(sets.filter((s) => s.completed).length);
	const allDone = $derived(totalSets > 0 && doneSets === totalSets);
</script>

<section class="focus-card" aria-label="Current exercise">
	<header class="focus-eyebrow">
		<span class="focus-step">{labels.exerciseOf(exerciseIndex + 1, totalExercises)}</span>
		{#if bodyPart}
			<span class="focus-dot-sep" aria-hidden="true">·</span>
			<span class="focus-meta">{bodyPart}</span>
		{/if}
		{#if equipment}
			<span class="focus-dot-sep" aria-hidden="true">·</span>
			<span class="focus-meta">{equipment}</span>
		{/if}
	</header>

	<div class="focus-name-row">
		<h2 class="focus-name"><ExerciseName {exerciseId} plain /></h2>
		{#if detailsHref}
			<a class="focus-details" href={detailsHref} aria-label={detailsLabel} title={detailsLabel}>
				<ChevronRight size={18} strokeWidth={2.2} />
			</a>
		{/if}
	</div>

	<div class="focus-progress">
		<span class="focus-set-label" class:complete={allDone}>
			{allDone ? labels.done(totalSets) : labels.setOf(activeSetIdx + 1, totalSets)}
		</span>
		<span class="focus-dots" aria-hidden="true">
			{#each sets as s, si (si)}
				<span
					class="focus-dot"
					class:filled={s.completed}
					class:current={si === activeSetIdx && !s.completed}
				></span>
			{/each}
		</span>
	</div>
</section>

<style>
	.focus-card {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 1.1rem 1.25rem 1rem;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-card);
	}

	/* Eyebrow row: step counter + bodypart + equipment, controls on the right */
	.focus-eyebrow {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.35rem;
		font-size: 0.64rem;
		font-weight: 700;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--color-text-tertiary);
		min-height: 1.5rem;
	}
	.focus-step {
		color: var(--color-primary);
	}
	.focus-meta {
		color: var(--color-text-secondary);
	}
	.focus-dot-sep {
		color: var(--color-text-tertiary);
	}

	/* Big display name */
	.focus-name-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		min-width: 0;
	}
	.focus-name {
		flex: 1;
		margin: 0;
		font-size: 1.55rem;
		font-weight: 700;
		letter-spacing: -0.01em;
		line-height: 1.15;
		color: var(--color-text-primary);
		min-width: 0;
	}
	.focus-details {
		flex-shrink: 0;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		border-radius: 100px;
		color: var(--color-text-tertiary);
		text-decoration: none;
		transition: background 140ms, color 140ms, transform 140ms;
	}
	.focus-details:hover {
		background: var(--color-bg-elevated);
		color: var(--color-primary);
		transform: translateX(2px);
	}

	/* Set progress line */
	.focus-progress {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
	}
	.focus-set-label {
		font-size: 0.78rem;
		font-weight: 700;
		letter-spacing: 0.02em;
		color: var(--color-text-secondary);
	}
	.focus-set-label.complete {
		color: var(--nord14);
	}
	.focus-dots {
		display: inline-flex;
		gap: 6px;
	}
	.focus-dot {
		width: 9px;
		height: 9px;
		border-radius: 100px;
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		transition: background 180ms, transform 180ms, border-color 180ms;
	}
	.focus-dot.filled {
		background: var(--color-primary);
		border-color: var(--color-primary);
	}
	.focus-dot.current {
		background: color-mix(in srgb, var(--color-primary), transparent 55%);
		border-color: var(--color-primary);
		transform: scale(1.25);
		animation: focus-dot-pulse 1.4s ease-in-out infinite;
	}
	@keyframes focus-dot-pulse {
		0%, 100% { transform: scale(1.25); }
		50% { transform: scale(1.05); }
	}

	@media (max-width: 560px) {
		.focus-card {
			padding: 0.9rem 1rem 0.85rem;
		}
		.focus-name {
			font-size: 1.3rem;
		}
	}
</style>
