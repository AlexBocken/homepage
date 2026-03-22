<script>
	import { page } from '$app/stores';
	import { getExerciseById } from '$lib/data/exercises';
	import { detectFitnessLang, fitnessSlugs } from '$lib/js/fitnessI18n';

	let { exerciseId } = $props();

	const exercise = $derived(getExerciseById(exerciseId));
	const sl = $derived(fitnessSlugs(detectFitnessLang($page.url.pathname)));
</script>

{#if exercise}
	<a href="/fitness/{sl.exercises}/{exerciseId}" class="exercise-link">{exercise.name}</a>
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
