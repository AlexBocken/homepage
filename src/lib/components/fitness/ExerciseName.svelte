<script>
	import { resolve } from '$app/paths';
	import { page } from '$app/stores';
	import { getEnrichedExerciseById } from '$lib/data/exercisedb';
	import { detectFitnessLang, fitnessSlugs } from '$lib/js/fitnessI18n';

	let { exerciseId, plain = false } = $props();

	const lang = $derived(detectFitnessLang($page.url.pathname));
	const exercise = $derived(getEnrichedExerciseById(exerciseId, lang));
	const sl = $derived(fitnessSlugs(lang));
</script>

{#if exercise}
	{#if plain}
		<span class="exercise-plain">{exercise.localName}</span>
	{:else}
		<a href={resolve('/fitness/[exercises=fitnessExercises]/[id]', { exercises: sl.exercises, id: exerciseId })} class="exercise-link">{exercise.localName}</a>
	{/if}
{:else}
	<span class="exercise-unknown">Unknown Exercise</span>
{/if}

<style>
	.exercise-link {
		color: var(--color-primary);
		text-decoration: none;
		font-weight: 600;
	}
	.exercise-link:hover {
		text-decoration: underline;
	}
	.exercise-plain {
		color: inherit;
		font: inherit;
	}
	.exercise-unknown {
		color: var(--nord11);
		font-style: italic;
	}
</style>
