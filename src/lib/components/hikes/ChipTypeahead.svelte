<script lang="ts">
	// Typeahead chip selector — a text field that opens a dropdown of matching
	// options, with the picked ones shown below as removable chips. Generic over
	// the value: used for free-text tags (with a leading "#") and for cantons
	// (with the coat-of-arms emblem rendered before the name). Themed with the
	// semantic variables so it fits the filter panel in both colour schemes.
	import type { SvelteSet } from 'svelte/reactivity';
	import X from '@lucide/svelte/icons/x';

	interface Props {
		/** All selectable values, in display order. */
		options: string[];
		/** Currently-selected values. Mutated via {@link onToggle}. */
		selected: SvelteSet<string>;
		onToggle: (value: string) => void;
		placeholder?: string;
		/** Prefix each value with a "#" (tag style). */
		hash?: boolean;
		/** Optional icon URL rendered before each value (e.g. canton emblem). */
		iconFor?: (value: string) => string | undefined;
		/** Display label for a value (defaults to the value itself). */
		labelFor?: (value: string) => string;
	}

	const {
		options,
		selected,
		onToggle,
		placeholder = 'Eingeben oder auswählen…',
		hash = false,
		iconFor,
		labelFor = (v) => v
	}: Props = $props();

	// Unique per instance — two of these live in the panel at once (tags +
	// cantons), so a shared id would be a duplicate.
	const dropdownId = `tt-dd-${Math.random().toString(36).slice(2, 9)}`;

	let inputValue = $state('');
	let open = $state(false);
	let wrapper = $state<HTMLElement>();
	let inputEl = $state<HTMLInputElement>();

	const unselected = $derived(options.filter((v) => !selected.has(v)));

	const filtered = $derived.by(() => {
		const q = inputValue.trim().toLowerCase();
		if (q === '') return unselected;
		return unselected.filter(
			(v) => labelFor(v).toLowerCase().includes(q) || v.toLowerCase().includes(q)
		);
	});

	// Selected values kept in the canonical display order rather than click order.
	const selectedList = $derived(options.filter((v) => selected.has(v)));

	function pick(value: string) {
		onToggle(value);
		inputValue = '';
		// Keep the field focused so several can be added in a row.
		inputEl?.focus();
		open = true;
	}

	function onKey(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			const q = inputValue.trim().toLowerCase();
			const match =
				filtered.find((v) => labelFor(v).toLowerCase() === q || v.toLowerCase() === q) ??
				filtered[0];
			if (match) pick(match);
		} else if (e.key === 'Escape') {
			if (inputValue) {
				inputValue = '';
			} else {
				open = false;
				inputEl?.blur();
			}
		}
	}

	// Close when focus leaves the whole widget (click-away / tab-out), but stay
	// open while moving between the input and its dropdown chips.
	function onFocusOut(e: FocusEvent) {
		const next = e.relatedTarget as Node | null;
		if (!next || !wrapper?.contains(next)) open = false;
	}
</script>

<div class="tt" bind:this={wrapper} onfocusout={onFocusOut}>
	<div class="tt-field">
		<input
			class="tt-input"
			type="text"
			bind:this={inputEl}
			bind:value={inputValue}
			onfocus={() => (open = true)}
			onkeydown={onKey}
			{placeholder}
			autocomplete="off"
			role="combobox"
			aria-expanded={open}
			aria-controls={dropdownId}
		/>

		{#if open && filtered.length > 0}
			<div class="tt-dropdown" id={dropdownId}>
				{#each filtered as value (value)}
					{@const icon = iconFor?.(value)}
					<button type="button" class="tt-option" onclick={() => pick(value)}>
						{#if icon}<img class="tt-emblem" src={icon} alt="" aria-hidden="true" />{/if}
						{#if hash}<span class="tt-hash" aria-hidden="true">#</span>{/if}
						{labelFor(value)}
					</button>
				{/each}
			</div>
		{/if}
	</div>

	{#if selectedList.length > 0}
		<div class="tt-selected">
			{#each selectedList as value (value)}
				{@const icon = iconFor?.(value)}
				<button
					type="button"
					class="tt-chip"
					onclick={() => onToggle(value)}
					aria-label={`${labelFor(value)} entfernen`}
				>
					{#if icon}<img class="tt-emblem" src={icon} alt="" aria-hidden="true" />{/if}
					{#if hash}<span class="tt-hash" aria-hidden="true">#</span>{/if}
					{labelFor(value)}
					<X size={13} strokeWidth={2} aria-hidden="true" />
				</button>
			{/each}
		</div>
	{/if}
</div>

<style>
	.tt {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.tt-field {
		position: relative;
	}

	.tt-input {
		box-sizing: border-box;
		width: 100%;
		font: inherit;
		font-size: 0.85rem;
		padding: 0.5rem 0.7rem;
		color: var(--color-text-primary);
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		transition: border-color var(--transition-fast);
	}

	.tt-input::placeholder {
		color: var(--color-text-tertiary);
	}

	.tt-input:focus-visible {
		outline: none;
		border-color: var(--color-primary);
	}

	.tt-dropdown {
		position: absolute;
		top: calc(100% + 0.3rem);
		left: 0;
		right: 0;
		z-index: 20;
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem;
		max-height: 200px;
		overflow-y: auto;
		padding: 0.5rem;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		box-shadow: var(--shadow-lg);
	}

	.tt-option {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		appearance: none;
		font: inherit;
		font-size: 0.8rem;
		padding: 0.25rem 0.7rem;
		border-radius: var(--radius-pill);
		cursor: pointer;
		color: var(--color-text-secondary);
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		transition: scale var(--transition-fast), background-color var(--transition-fast),
			color var(--transition-fast);
	}

	.tt-option:hover {
		scale: 1.05;
		background: var(--color-bg-elevated);
		color: var(--color-text-primary);
	}

	.tt-selected {
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem;
	}

	.tt-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		appearance: none;
		font: inherit;
		font-size: 0.8rem;
		padding: 0.25rem 0.5rem 0.25rem 0.7rem;
		border-radius: var(--radius-pill);
		cursor: pointer;
		color: var(--color-text-on-primary);
		background: var(--color-primary);
		border: 1px solid var(--color-primary);
		transition: scale var(--transition-fast), background-color var(--transition-fast);
	}

	.tt-chip:hover {
		scale: 1.05;
		background: var(--color-primary-hover);
		border-color: var(--color-primary-hover);
	}

	.tt-chip :global(svg) {
		opacity: 0.85;
	}

	/* Canton coat-of-arms — tall shield, kept proportional in a fixed slot. */
	.tt-emblem {
		width: 13px;
		height: 16px;
		object-fit: contain;
		flex: 0 0 auto;
		filter: drop-shadow(0 1px 1px rgb(0 0 0 / 0.18));
	}

	.tt-hash {
		opacity: 0.6;
		font-weight: 600;
	}

	.tt-chip .tt-hash {
		opacity: 0.85;
	}
</style>
