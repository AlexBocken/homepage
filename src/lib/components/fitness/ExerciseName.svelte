<script>
	import { page } from '$app/stores';
	import { getEnrichedExerciseById } from '$lib/data/exercisedb';
	import { detectFitnessLang, fitnessSlugs } from '$lib/js/fitnessI18n';

	let { exerciseId } = $props();

	const lang = $derived(detectFitnessLang($page.url.pathname));
	const exercise = $derived(getEnrichedExerciseById(exerciseId, lang));
	const sl = $derived(fitnessSlugs(lang));
</script>

{#if exercise}
	<a href="/fitness/{sl.exercises}/{exerciseId}" class="exercise-link">{exercise.localName}</a>
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
	.exercise-unknown {
		color: var(--nord11);
		font-style: italic;
	}
</style>
