<script>
	import "$lib/css/nordtheme.css";
	import TagChip from './TagChip.svelte';

	let {
		availableTags = [],
		selectedTags = [],
		onToggle = () => {},
		lang = 'de'
	} = $props();

	const isEnglish = $derived(lang === 'en');
	const label = 'Tags';
	const addTagLabel = $derived(isEnglish ? 'Type or select tag...' : 'Tag eingeben oder auswählen...');

	// Filter out already selected tags
	const unselectedTags = $derived(availableTags.filter(t => !selectedTags.includes(t)));

	let inputValue = $state('');
	let dropdownOpen = $state(false);
	let dropdownElement = null;

	// Filter tags based on input
	const filteredTags = $derived(
		inputValue.trim() === ''
			? unselectedTags
			: unselectedTags.filter(tag =>
				tag.toLowerCase().includes(inputValue.toLowerCase())
			)
	);

	function handleInputFocus() {
		dropdownOpen = true;
	}

	function handleInputBlur(event) {
		// Delay to allow click events on dropdown items
		setTimeout(() => {
			dropdownOpen = false;
			inputValue = '';
		}, 200);
	}

	function handleTagSelect(tag) {
		onToggle(tag);
		inputValue = '';
		dropdownOpen = false;
	}

	function handleKeyDown(event) {
		if (event.key === 'Enter') {
			event.preventDefault();
			const value = inputValue.trim();
			// Try to find exact match or first filtered result
			const matchedTag = availableTags.find(t => t.toLowerCase() === value.toLowerCase())
				|| filteredTags[0];
			if (matchedTag && !selectedTags.includes(matchedTag)) {
				onToggle(matchedTag);
				inputValue = '';
			}
		} else if (event.key === 'Escape') {
			dropdownOpen = false;
			inputValue = '';
		}
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

	.selected-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem;
		margin-top: 0.3rem;
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

	.dropdown:empty::after {
		content: 'No tags found';
		color: var(--nord3);
		font-size: 0.85rem;
		font-style: italic;
		padding: 0.5rem;
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
			placeholder={addTagLabel}
			autocomplete="off"
		/>

		<!-- Custom dropdown with tag chips -->
		{#if dropdownOpen && filteredTags.length > 0}
			<div class="dropdown" bind:this={dropdownElement}>
				{#each filteredTags as tag}
					<TagChip
						{tag}
						selected={false}
						removable={false}
						onToggle={() => handleTagSelect(tag)}
					/>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Selected tags display below -->
	{#if selectedTags.length > 0}
		<div class="selected-tags">
			{#each selectedTags as tag}
				<TagChip
					{tag}
					selected={true}
					removable={true}
					onToggle={onToggle}
				/>
			{/each}
		</div>
	{/if}
</div>
