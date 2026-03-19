<script>
	import { goto } from '$app/navigation';
	import { Search } from 'lucide-svelte';
	import { getFilterOptions, searchExercises } from '$lib/data/exercises';

	let { data } = $props();

	let query = $state('');
	let bodyPartFilter = $state('');
	let equipmentFilter = $state('');

	const filterOptions = getFilterOptions();

	const filtered = $derived(searchExercises({
		search: query || undefined,
		bodyPart: bodyPartFilter || undefined,
		equipment: equipmentFilter || undefined
	}));
</script>

<div class="exercises-page">
	<h1>Exercises</h1>

	<div class="search-bar">
		<Search size={16} />
		<input type="text" placeholder="Search exercises…" bind:value={query} />
	</div>

	<div class="filters">
		<select bind:value={bodyPartFilter}>
			<option value="">All body parts</option>
			{#each filterOptions.bodyParts as bp}
				<option value={bp}>{bp.charAt(0).toUpperCase() + bp.slice(1)}</option>
			{/each}
		</select>
		<select bind:value={equipmentFilter}>
			<option value="">All equipment</option>
			{#each filterOptions.equipment as eq}
				<option value={eq}>{eq.charAt(0).toUpperCase() + eq.slice(1)}</option>
			{/each}
		</select>
	</div>

	<ul class="exercise-list">
		{#each filtered as exercise (exercise.id)}
			<li>
				<a href="/fitness/exercises/{exercise.id}" class="exercise-row">
					<div class="exercise-info">
						<span class="exercise-name">{exercise.name}</span>
						<span class="exercise-meta">{exercise.bodyPart} · {exercise.equipment}</span>
					</div>
				</a>
			</li>
		{/each}
		{#if filtered.length === 0}
			<li class="no-results">No exercises match your search.</li>
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
		background: var(--accent-dark);
		border-radius: 8px;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
		color: var(--nord4);
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
		color: var(--nord3);
	}
	.filters {
		display: flex;
		gap: 0.5rem;
	}
	.filters select {
		flex: 1;
		padding: 0.4rem 0.5rem;
		background: var(--accent-dark);
		border: 1px solid var(--nord3, #ddd);
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
		border-bottom: 1px solid var(--nord3, rgba(0,0,0,0.08));
	}
	.exercise-row:hover {
		background: rgba(136, 192, 208, 0.05);
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
		color: var(--nord4);
		text-transform: capitalize;
	}
	.no-results {
		text-align: center;
		color: var(--nord4);
		padding: 2rem 0;
	}

	@media (prefers-color-scheme: light) {
		:global(:root:not([data-theme])) .search-bar,
		:global(:root:not([data-theme])) .filters select {
			background: var(--nord5);
			box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
		}
	}
	:global(:root[data-theme="light"]) .search-bar,
	:global(:root[data-theme="light"]) .filters select {
		background: var(--nord5);
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
	}
</style>
