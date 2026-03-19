<script>
	import { exercises, getFilterOptions, searchExercises } from '$lib/data/exercises';
	import { Search, X } from 'lucide-svelte';

	/**
	 * @type {{
	 *   onSelect: (exerciseId: string) => void,
	 *   onClose: () => void
	 * }}
	 */
	let { onSelect, onClose } = $props();

	let query = $state('');
	let bodyPartFilter = $state('');
	let equipmentFilter = $state('');

	const filterOptions = getFilterOptions();

	const filtered = $derived(searchExercises({
		search: query || undefined,
		bodyPart: bodyPartFilter || undefined,
		equipment: equipmentFilter || undefined
	}));

	/** @param {string} id */
	function select(id) {
		onSelect(id);
		onClose();
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="picker-overlay" onkeydown={(e) => e.key === 'Escape' && onClose()}>
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div class="picker-backdrop" onclick={onClose}></div>
	<div class="picker-panel">
		<div class="picker-header">
			<h2>Add Exercise</h2>
			<button class="close-btn" onclick={onClose} aria-label="Close">
				<X size={20} />
			</button>
		</div>

		<div class="picker-search">
			<Search size={16} />
			<input
				type="text"
				placeholder="Search exercises…"
				bind:value={query}
			/>
		</div>

		<div class="picker-filters">
			<select bind:value={bodyPartFilter}>
				<option value="">All body parts</option>
				{#each filterOptions.bodyParts as bp (bp)}
					<option value={bp}>{bp.charAt(0).toUpperCase() + bp.slice(1)}</option>
				{/each}
			</select>
			<select bind:value={equipmentFilter}>
				<option value="">All equipment</option>
				{#each filterOptions.equipment as eq (eq)}
					<option value={eq}>{eq.charAt(0).toUpperCase() + eq.slice(1)}</option>
				{/each}
			</select>
		</div>

		<ul class="exercise-list">
			{#each filtered as exercise (exercise.id)}
				<li>
					<button class="exercise-item" onclick={() => select(exercise.id)}>
						<span class="ex-name">{exercise.name}</span>
						<span class="ex-meta">{exercise.bodyPart} · {exercise.equipment}</span>
					</button>
				</li>
			{/each}
			{#if filtered.length === 0}
				<li class="no-results">No exercises found</li>
			{/if}
		</ul>
	</div>
</div>

<style>
	.picker-overlay {
		position: fixed;
		inset: 0;
		z-index: 200;
		display: flex;
		align-items: flex-end;
		justify-content: center;
	}
	.picker-backdrop {
		position: absolute;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
	}
	.picker-panel {
		position: relative;
		width: 100%;
		max-width: 500px;
		max-height: 85vh;
		background: var(--nord0, #2e3440);
		border-radius: 16px 16px 0 0;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}
	.picker-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem;
		border-bottom: 1px solid var(--nord3);
	}
	.picker-header h2 {
		margin: 0;
		font-size: 1.1rem;
	}
	.close-btn {
		background: none;
		border: none;
		color: var(--nord4);
		cursor: pointer;
		padding: 0.25rem;
	}
	.picker-search {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		border-bottom: 1px solid var(--nord3);
		color: var(--nord4);
	}
	.picker-search input {
		flex: 1;
		background: transparent;
		border: none;
		color: inherit;
		font-size: 0.9rem;
		outline: none;
	}
	.picker-search input::placeholder {
		color: var(--nord3);
	}
	.picker-filters {
		display: flex;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		border-bottom: 1px solid var(--nord3);
	}
	.picker-filters select {
		flex: 1;
		background: var(--nord1);
		color: inherit;
		border: 1px solid var(--nord3);
		border-radius: 6px;
		padding: 0.35rem 0.5rem;
		font-size: 0.8rem;
	}
	.exercise-list {
		list-style: none;
		margin: 0;
		padding: 0;
		overflow-y: auto;
		flex: 1;
	}
	.exercise-item {
		display: flex;
		flex-direction: column;
		width: 100%;
		padding: 0.75rem 1rem;
		background: none;
		border: none;
		border-bottom: 1px solid var(--nord3, rgba(0,0,0,0.05));
		color: inherit;
		text-align: left;
		cursor: pointer;
		font: inherit;
	}
	.exercise-item:hover {
		background: var(--nord1, rgba(0,0,0,0.05));
	}
	.ex-name {
		font-weight: 600;
		font-size: 0.9rem;
	}
	.ex-meta {
		font-size: 0.75rem;
		color: var(--nord4);
		text-transform: capitalize;
	}
	.no-results {
		padding: 2rem;
		text-align: center;
		color: var(--nord4);
	}

	@media (prefers-color-scheme: light) {
		:global(:root:not([data-theme])) .picker-panel {
			background: white;
		}
	}
	:global(:root[data-theme="light"]) .picker-panel {
		background: white;
	}

	@media (min-width: 600px) {
		.picker-overlay {
			align-items: center;
		}
		.picker-panel {
			border-radius: 16px;
			max-height: 70vh;
		}
	}
</style>
