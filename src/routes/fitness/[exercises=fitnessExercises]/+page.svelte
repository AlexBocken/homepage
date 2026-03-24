<script>
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { Search } from 'lucide-svelte';
	import { getFilterOptions, searchExercises, translateTerm } from '$lib/data/exercises';
	import { detectFitnessLang, fitnessSlugs, t } from '$lib/js/fitnessI18n';

	const lang = $derived(detectFitnessLang($page.url.pathname));
	const sl = $derived(fitnessSlugs(lang));

	let { data } = $props();

	let query = $state('');
	let bodyPartFilter = $state('');
	let equipmentFilter = $state('');

	const filterOptions = getFilterOptions();

	const filtered = $derived(searchExercises({
		search: query || undefined,
		bodyPart: bodyPartFilter || undefined,
		equipment: equipmentFilter || undefined,
		lang
	}));
</script>

<svelte:head><title>{lang === 'en' ? 'Exercises' : 'Übungen'} - Bocken</title></svelte:head>

<div class="exercises-page">
	<h1>{t('exercises_title', lang)}</h1>

	<div class="search-bar">
		<Search size={16} />
		<input type="text" placeholder={t('search_exercises', lang)} bind:value={query} />
	</div>

	<div class="filters">
		<select bind:value={bodyPartFilter}>
			<option value="">{t('all_body_parts', lang)}</option>
			{#each filterOptions.bodyParts as bp}
				{@const label = translateTerm(bp, lang)}<option value={bp}>{label.charAt(0).toUpperCase() + label.slice(1)}</option>
			{/each}
		</select>
		<select bind:value={equipmentFilter}>
			<option value="">{t('all_equipment', lang)}</option>
			{#each filterOptions.equipment as eq}
				{@const label = translateTerm(eq, lang)}<option value={eq}>{label.charAt(0).toUpperCase() + label.slice(1)}</option>
			{/each}
		</select>
	</div>

	<ul class="exercise-list">
		{#each filtered as exercise (exercise.id)}
			<li>
				<a href="/fitness/{sl.exercises}/{exercise.id}" class="exercise-row">
					<div class="exercise-info">
						<span class="exercise-name">{exercise.localName}</span>
						<span class="exercise-meta">{exercise.localBodyPart} · {exercise.localEquipment}</span>
					</div>
				</a>
			</li>
		{/each}
		{#if filtered.length === 0}
			<li class="no-results">{t('no_exercises_match', lang)}</li>
		{/if}
	</ul>
</div>

<style>
	.exercises-page {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
	h1 {
		margin: 0;
		font-size: 1.4rem;
	}
	.search-bar {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.6rem 0.75rem;
		background: var(--color-surface);
		border-radius: 8px;
		box-shadow: var(--shadow-sm);
		color: var(--color-text-secondary);
	}
	.search-bar input {
		flex: 1;
		background: transparent;
		border: none;
		color: inherit;
		font-size: 0.9rem;
		outline: none;
	}
	.search-bar input::placeholder {
		color: var(--color-text-muted);
	}
	.filters {
		display: flex;
		gap: 0.5rem;
	}
	.filters select {
		flex: 1;
		padding: 0.4rem 0.5rem;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 8px;
		color: inherit;
		font-size: 0.8rem;
	}
	.exercise-list {
		list-style: none;
		padding: 0;
		margin: 0;
	}
	.exercise-row {
		display: flex;
		align-items: center;
		padding: 0.75rem 0;
		text-decoration: none;
		color: inherit;
		border-bottom: 1px solid var(--color-border);
	}
	.exercise-row:hover {
		background: var(--color-surface-hover);
	}
	.exercise-info {
		display: flex;
		flex-direction: column;
	}
	.exercise-name {
		font-weight: 600;
		font-size: 0.9rem;
	}
	.exercise-meta {
		font-size: 0.75rem;
		color: var(--color-text-secondary);
		text-transform: capitalize;
	}
	.no-results {
		text-align: center;
		color: var(--color-text-secondary);
		padding: 2rem 0;
	}
</style>
