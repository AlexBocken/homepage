<script>
	import TagChip from '$lib/components/recipes/TagChip.svelte';

	let {
		availableIcons = [],
		selected = null,
		onChange = () => {},
		lang = 'de',
		useAndLogic = true
	} = $props();

	const isEnglish = $derived(lang === 'en');
	const label = 'Icon';
	const selectLabel = $derived(isEnglish ? 'Select icon...' : 'Icon auswählen...');

	// Convert selected to array for OR mode, keep as single value for AND mode
	const selectedArray = $derived(
		useAndLogic
			? (selected ? [selected] : [])
			: (Array.isArray(selected) ? selected : (selected ? [selected] : []))
	);

	let inputValue = $state('');
	let dropdownOpen = $state(false);

	// Filter icons based on input (though input for emoji is uncommon)
	const filteredIcons = $derived(
		inputValue.trim() === ''
			? availableIcons
			: availableIcons.filter(icon =>
				icon.includes(inputValue.trim())
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

	function handleIconSelect(icon) {
		if (useAndLogic) {
			// AND mode: single select
			onChange(icon);
			inputValue = '';
			dropdownOpen = false;
		} else {
			// OR mode: multi-select toggle
			const currentSelected = Array.isArray(selected) ? selected : (selected ? [selected] : []);
			if (currentSelected.includes(icon)) {
				const newSelected = currentSelected.filter(i => i !== icon);
				onChange(newSelected.length > 0 ? newSelected : null);
			} else {
				onChange([...currentSelected, icon]);
			}
			inputValue = '';
		}
	}

	function handleKeyDown(event) {
		if (event.key === 'Escape') {
			dropdownOpen = false;
			inputValue = '';
		}
	}

	function handleRemove(icon) {
		if (useAndLogic) {
			onChange(null);
		} else {
			const currentSelected = Array.isArray(selected) ? selected : (selected ? [selected] : []);
			const newSelected = currentSelected.filter(i => i !== icon);
			onChange(newSelected.length > 0 ? newSelected : null);
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
    :global(:root:not([data-theme="light"])) .filter-label {
			color: var(--nord6);
		}
  }
:global(:root[data-theme="dark"]) .filter-label {
	color: var(--nord6);
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
		font-family: "Noto Color Emoji", "Noto Color Emoji Subset", emoji, sans-serif;
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

	.selected-icon {
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

		<!-- Custom dropdown with icon chips -->
		{#if dropdownOpen && filteredIcons.length > 0}
			<div class="dropdown">
				{#each filteredIcons as icon}
					<TagChip
						tag={icon}
						selected={selectedArray.includes(icon)}
						removable={false}
						onToggle={() => handleIconSelect(icon)}
					/>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Selected icons display below -->
	{#if selectedArray.length > 0}
		<div class="selected-icon">
			{#each selectedArray as icon}
				<TagChip
					tag={icon}
					selected={true}
					removable={true}
					onToggle={() => handleRemove(icon)}
				/>
			{/each}
		</div>
	{/if}
</div>
