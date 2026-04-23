<script>
	import { page } from '$app/stores';
	import { Search, Cable, Cog, Dumbbell, PersonStanding, Shapes, Weight, BicepsFlexed, Layers } from '@lucide/svelte';
	import { getFilterOptionsAll, searchAllExercises, isStretchType } from '$lib/data/exercisedb';
	import { translateTerm } from '$lib/data/exercises';
	import { detectFitnessLang, fitnessSlugs, t } from '$lib/js/fitnessI18n';
	import { MUSCLE_GROUPS, MUSCLE_GROUP_DE } from '$lib/data/muscleMap';
	import MuscleFilter from '$lib/components/fitness/MuscleFilter.svelte';

	const lang = $derived(detectFitnessLang($page.url.pathname));
	const isEn = $derived(lang === 'en');
	const sl = $derived(fitnessSlugs(lang));

	let { data } = $props();

	let query = $state('');
	/** @type {string[]} */
	let equipmentFilters = $state([]);
	/** @type {string[]} */
	let muscleGroups = $state([]);
	/** @type {'all' | 'stretch' | 'non-stretch'} */
	let typeFilter = $state('all');

	const filterOptions = getFilterOptionsAll();

	/** All selectable muscle/body-part options (anatomical order) */
	const allMuscleOptions = [...MUSCLE_GROUPS];

	/** Muscle list with selected groups hoisted to the front, preserving anatomical order within each partition */
	const orderedMuscleOptions = $derived.by(() => {
		const selected = allMuscleOptions.filter(g => muscleGroups.includes(g));
		const rest = allMuscleOptions.filter(g => !muscleGroups.includes(g));
		return [...selected, ...rest];
	});

	/**
	 * Display label for a muscle group
	 * @param {string} group
	 */
	function muscleLabel(group) {
		const raw = isEn ? group : (MUSCLE_GROUP_DE[group] ?? group);
		return raw.charAt(0).toUpperCase() + raw.slice(1);
	}

	/** @param {string} group */
	function addMuscle(group) {
		if (group && !muscleGroups.includes(group)) {
			muscleGroups = [...muscleGroups, group];
		}
	}

	/** @param {string} group */
	function removeMuscle(group) {
		muscleGroups = muscleGroups.filter(g => g !== group);
	}

	/** @param {string} eq */
	function addEquipment(eq) {
		if (eq && !equipmentFilters.includes(eq)) {
			equipmentFilters = [...equipmentFilters, eq];
		}
	}

	/** @param {string} eq */
	function removeEquipment(eq) {
		equipmentFilters = equipmentFilters.filter(e => e !== eq);
	}

	/** @param {string} eq */
	function equipmentLabel(eq) {
		const raw = translateTerm(eq, lang);
		return raw.charAt(0).toUpperCase() + raw.slice(1);
	}

	/** @param {string} eq lucide icon component for equipment type */
	function equipmentIcon(eq) {
		switch (eq) {
			case 'barbell': return Weight;
			case 'dumbbell': return Dumbbell;
			case 'body weight': return PersonStanding;
			case 'cable': return Cable;
			case 'machine': return Cog;
			default: return Shapes;
		}
	}

	/** @param {string} eq */
	function toggleEquipment(eq) {
		if (equipmentFilters.includes(eq)) removeEquipment(eq);
		else addEquipment(eq);
	}

	/** @param {string} group */
	function toggleMuscle(group) {
		if (muscleGroups.includes(group)) removeMuscle(group);
		else addMuscle(group);
	}

	const filtered = $derived(searchAllExercises({
		search: query || undefined,
		equipment: equipmentFilters.length ? equipmentFilters : undefined,
		muscleGroups: muscleGroups.length ? muscleGroups : undefined,
		stretchFilter: typeFilter === 'all' ? undefined : typeFilter,
		lang
	}));
</script>

<svelte:head><title>{lang === 'en' ? 'Exercises' : 'Übungen'} - Bocken</title></svelte:head>

