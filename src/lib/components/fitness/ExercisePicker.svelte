<script>
	import { getFilterOptionsAll, searchAllExercises } from '$lib/data/exercisedb';
	import { translateTerm } from '$lib/data/exercises';
	import Search from '@lucide/svelte/icons/search';
	import X from '@lucide/svelte/icons/x';
	import Cable from '@lucide/svelte/icons/cable';
	import Cog from '@lucide/svelte/icons/cog';
	import Dumbbell from '@lucide/svelte/icons/dumbbell';
	import PersonStanding from '@lucide/svelte/icons/person-standing';
	import Shapes from '@lucide/svelte/icons/shapes';
	import Weight from '@lucide/svelte/icons/weight';
	import { page } from '$app/stores';
	import { detectFitnessLang, t } from '$lib/js/fitnessI18n';

	const lang = $derived(detectFitnessLang($page.url.pathname));
	const isEn = $derived(lang === 'en');

	/**
	 * @type {{
	 *   onSelect: (exerciseId: string) => void,
	 *   onClose: () => void
	 * }}
	 */
	let { onSelect, onClose } = $props();

	let query = $state('');
	let bodyPartFilters = $state(/** @type {string[]} */ ([]));
	let equipmentFilters = $state(/** @type {string[]} */ ([]));

	const filterOptions = getFilterOptionsAll();

	const filtered = $derived(searchAllExercises({
		search: query || undefined,
		bodyPart: bodyPartFilters.length ? bodyPartFilters : undefined,
		equipment: equipmentFilters.length ? equipmentFilters : undefined,
		lang
	}));

	/** @param {string} term */
	function capitalize(term) {
		const raw = translateTerm(term, lang);
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

	/** @param {string} bp */
	function toggleBodyPart(bp) {
		bodyPartFilters = bodyPartFilters.includes(bp)
			? bodyPartFilters.filter(x => x !== bp)
			: [...bodyPartFilters, bp];
	}

	/** @param {string} eq */
	function toggleEquipment(eq) {
		equipmentFilters = equipmentFilters.includes(eq)
			? equipmentFilters.filter(x => x !== eq)
			: [...equipmentFilters, eq];
	}

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

		<section class="pill-group">
			<div class="pill-group-header">
				<span class="pill-group-label">{isEn ? 'Body Part' : 'Körperteil'}</span>
				{#if bodyPartFilters.length > 0}
					<button class="mini-clear" onclick={() => bodyPartFilters = []}>
						{isEn ? 'clear' : 'löschen'}
					</button>
				{/if}
			</div>
			<div class="pill-scroll">
				{#each filterOptions.bodyParts as bp (bp)}
					{@const active = bodyPartFilters.includes(bp)}
					<button
						class="chip"
						class:active
						aria-pressed={active}
						onclick={() => toggleBodyPart(bp)}
					>{capitalize(bp)}</button>
				{/each}
			</div>
		</section>

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
						<span>{capitalize(eq)}</span>
					</button>
				{/each}
			</div>
		</section>

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
	.pill-group {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		padding: 0.45rem 0 0.15rem;
		border-bottom: 1px solid var(--color-border);
	}
	.pill-group:last-of-type {
		padding-bottom: 0.5rem;
	}
	.pill-group-header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		padding-inline: 1rem;
	}
	.pill-group-label {
		font-size: 0.6rem;
		font-weight: 700;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--color-text-tertiary);
	}
	.mini-clear {
		all: unset;
		-webkit-tap-highlight-color: transparent;
		font-size: 0.6rem;
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
		padding: 0.15rem 1rem 0.35rem;
		mask-image: linear-gradient(to right, transparent 0, #000 0.6rem, #000 calc(100% - 0.6rem), transparent 100%);
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
