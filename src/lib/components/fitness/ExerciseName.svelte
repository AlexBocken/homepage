<script>
	import { getExerciseById } from '$lib/data/exercises';

	let { exerciseId } = $props();

	const exercise = $derived(getExerciseById(exerciseId));
</script>

{#if exercise}
	<a href="/fitness/exercises/{exerciseId}" class="exercise-link">{exercise.name}</a>
{:else}
	<span class="exercise-unknown">Unknown Exercise</span>
{/if}

<style>
	.exercise-link {
		color: var(--nord8);
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