<div class="exercises-page">
	<!-- Desktop: split front/back absolutely positioned outside content -->
	<div class="desktop-filter">
		<MuscleFilter bind:selectedGroups={muscleGroups} {lang} split />
	</div>

	<h1 class="sr-only">{t('exercises_title', lang)}</h1>

	<!-- Mobile: inline, not split -->
	<div class="mobile-filter">
		<MuscleFilter bind:selectedGroups={muscleGroups} {lang} />
	</div>

	<div class="search-bar">
		<Search size={16} />
		<input type="text" placeholder={t('search_exercises', lang)} bind:value={query} />
	</div>

	<div class="type-toggle" role="tablist" aria-label={isEn ? 'Exercise type filter' : 'Filter nach Übungsart'}>
		<button
			role="tab"
			aria-selected={typeFilter === 'all'}
			class="type-btn"
			class:active={typeFilter === 'all'}
			onclick={() => typeFilter = 'all'}
		>
			<Layers size={14} strokeWidth={2.2} />
			<span>{t('type_any', lang)}</span>
		</button>
		<button
			role="tab"
			aria-selected={typeFilter === 'non-stretch'}
			class="type-btn"
			class:active={typeFilter === 'non-stretch'}
			onclick={() => typeFilter = 'non-stretch'}
		>
			<BicepsFlexed size={14} strokeWidth={2.2} />
			<span>{t('type_weights', lang)}</span>
		</button>
		<button
			role="tab"
			aria-selected={typeFilter === 'stretch'}
			class="type-btn"
			class:active={typeFilter === 'stretch'}
			onclick={() => typeFilter = 'stretch'}
		>
			<PersonStanding size={14} strokeWidth={2.2} />
			<span>{t('type_stretches', lang)}</span>
		</button>
	</div>

	<section class="pill-group">
		<div class="pill-group-header">
			<span class="pill-group-label">{isEn ? 'Equipment' : 'Ausrüstung'}</span>
			{#if equipmentFilters.length > 0}
				<button class="mini-clear" onclick={() => equipmentFilters = []}>
					{isEn ? 'clear' : 'löschen'}
				</button>
			{/if}
		</div>
		<div class="pill-scroll">
			{#each filterOptions.equipment as eq (eq)}
				{@const active = equipmentFilters.includes(eq)}
				{@const Icon = equipmentIcon(eq)}
				<button
					class="chip equipment-chip"
					class:active
					aria-pressed={active}
					onclick={() => toggleEquipment(eq)}
				>
					<Icon size={14} strokeWidth={2.2} />
					<span>{equipmentLabel(eq)}</span>
				</button>
			{/each}
		</div>
	</section>

	<section class="pill-group">
		<div class="pill-group-header">
			<span class="pill-group-label">{isEn ? 'Muscle Group' : 'Muskelgruppe'}</span>
			{#if muscleGroups.length > 0}
				<button class="mini-clear" onclick={() => muscleGroups = []}>
					{isEn ? 'clear' : 'löschen'}
				</button>
			{/if}
		</div>
		<div class="pill-scroll no-left-fade">
			{#each orderedMuscleOptions as group (group)}
				{@const active = muscleGroups.includes(group)}
				<button
					class="chip muscle-chip"
					class:active
					aria-pressed={active}
					onclick={() => toggleMuscle(group)}
				>{muscleLabel(group)}</button>
			{/each}
		</div>
	</section>

	<ul class="exercise-list">
		{#each filtered as exercise (exercise.id)}
			<li>
				<a href="/fitness/{sl.exercises}/{exercise.id}" class="exercise-row">
					<div class="exercise-info">
						<span class="exercise-name">
							{exercise.localName}
							{#if isStretchType(exercise.exerciseType)}
								<span class="stretch-badge">{t('stretch_pill', lang)}</span>
							{/if}
						</span>
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
	/* Pill group filters (equipment + muscle) */
	.pill-group {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}
	.pill-group-header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		padding-inline: 0.1rem;
	}
	.pill-group-label {
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--color-text-tertiary);
	}
	.mini-clear {
		all: unset;
		-webkit-tap-highlight-color: transparent;
		font-size: 0.65rem;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-text-secondary);
		cursor: pointer;
	}
	.mini-clear:hover {
		color: var(--color-primary);
	}
	.pill-scroll {
		display: flex;
		gap: 0.4rem;
		overflow-x: auto;
		scrollbar-width: none;
		padding: 0.15rem 0.1rem 0.35rem;
		mask-image: linear-gradient(to right, transparent 0, #000 0.6rem, #000 calc(100% - 0.6rem), transparent 100%);
	}
	.pill-scroll.no-left-fade {
		mask-image: linear-gradient(to right, #000 0, #000 calc(100% - 0.6rem), transparent 100%);
	}
	.pill-scroll::-webkit-scrollbar {
		display: none;
	}
	.chip {
		all: unset;
		-webkit-tap-highlight-color: transparent;
		flex-shrink: 0;
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.35rem 0.75rem;
		border-radius: var(--radius-pill, 1000px);
		background: var(--color-bg-tertiary);
		color: var(--color-text-secondary);
		font-size: 0.78rem;
		font-weight: 600;
		letter-spacing: 0.01em;
		text-transform: capitalize;
		cursor: pointer;
		white-space: nowrap;
		border: 1px solid transparent;
		transition: background var(--transition-fast, 100ms), color var(--transition-fast, 100ms), border-color var(--transition-fast, 100ms), transform var(--transition-fast, 100ms), box-shadow var(--transition-fast, 100ms);
	}
	.chip :global(svg) {
		flex-shrink: 0;
	}
	.chip:hover {
		background: var(--color-bg-elevated);
		color: var(--color-text-primary);
		transform: scale(1.04);
	}
	.chip:active {
		transform: scale(0.96);
	}
	.chip.active {
		background: var(--color-primary);
		color: var(--color-text-on-primary);
		border-color: var(--color-primary);
		box-shadow: var(--shadow-sm);
	}
	.chip.equipment-chip :global(svg) {
		opacity: 0.85;
	}
	.chip.equipment-chip.active :global(svg) {
		opacity: 1;
	}
	.type-toggle {
		display: flex;
		gap: 0.25rem;
		background: var(--color-bg-tertiary);
		border-radius: var(--radius-pill, 100px);
		padding: 0.2rem;
	}
	.type-btn {
		all: unset;
		-webkit-tap-highlight-color: transparent;
		flex: 1;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.35rem;
		text-align: center;
		padding: 0.35rem 0.6rem;
		border-radius: var(--radius-pill, 100px);
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-text-secondary);
		cursor: pointer;
		transition: background 0.15s, color 0.15s;
	}
	.type-btn :global(svg) {
		flex-shrink: 0;
		opacity: 0.8;
	}
	.type-btn.active :global(svg) {
		opacity: 1;
	}
	.type-btn:hover {
		color: var(--color-text-primary);
	}
	.type-btn.active {
		background: var(--color-primary);
		color: var(--color-text-on-primary);
	}
	.stretch-badge {
		display: inline-block;
		vertical-align: middle;
		margin-left: 0.4rem;
		padding: 0.1rem 0.45rem;
		border-radius: var(--radius-pill, 100px);
		background: rgba(180, 142, 173, 0.2);
		color: var(--nord15);
		font-size: 0.65rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
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
