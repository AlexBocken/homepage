<script>
	import RestTimer from './RestTimer.svelte';
	import ExerciseName from './ExerciseName.svelte';
	import { page } from '$app/state';
	import { detectFitnessLang } from '$lib/js/fitnessI18n';

	/**
	 * @type {{
	 *   active: boolean,
	 *   seconds: number,
	 *   total: number,
	 *   exerciseId?: string | null,
	 *   setIdx: number,
	 *   activeExerciseIdx: number,
	 *   restExerciseIdx: number,
	 *   onAdjust?: ((delta: number) => void) | null,
	 *   onSkip?: (() => void) | null
	 * }}
	 */
	let {
		active,
		seconds,
		total,
		exerciseId = null,
		setIdx,
		activeExerciseIdx,
		restExerciseIdx,
		onAdjust = null,
		onSkip = null
	} = $props();

	const lang = $derived(detectFitnessLang(page.url.pathname));
	const isEn = $derived(lang === 'en');
	const isOtherExercise = $derived(restExerciseIdx >= 0 && restExerciseIdx !== activeExerciseIdx);
	const setLabel = $derived(setIdx >= 0
		? (isEn ? `Rest · Set ${setIdx + 1}` : `Pause · Satz ${setIdx + 1}`)
		: (isEn ? 'Rest' : 'Pause'));
</script>

{#if active && total > 0}
	<section class="active-rest" aria-live="polite">
		<header class="rest-context">
			<span class="rest-label">{setLabel}</span>
			{#if isOtherExercise && exerciseId}
				<span class="rest-sep" aria-hidden="true">·</span>
				<span class="rest-exercise"><ExerciseName {exerciseId} plain /></span>
			{/if}
		</header>
		<RestTimer
			{seconds}
			{total}
			onComplete={onSkip}
			{onAdjust}
			{onSkip}
		/>
	</section>
{/if}

<style>
	.active-rest {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}
	.rest-context {
		display: flex;
		align-items: baseline;
		gap: 0.4rem;
		flex-wrap: wrap;
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-text-tertiary);
	}
	.rest-label {
		color: var(--blue);
	}
	.rest-sep {
		color: var(--color-text-tertiary);
	}
	.rest-exercise {
		color: var(--color-text-secondary);
		text-transform: none;
		letter-spacing: 0;
		font-weight: 600;
		font-size: 0.78rem;
	}
</style>
