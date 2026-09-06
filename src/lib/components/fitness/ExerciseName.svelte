<script>
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { getExerciseById } from '$lib/data/exercises';
	import { exerciseName, requestExerciseName } from '$lib/fitness/exerciseNames.svelte';
	import { detectFitnessLang, fitnessSlugs } from '$lib/js/fitnessI18n';

	let { exerciseId, plain = false } = $props();

	const lang = $derived(detectFitnessLang(page.url.pathname));
	const sl = $derived(fitnessSlugs(lang));

	// The static catalogue answers synchronously (and on the server); anything
	// only ExerciseDB knows is fetched in a batch with every other name on the
	// page. Until it arrives the id itself, spaced out, stands in — readable, and
	// replaced in place rather than flashing "unknown" first.
	const staticName = $derived(getExerciseById(exerciseId, lang)?.localName);
	const fetched = $derived(staticName ? undefined : exerciseName(exerciseId, lang));
	$effect(() => {
		if (!staticName) requestExerciseName(exerciseId, lang);
	});
	const humanised = $derived(String(exerciseId ?? '').replace(/[-_]+/g, ' ').replace(/^\w/, (c) => c.toUpperCase()));
	const label = $derived(staticName ?? fetched ?? (fetched === null ? null : humanised));
</script>

{#if label !== null}
	{#if plain}
		<span class="exercise-plain">{label}</span>
	{:else}
		<a href={resolve('/fitness/[exercises=fitnessExercises]/[id]', { exercises: sl.exercises, id: exerciseId })} class="exercise-link">{label}</a>
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
		color: var(--red);
		font-style: italic;
	}
</style>
