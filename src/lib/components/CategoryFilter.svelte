<script>
	import "$lib/css/nordtheme.css";
	import TagChip from './TagChip.svelte';

	let {
		categories = [],
		selected = null,
		onChange = () => {},
		lang = 'de'
	} = $props();

	const isEnglish = $derived(lang === 'en');
	const label = $derived(isEnglish ? 'Category' : 'Kategorie');
	const selectLabel = $derived(isEnglish ? 'Select category...' : 'Kategorie auswählen...');

	let inputValue = $state('');
	let dropdownOpen = $state(false);

	// Filter categories based on input
	const filteredCategories = $derived(
		inputValue.trim() === ''
			? categories
			: categories.filter(cat =>
				cat.toLowerCase().includes(inputValue.toLowerCase())
			)
	);

	function handleInputFocus() {
		dropdownOpen = true;
	}

	function handleInputBlur() {
		setTimeout(() => {
			dropdownOpen = false;
			inputValue = '';
		}, 200);
	}

	function handleCategorySelect(category) {
		onChange(category);
		inputValue = '';
		dropdownOpen = false;
	}

	function handleKeyDown(event) {
		if (event.key === 'Enter') {
			event.preventDefault();
			const value = inputValue.trim();
			const matchedCat = categories.find(c => c.toLowerCase() === value.toLowerCase())
				|| filteredCategories[0];
			if (matchedCat) {
				onChange(matchedCat);
				inputValue = '';
			}
		} else if (event.key === 'Escape') {
			dropdownOpen = false;
			inputValue = '';
		}
	}

	function handleRemove() {
		onChange(null);
	}
</script>

<style>
	.filter-section {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		position: relative;
		max-width: 100%;
	}

	@media (max-width: 968px) {
		.filter-section {
			max-width: 500px;
			gap: 0.3rem;
			margin: 0 auto;
			width: 100%;
		}
	}

	.filter-label {
		font-size: 0.9rem;
		color: var(--nord2);
		font-weight: 600;
		margin-bottom: 0.25rem;
		text-align: center;
	}

	@media (prefers-color-scheme: dark) {
		.filter-label {
			color: var(--nord6);
		}
	}

	@media (max-width: 968px) {
		.filter-label {
			font-size: 0.85rem;
			text-align: left;
		}
	}

	.input-wrapper {
		position: relative;
	}

	input {
		all: unset;
		box-sizing: border-box;
		font-family: sans-serif;
		background: var(--nord0);
		color: var(--nord6);
		padding: 0.5rem 0.7rem;
		border-radius: 6px;
		width: 100%;
		transition: all 100ms ease;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
		font-size: 0.9rem;
	}

	@media (max-width: 968px) {
		input {
			font-size: 0.85rem;
			padding: 0.4rem 0.6rem;
		}
	}

	input::placeholder {
		color: var(--nord4);
	}

	input:hover {
		background: var(--nord2);
	}

	input:focus-visible {
		outline: 2px solid var(--nord10);
		outline-offset: 2px;
	}

	.dropdown {
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		margin-top: 0.3rem;
		background: var(--nord0);
		border-radius: 6px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
		filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.3));
		max-height: 200px;
		overflow-y: auto;
		z-index: 100;
		padding: 0.5rem;
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem;
	}

	.selected-category {
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem;
		margin-top: 0.3rem;
	}
</style>

<div class="filter-section">
	<div class="filter-label">{label}</div>

	<!-- Input with custom dropdown -->
	<div class="input-wrapper">
		<input
			type="text"
			bind:value={inputValue}
			onfocus={handleInputFocus}
			onblur={handleInputBlur}
			onkeydown={handleKeyDown}
			placeholder={selectLabel}
			autocomplete="off"
		/>

		<!-- Custom dropdown with category chips -->
		{#if dropdownOpen && filteredCategories.length > 0}
			<div class="dropdown">
				{#each filteredCategories as category}
					<TagChip
						tag={category}
						selected={false}
						removable={false}
						onToggle={() => handleCategorySelect(category)}
					/>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Selected category display below -->
	{#if selected}
		<div class="selected-category">
			<TagChip
				tag={selected}
				selected={true}
				removable={true}
				onToggle={handleRemove}
			/>
		</div>
	{/if}
</div>
