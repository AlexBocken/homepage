<script>
	import "$lib/css/nordtheme.css";
	import CategoryFilter from './CategoryFilter.svelte';
	import TagFilter from './TagFilter.svelte';
	import IconFilter from './IconFilter.svelte';
	import SeasonFilter from './SeasonFilter.svelte';
	import FavoritesFilter from './FavoritesFilter.svelte';

	let {
		availableCategories = [],
		availableTags = [],
		availableIcons = [],
		selectedCategory = null,
		selectedTags = [],
		selectedIcon = null,
		selectedSeasons = [],
		selectedFavoritesOnly = false,
		lang = 'de',
		isLoggedIn = false,
		onCategoryChange = () => {},
		onTagToggle = () => {},
		onIconChange = () => {},
		onSeasonChange = () => {},
		onFavoritesToggle = () => {}
	} = $props();

	const isEnglish = $derived(lang === 'en');
	const months = $derived(isEnglish
		? ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
		: ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"]
	);

	let filtersOpen = $state(false);

	function toggleFilters() {
		filtersOpen = !filtersOpen;
	}
</script>

<style>
	.filter-wrapper {
		width: 900px;
		max-width: 95vw;
		margin: 1rem auto 2rem;
	}

	.toggle-button {
		display: none;
		background: transparent;
		color: var(--nord3);
		padding: 0.5rem 0.8rem;
		border: 1px solid var(--nord2);
		border-radius: 6px;
		cursor: pointer;
		font-size: 0.85rem;
		font-weight: 500;
		transition: all 150ms ease;
		margin: 0 auto 1rem;
		max-width: 200px;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
	}

	.toggle-button:hover {
		background: var(--nord1);
		color: var(--nord4);
		border-color: var(--nord3);
	}

	.arrow {
		transition: transform 150ms ease;
		font-size: 1rem;
	}

	.arrow.open {
		transform: rotate(180deg);
	}

	.filter-panel {
		display: grid;
		gap: 2rem;
		align-items: start;
	}

	.filter-panel.with-favorites {
		grid-template-columns: 120px 120px 1fr 160px 90px;
	}

	.filter-panel.without-favorites {
		grid-template-columns: 120px 120px 1fr 160px;
	}

	@media (max-width: 968px) {
		.toggle-button {
			display: flex;
		}

		.filter-panel.with-favorites,
		.filter-panel.without-favorites {
			grid-template-columns: 1fr;
			gap: 1rem;
			max-width: 600px;
			margin: 0 auto;
			transition: all 200ms ease;
		}

		.filter-panel:not(.open) {
			display: none;
		}

		.filter-panel.open {
			display: grid;
			animation: slideDown 200ms ease;
		}
	}

	@keyframes slideDown {
		from {
			opacity: 0;
			transform: translateY(-10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>

<div class="filter-wrapper">
	<button class="toggle-button" onclick={toggleFilters} type="button">
		<span>{filtersOpen ? (isEnglish ? 'Hide Filters' : 'Filter ausblenden') : (isEnglish ? 'Show Filters' : 'Filter einblenden')}</span>
		<span class="arrow" class:open={filtersOpen}>▼</span>
	</button>

	<div class="filter-panel" class:open={filtersOpen} class:with-favorites={isLoggedIn} class:without-favorites={!isLoggedIn}>
		<CategoryFilter
			categories={availableCategories}
			selected={selectedCategory}
			onChange={onCategoryChange}
			{lang}
		/>

		<IconFilter
			{availableIcons}
			selected={selectedIcon}
			onChange={onIconChange}
			{lang}
		/>

		<TagFilter
			{availableTags}
			{selectedTags}
			onToggle={onTagToggle}
			{lang}
		/>

		<SeasonFilter
			{selectedSeasons}
			onChange={onSeasonChange}
			{lang}
			{months}
		/>

		{#if isLoggedIn}
			<FavoritesFilter
				enabled={selectedFavoritesOnly}
				onToggle={onFavoritesToggle}
				{isLoggedIn}
				{lang}
			/>
		{/if}
	</div>
</div>
