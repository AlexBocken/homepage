<script>
	import { getFilterOptionsAll, searchAllExercises } from '$lib/data/exercisedb';
	import { translateTerm } from '$lib/data/exercises';
	import { Search, X } from '@lucide/svelte';
	import { page } from '$app/stores';
	import { detectFitnessLang, t } from '$lib/js/fitnessI18n';

	const lang = $derived(detectFitnessLang($page.url.pathname));

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

	const filterOptions = getFilterOptionsAll();

	const filtered = $derived(searchAllExercises({
		search: query || undefined,
		bodyPart: bodyPartFilter || undefined,
		equipment: equipmentFilter || undefined,
		lang
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
			<h2>{t('picker_title', lang)}</h2>
			<button class="close-btn" onclick={onClose} aria-label="Close">
				<X size={20} />
			</button>
		</div>

		<div class="picker-search">
			<Search size={16} />
			<input
				type="text"
				placeholder={t('search_exercises', lang)}
				bind:value={query}
			/>
		</div>

		<div class="picker-filters">
			<select bind:value={bodyPartFilter}>
				<option value="">{t('all_body_parts', lang)}</option>
				{#each filterOptions.bodyParts as bp (bp)}
					{@const label = translateTerm(bp, lang)}<option value={bp}>{label.charAt(0).toUpperCase() + label.slice(1)}</option>
				{/each}
			</select>
			<select bind:value={equipmentFilter}>
				<option value="">{t('all_equipment', lang)}</option>
				{#each filterOptions.equipment as eq (eq)}
					{@const label = translateTerm(eq, lang)}<option value={eq}>{label.charAt(0).toUpperCase() + label.slice(1)}</option>
				{/each}
			</select>
		</div>

		<ul class="exercise-list">
			{#each filtered as exercise (exercise.id)}
				<li>
					<button class="exercise-item" onclick={() => select(exercise.id)}>
						<span class="ex-name">{exercise.localName}</span>
						<span class="ex-meta">{exercise.localBodyPart} · {exercise.localEquipment}</span>
					</button>
				</li>
			{/each}
			{#if filtered.length === 0}
				<li class="no-results">{t('no_exercises_found', lang)}</li>
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
		background: var(--color-bg-secondary);
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
		border-bottom: 1px solid var(--color-border);
	}
	.picker-header h2 {
		margin: 0;
		font-size: 1.1rem;
	}
	.close-btn {
		background: none;
		border: none;
		color: var(--color-text-secondary);
		cursor: pointer;
		padding: 0.25rem;
	}
	.picker-search {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		border-bottom: 1px solid var(--color-border);
		color: var(--color-text-secondary);
	}
	.picker-search input {
		flex: 1;
		background: transparent;
		border: none;
		color: var(--color-text-primary);
		font-size: 0.9rem;
		outline: none;
	}
	.picker-search input::placeholder {
		color: var(--color-text-muted);
	}
	.picker-filters {
		display: flex;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		border-bottom: 1px solid var(--color-border);
	}
	.picker-filters select {
		flex: 1;
		background: var(--color-bg-elevated);
		color: inherit;
		border: 1px solid var(--color-border);
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
		border-bottom: 1px solid var(--color-border);
		color: inherit;
		text-align: left;
		cursor: pointer;
		font: inherit;
	}
	.exercise-item:hover {
		background: var(--color-surface-hover);
	}
	.ex-name {
		font-weight: 600;
		font-size: 0.9rem;
	}
	.ex-meta {
		font-size: 0.75rem;
		color: var(--color-text-secondary);
		text-transform: capitalize;
	}
	.no-results {
		padding: 2rem;
		text-align: center;
		color: var(--color-text-secondary);
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
