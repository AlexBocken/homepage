<script>
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { Search } from '@lucide/svelte';
	import { getFilterOptionsAll, searchAllExercises } from '$lib/data/exercisedb';
	import { translateTerm } from '$lib/data/exercises';
	import { detectFitnessLang, fitnessSlugs, t } from '$lib/js/fitnessI18n';
	import { MUSCLE_GROUPS, MUSCLE_GROUP_DE } from '$lib/data/muscleMap';
	import MuscleFilter from '$lib/components/fitness/MuscleFilter.svelte';

	const lang = $derived(detectFitnessLang($page.url.pathname));
	const isEn = $derived(lang === 'en');
	const sl = $derived(fitnessSlugs(lang));

	let { data } = $props();

	let query = $state('');
	let equipmentFilters = $state([]);
	let muscleGroups = $state([]);

	const filterOptions = getFilterOptionsAll();

	/** All selectable muscle/body-part options for the dropdown */
	const allMuscleOptions = [...MUSCLE_GROUPS];

	/** Display label for a muscle group */
	function muscleLabel(group) {
		const raw = isEn ? group : (MUSCLE_GROUP_DE[group] ?? group);
		return raw.charAt(0).toUpperCase() + raw.slice(1);
	}

	/** Options not yet selected, for the dropdown */
	const availableOptions = $derived(
		allMuscleOptions.filter(g => !muscleGroups.includes(g))
	);

	function addMuscle(group) {
		if (group && !muscleGroups.includes(group)) {
			muscleGroups = [...muscleGroups, group];
		}
	}

	function removeMuscle(group) {
		muscleGroups = muscleGroups.filter(g => g !== group);
	}

	const availableEquipment = $derived(
		filterOptions.equipment.filter(e => !equipmentFilters.includes(e))
	);

	function addEquipment(eq) {
		if (eq && !equipmentFilters.includes(eq)) {
			equipmentFilters = [...equipmentFilters, eq];
		}
	}

	function removeEquipment(eq) {
		equipmentFilters = equipmentFilters.filter(e => e !== eq);
	}

	function equipmentLabel(eq) {
		const raw = translateTerm(eq, lang);
		return raw.charAt(0).toUpperCase() + raw.slice(1);
	}

	const filtered = $derived(searchAllExercises({
		search: query || undefined,
		equipment: equipmentFilters.length ? equipmentFilters : undefined,
		muscleGroups: muscleGroups.length ? muscleGroups : undefined,
		lang
	}));
</script>

<svelte:head><title>{lang === 'en' ? 'Exercises' : 'Übungen'} - Bocken</title></svelte:head>

<div class="exercises-page">
	<!-- Desktop: split front/back absolutely positioned outside content -->
	<div class="desktop-filter">
		<MuscleFilter bind:selectedGroups={muscleGroups} {lang} split />
	</div>

	<h1>{t('exercises_title', lang)}</h1>

	<!-- Mobile: inline, not split -->
	<div class="mobile-filter">
		<MuscleFilter bind:selectedGroups={muscleGroups} {lang} />
	</div>

	<div class="search-bar">
		<Search size={16} />
		<input type="text" placeholder={t('search_exercises', lang)} bind:value={query} />
	</div>

	<div class="filters">
		<select onchange={(e) => { addMuscle(e.target.value); e.target.value = ''; }}>
			<option value="">{isEn ? 'Muscle group' : 'Muskelgruppe'}</option>
			{#each availableOptions as group}
				<option value={group}>{muscleLabel(group)}</option>
			{/each}
		</select>
		<select onchange={(e) => { addEquipment(e.target.value); e.target.value = ''; }}>
			<option value="">{t('all_equipment', lang)}</option>
			{#each availableEquipment as eq}
				<option value={eq}>{equipmentLabel(eq)}</option>
			{/each}
		</select>
	</div>

	{#if muscleGroups.length > 0 || equipmentFilters.length > 0}
		<div class="selected-pills">
			{#each muscleGroups as group}
				<button class="filter-pill muscle" onclick={() => removeMuscle(group)}>
					{muscleLabel(group)}
					<span class="pill-remove" aria-hidden="true">×</span>
				</button>
			{/each}
			{#each equipmentFilters as eq}
				<button class="filter-pill equipment" onclick={() => removeEquipment(eq)}>
					{equipmentLabel(eq)}
					<span class="pill-remove" aria-hidden="true">×</span>
				</button>
			{/each}
			<button class="clear-filters" onclick={() => { muscleGroups = []; equipmentFilters = []; }}>
				{isEn ? 'Clear all' : 'Alle löschen'}
			</button>
		</div>
	{/if}

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
		max-width: 620px;
		margin: 0 auto;
		position: relative;
	}
	h1 {
		margin: 0;
		font-size: 1.4rem;
	}

	/* Mobile: show inline filter, hide desktop split */
	.desktop-filter {
		display: none;
	}

	/* Desktop: front/back absolutely positioned outside content flow */
	@media (min-width: 1024px) {
		.mobile-filter {
			display: none;
		}

		.desktop-filter {
			display: contents;
		}

		.exercises-page :global(.split-left),
		.exercises-page :global(.split-right) {
			position: fixed;
			top: calc(8.5rem + env(safe-area-inset-top, 0px));
			width: clamp(140px, 14vw, 200px);
		}

		.exercises-page :global(.split-left) {
			right: calc(50% + 310px + 1.5rem);
		}

		.exercises-page :global(.split-right) {
			left: calc(50% + 310px + 1.5rem);
		}
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
	.selected-pills {
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem;
	}
	.filter-pill {
		all: unset;
		-webkit-tap-highlight-color: transparent;
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.25rem 0.6rem;
		border-radius: var(--radius-pill, 100px);
		color: var(--color-primary-contrast);
		font-size: 0.75rem;
		font-weight: 600;
		cursor: pointer;
		transition: filter 0.1s, transform 0.1s;
	}
	.filter-pill:hover {
		filter: brightness(1.1);
		transform: scale(1.05);
	}
	.filter-pill:active {
		transform: scale(0.95);
	}
	.filter-pill.muscle {
		background: var(--lightblue);
		color: black;
	}
	.filter-pill.equipment {
		background: var(--blue);
		color: white;
	}
	.pill-remove {
		font-size: 0.7rem;
		font-weight: bold;
		margin-left: 0.1rem;
	}
	.clear-filters {
		all: unset;
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-text-secondary);
		cursor: pointer;
		padding: 0.25rem 0.4rem;
	}
	.clear-filters:hover {
		color: var(--color-text-primary);
		text-decoration: underline;
	}

	.exercise-list {
		list-style: none;
		padding: 0;
		margin: 0;
	}
	.exercise-row {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.5rem 0;
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
		min-width: 0;
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
