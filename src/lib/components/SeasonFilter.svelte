<script>
	import "$lib/css/nordtheme.css";
	import TagChip from './TagChip.svelte';

	let {
		selectedSeasons = [],
		onChange = () => {},
		lang = 'de',
		months = []
	} = $props();

	const isEnglish = $derived(lang === 'en');
	const label = $derived(isEnglish ? 'Season' : 'Saison');
	const selectLabel = $derived(isEnglish ? 'Select season...' : 'Saison auswählen...');

	let inputValue = $state('');
	let dropdownOpen = $state(false);

	// Available month options (not yet selected)
	const availableMonths = $derived(
		months.map((month, i) => ({ name: month, number: i + 1 }))
			.filter(m => !selectedSeasons.includes(m.number))
	);

	// Filter months based on input
	const filteredMonths = $derived(
		inputValue.trim() === ''
			? availableMonths
			: availableMonths.filter(m =>
				m.name.toLowerCase().includes(inputValue.toLowerCase())
			)
	);

	// Selected months for display
	const selectedMonthNames = $derived(
		selectedSeasons
			.map(num => ({ name: months[num - 1], number: num }))
			.filter(m => m.name) // Filter out invalid months
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

	function handleMonthSelect(monthNumber) {
		onChange([...selectedSeasons, monthNumber]);
		inputValue = '';
	}

	function handleMonthRemove(monthNumber) {
		onChange(selectedSeasons.filter(m => m !== monthNumber));
	}

	function handleKeyDown(event) {
		if (event.key === 'Enter') {
			event.preventDefault();
			const value = inputValue.trim();
			const matchedMonth = availableMonths.find(m =>
				m.name.toLowerCase() === value.toLowerCase()
			) || filteredMonths[0];
			if (matchedMonth) {
				handleMonthSelect(matchedMonth.number);
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
		color: var(--nord6);
		font-weight: 600;
		margin-bottom: 0.25rem;
		text-align: center;
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
		color: var(--nord3);
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

	.selected-seasons {
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

		<!-- Custom dropdown with month chips -->
		{#if dropdownOpen && filteredMonths.length > 0}
			<div class="dropdown">
				{#each filteredMonths as month}
					<TagChip
						tag={month.name}
						selected={false}
						removable={false}
						onToggle={() => handleMonthSelect(month.number)}
					/>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Selected seasons display below -->
	{#if selectedMonthNames.length > 0}
		<div class="selected-seasons">
			{#each selectedMonthNames as month}
				<TagChip
					tag={month.name}
					selected={true}
					removable={true}
					onToggle={() => handleMonthRemove(month.number)}
				/>
			{/each}
		</div>
	{/if}
</div>
